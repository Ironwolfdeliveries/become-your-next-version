import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { stripePriceForTier, type MembershipTier } from "@/lib/membership";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) return NextResponse.json({ error: "Sign in before changing membership." }, { status: 401 });
    const payload = await request.json() as { tier?: MembershipTier };
    if (payload.tier !== "foundation" && payload.tier !== "builder" && payload.tier !== "architect") return NextResponse.json({ error: "Choose a valid membership." }, { status: 400 });
    const priceId = stripePriceForTier(payload.tier);
    if (!priceId || !process.env.STRIPE_SECRET_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ error: "Paid membership is being activated and cannot accept payment yet." }, { status: 503 });
    const admin = createAdminClient();
    const stripe = getStripe();
    const { data: existing } = await admin.from("memberships").select("stripe_customer_id,stripe_subscription_id,status").eq("user_id", user.id).maybeSingle();
    if (existing?.stripe_subscription_id && (existing.status === "active" || existing.status === "trialing" || existing.status === "past_due")) {
      return NextResponse.json({ error: "Use billing management to change an existing membership." }, { status: 409 });
    }
    let customerId = existing?.stripe_customer_id as string | null;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email, metadata: { bynv_user_id: user.id } }, { idempotencyKey: `bynv-customer-${user.id}` });
      customerId = customer.id;
      await admin.from("memberships").upsert({ user_id: user.id, stripe_customer_id: customerId }, { onConflict: "user_id" });
    }
    const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
    const launchSequence = payload.tier === "foundation";
    const subscriptionData: Stripe.Checkout.SessionCreateParams.SubscriptionData = {
      metadata: {
        bynv_user_id: user.id,
        bynv_tier: payload.tier,
        ...(launchSequence ? { bynv_launch_schedule: "foundation-v1" } : {}),
      },
      ...(launchSequence ? {
        trial_period_days: 30,
        trial_settings: { end_behavior: { missing_payment_method: "cancel" } },
      } : {}),
    };
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: user.id,
      line_items: [{ price: priceId, quantity: 1 }],
      payment_method_collection: launchSequence ? "always" : "if_required",
      success_url: `${origin}/membership?billing=success`,
      cancel_url: `${origin}/membership?billing=canceled`,
      subscription_data: subscriptionData,
      metadata: {
        bynv_user_id: user.id,
        bynv_tier: payload.tier,
        ...(launchSequence ? { bynv_launch_schedule: "foundation-v1" } : {}),
      },
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("billing_checkout_failed", error);
    return NextResponse.json({ error: "Checkout could not be started. No payment was taken." }, { status: 500 });
  }
}
