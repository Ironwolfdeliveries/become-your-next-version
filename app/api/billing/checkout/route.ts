import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { FOUNDATION_FREE_DAYS, hasBillingConfig, stripePriceForTier, type MembershipTier } from "@/lib/membership";
import { SITE_URL } from "@/lib/site";

type SupabaseOperationError = { code?: string; message: string } | null;

function assertSupabaseSucceeded(operation: string, error: SupabaseOperationError) {
  if (!error) return;
  console.error("billing_database_operation_failed", { operation, code: error.code ?? "unknown" });
  throw new Error(`${operation} failed.`);
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    assertSupabaseSucceeded("Billing authentication", authError);
    if (!user?.email) return NextResponse.json({ error: "Sign in before changing membership." }, { status: 401 });
    const payload = await request.json() as { tier?: MembershipTier };
    if (payload.tier !== "foundation" && payload.tier !== "builder" && payload.tier !== "architect") return NextResponse.json({ error: "Choose a valid membership." }, { status: 400 });
    if (!hasBillingConfig(payload.tier)) return NextResponse.json({ error: "Paid membership is not open yet." }, { status: 503 });
    const priceId = stripePriceForTier(payload.tier)!;
    const admin = createAdminClient();
    const stripe = getStripe();
    const { data: existing, error: membershipLookupError } = await admin.from("memberships").select("stripe_customer_id,stripe_subscription_id,status").eq("user_id", user.id).maybeSingle();
    assertSupabaseSucceeded("Membership lookup", membershipLookupError);
    if (existing?.stripe_subscription_id && (existing.status === "active" || existing.status === "trialing" || existing.status === "past_due")) {
      return NextResponse.json({ error: "Use billing management to change an existing membership." }, { status: 409 });
    }
    let customerId = existing?.stripe_customer_id as string | null;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email, metadata: { bynv_user_id: user.id } }, { idempotencyKey: `bynv-customer-${user.id}` });
      customerId = customer.id;
      const { error: membershipPersistenceError } = await admin.from("memberships").upsert({ user_id: user.id, stripe_customer_id: customerId }, { onConflict: "user_id" });
      assertSupabaseSucceeded("Membership customer persistence", membershipPersistenceError);
    }
    // The member row serializes reservations across tabs and tiers. A stable
    // reservation also fixes expires_at, keeping Stripe retries identical.
    const { data: reservation, error: reservationError } = await admin.rpc("reserve_billing_checkout", { p_user_id: user.id, p_tier: payload.tier });
    assertSupabaseSucceeded("Checkout reservation", reservationError);
    type CheckoutAttempt = { blocked: boolean; attempt_id?: string; tier?: string; expires_at?: number } | null;
    let attempt = reservation as CheckoutAttempt;
    if (!attempt || attempt.blocked) return NextResponse.json({ error: "Use billing management for your existing subscription." }, { status: 409 });
    if (!attempt.attempt_id || !attempt.expires_at) throw new Error("Checkout reservation is incomplete.");
    // Check Stripe too: a completed Checkout can precede its membership webhook.
    const subscriptions = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 100 });
    if (subscriptions.data.some((subscription) => subscription.status !== "canceled" && subscription.status !== "incomplete_expired")) {
      return NextResponse.json({ error: "Your subscription is being synchronized. Use billing management once it appears." }, { status: 409 });
    }
    const sessions = await stripe.checkout.sessions.list({ customer: customerId, limit: 100 });
    const openSession = sessions.data.find((session) => session.mode === "subscription" && session.status === "open");
    if (openSession) {
      if (openSession.metadata?.bynv_tier === payload.tier && openSession.url) return NextResponse.json({ url: openSession.url });
      return NextResponse.json({ error: "Another membership checkout is already open." }, { status: 409 });
    }
    const closedAttempt = sessions.data.find((session) => session.mode === "subscription" && session.status !== "open" && (
      session.metadata?.bynv_checkout_attempt_id === attempt?.attempt_id ||
      (!session.metadata?.bynv_checkout_attempt_id && session.client_reference_id === user.id && session.expires_at === attempt?.expires_at)
    ));
    if (closedAttempt) {
      // Checkout can complete between the subscription and session lookups.
      // Resolve that subscription before allowing another purchase.
      if (closedAttempt.subscription) {
        const subscriptionId = typeof closedAttempt.subscription === "string" ? closedAttempt.subscription : closedAttempt.subscription.id;
        const completedSubscription = await stripe.subscriptions.retrieve(subscriptionId);
        if (completedSubscription.status !== "canceled" && completedSubscription.status !== "incomplete_expired") {
          return NextResponse.json({ error: "Your subscription is being synchronized. Use billing management once it appears." }, { status: 409 });
        }
      }
      // Retire only this confirmed closed attempt. Concurrent requests then
      // share the next reservation instead of reusing a completed Stripe key.
      const { error: expirationError } = await admin.from("billing_checkout_attempts").update({ expires_at: 0 }).eq("user_id", user.id).eq("attempt_id", attempt.attempt_id);
      assertSupabaseSucceeded("Completed checkout reservation expiration", expirationError);
      const { data: replacement, error: replacementError } = await admin.rpc("reserve_billing_checkout", { p_user_id: user.id, p_tier: payload.tier });
      assertSupabaseSucceeded("Replacement checkout reservation", replacementError);
      attempt = replacement as CheckoutAttempt;
      if (!attempt || attempt.blocked) return NextResponse.json({ error: "Use billing management for your existing subscription." }, { status: 409 });
    }
    if (attempt.tier !== payload.tier) return NextResponse.json({ error: "A checkout for another membership is already open. Complete that checkout or wait for it to expire before choosing another plan." }, { status: 409 });
    if (!attempt.attempt_id || !attempt.expires_at) throw new Error("Checkout reservation is incomplete.");
    const origin = SITE_URL;
    const launchSequence = payload.tier === "foundation";
    const subscriptionData: Stripe.Checkout.SessionCreateParams.SubscriptionData = {
      metadata: {
        bynv_user_id: user.id,
        bynv_tier: payload.tier,
        ...(launchSequence ? { bynv_launch_schedule: "foundation-v1" } : {}),
      },
      ...(launchSequence ? {
        trial_period_days: FOUNDATION_FREE_DAYS,
        trial_settings: { end_behavior: { missing_payment_method: "cancel" } },
      } : {}),
    };
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      expires_at: attempt.expires_at,
      integration_identifier: "bynv_launch_bynvgoab",
      customer: customerId,
      billing_address_collection: "required",
      customer_update: { address: "auto" },
      client_reference_id: user.id,
      line_items: [{ price: priceId, quantity: 1 }],
      automatic_tax: { enabled: true },
      payment_method_collection: launchSequence ? "always" : "if_required",
      ...(launchSequence ? {
        custom_text: {
          submit: { message: "30 days free, then $19.99/month for exactly 60 days. From day 91: $29.99/month until canceled. Applicable tax is added separately. Unused introductory time is credited when standard billing begins." },
        },
      } : {}),
      success_url: `${origin}/membership?billing=success`,
      cancel_url: `${origin}/membership?billing=canceled`,
      subscription_data: subscriptionData,
      metadata: {
        bynv_user_id: user.id,
        bynv_tier: payload.tier,
        bynv_checkout_attempt_id: attempt.attempt_id,
        ...(launchSequence ? { bynv_launch_schedule: "foundation-v1" } : {}),
      },
    }, { idempotencyKey: `bynv-checkout-${attempt.attempt_id}` });
    if (session.status !== "open" || !session.url) throw new Error("Stripe did not return an open Checkout session.");
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("billing_checkout_failed", error);
    return NextResponse.json({ error: "Checkout could not be started. No payment was taken." }, { status: 500 });
  }
}
