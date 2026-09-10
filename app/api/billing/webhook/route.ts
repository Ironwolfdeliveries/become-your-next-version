import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import { sendBillingIssueEmail, sendMembershipStatusEmail } from "@/lib/email";
import { FOUNDATION_INTRO_DAYS } from "@/lib/membership";
import { subscriptionAccess } from "@/lib/billing-access";

type SupabaseOperationError = { code?: string; message: string } | null;

function assertSupabaseSucceeded(operation: string, error: SupabaseOperationError) {
  if (!error) return;
  console.error("billing_database_operation_failed", { operation, code: error.code ?? "unknown" });
  throw new Error(`${operation} failed.`);
}

function tierFromPrice(priceId: string | null | undefined) {
  if (priceId && (priceId === process.env.STRIPE_FOUNDATION_INTRO_PRICE_ID || priceId === process.env.STRIPE_FOUNDATION_PRICE_ID)) return "foundation";
  if (priceId && priceId === process.env.STRIPE_ARCHITECT_PRICE_ID) return "architect";
  if (priceId && priceId === process.env.STRIPE_BUILDER_PRICE_ID) return "builder";
  if (priceId && priceId === process.env.STRIPE_ARCHITECT_COACHING_PRICE_ID) return "architect_coaching";
  if (priceId && priceId === process.env.STRIPE_GRADUATE_PRICE_ID) return "graduate";
  return null;
}

async function ensureFoundationSchedule(subscription: Stripe.Subscription, sourceEventId: string) {
  const introPrice = process.env.STRIPE_FOUNDATION_INTRO_PRICE_ID;
  const standardPrice = process.env.STRIPE_FOUNDATION_PRICE_ID;
  if (!introPrice || !standardPrice || !subscription.trial_end) throw new Error("Foundation launch prices or trial end are missing.");
  const stripe = getStripe();
  const schedule = subscription.schedule
    ? await stripe.subscriptionSchedules.retrieve(typeof subscription.schedule === "string" ? subscription.schedule : subscription.schedule.id)
    : await stripe.subscriptionSchedules.create(
        { from_subscription: subscription.id },
        { idempotencyKey: `bynv-foundation-create-${sourceEventId}` },
      );
  if (!schedule.current_phase) throw new Error("Foundation schedule has no current phase.");
  const updated = await stripe.subscriptionSchedules.update(schedule.id, {
    end_behavior: "release",
    proration_behavior: "none",
    phases: [
      {
        start_date: schedule.current_phase.start_date,
        end_date: subscription.trial_end,
        trial_end: subscription.trial_end,
        items: [{ price: introPrice, quantity: 1 }],
        proration_behavior: "none",
        metadata: { bynv_tier: "foundation", bynv_launch_phase: "free" },
      },
      {
        duration: { interval: "day", interval_count: FOUNDATION_INTRO_DAYS },
        items: [{ price: introPrice, quantity: 1 }],
        proration_behavior: "none",
        metadata: { bynv_tier: "foundation", bynv_launch_phase: "introductory" },
      },
      {
        items: [{ price: standardPrice, quantity: 1 }],
        proration_behavior: "none",
        metadata: { bynv_tier: "foundation", bynv_launch_phase: "standard" },
      },
    ],
  }, { idempotencyKey: `bynv-foundation-update-${sourceEventId}` });
  const discountEnd = updated.phases[1]?.end_date;
  const userId = subscription.metadata.bynv_user_id;
  if (!userId) throw new Error("Foundation subscription is not linked to a BYNV member.");
  const { error: membershipPersistenceError } = await createAdminClient().from("memberships").upsert({
    user_id: userId,
    stripe_customer_id: typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id,
    stripe_subscription_id: subscription.id,
    launch_access_started_at: new Date(subscription.start_date * 1000).toISOString(),
    launch_free_ends_at: new Date(subscription.trial_end * 1000).toISOString(),
    launch_discount_ends_at: discountEnd ? new Date(discountEnd * 1000).toISOString() : null,
  }, { onConflict: "user_id" });
  assertSupabaseSucceeded("Foundation schedule persistence", membershipPersistenceError);
}

async function syncSubscription(subscription: Stripe.Subscription) {
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const priceId = subscription.items.data[0]?.price.id ?? null;
  const itemPeriodEnd = subscription.items.data[0]?.current_period_end;
  const tier = tierFromPrice(priceId);
  if (!tier) throw new Error(`Stripe subscription ${subscription.id} uses an unrecognized BYNV price.`);
  const admin = createAdminClient();
  const { data: membership, error: membershipLookupError } = await admin.from("memberships").select("user_id").eq("stripe_customer_id", customerId).maybeSingle();
  assertSupabaseSucceeded("Subscription membership lookup", membershipLookupError);
  const userId = membership?.user_id ?? subscription.metadata.bynv_user_id;
  if (!userId) throw new Error("Stripe subscription is not linked to a BYNV member.");
  const status = subscription.status === "active" || subscription.status === "trialing" ? subscription.status : subscription.status === "past_due" ? "past_due" : subscription.status === "canceled" ? "canceled" : subscription.status === "paused" ? "paused" : "incomplete";
  const { error: membershipPersistenceError } = await admin.from("memberships").upsert({ user_id: userId, tier, status, stripe_customer_id: customerId, stripe_subscription_id: subscription.id, stripe_price_id: priceId, current_period_end: itemPeriodEnd ? new Date(itemPeriodEnd * 1000).toISOString() : null, cancel_at_period_end: subscription.cancel_at_period_end, last_payment_error: null }, { onConflict: "user_id" });
  assertSupabaseSucceeded("Subscription membership persistence", membershipPersistenceError);
  const accessLevel = subscriptionAccess(tier, status);
  const { error: entitlementPersistenceError } = await admin.from("community_entitlements").upsert({ user_id: userId, access_level: accessLevel }, { onConflict: "user_id" });
  assertSupabaseSucceeded("Subscription entitlement persistence", entitlementPersistenceError);
}

async function recordInvoiceFailure(invoice: Stripe.Invoice, sourceEventId: string, lastPaymentError: string, markPastDue: boolean) {
  const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  if (!customerId) return;
  const admin = createAdminClient();
  const { data: membership, error: membershipLookupError } = await admin.from("memberships").select("user_id").eq("stripe_customer_id", customerId).maybeSingle();
  assertSupabaseSucceeded("Invoice membership lookup", membershipLookupError);
  const update = markPastDue ? { status: "past_due", last_payment_error: lastPaymentError } : { last_payment_error: lastPaymentError };
  const { error: membershipPersistenceError } = await admin.from("memberships").update(update).eq("stripe_customer_id", customerId);
  assertSupabaseSucceeded("Invoice failure persistence", membershipPersistenceError);
  if (markPastDue && membership?.user_id) {
    const { error: entitlementError } = await admin.from("community_entitlements").upsert({ user_id: membership.user_id, access_level: "community" }, { onConflict: "user_id" });
    assertSupabaseSucceeded("Invoice failure entitlement persistence", entitlementError);
  }
  if (membership?.user_id) await sendBillingIssueEmail(membership.user_id, sourceEventId).catch((sendError) => console.error("billing_email_failed", sendError));
}

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!secret || !signature) return NextResponse.json({ error: "Webhook is not configured." }, { status: 503 });
  let event: Stripe.Event;
  try { event = getStripe().webhooks.constructEvent(await request.text(), signature, secret); }
  catch { return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 }); }
  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      if (session.metadata?.bynv_invitation_id && session.metadata?.bynv_user_id) {
        const { error: invitationPersistenceError } = await createAdminClient().from("architect_invitations").update({ status: "accepted", accepted_by: session.metadata.bynv_user_id, accepted_at: new Date().toISOString() }).eq("id", session.metadata.bynv_invitation_id).eq("status", "pending");
        assertSupabaseSucceeded("Architect invitation persistence", invitationPersistenceError);
      }
      if (session.metadata?.bynv_launch_schedule === "foundation-v1" && session.subscription) {
        const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
        await ensureFoundationSchedule(await getStripe().subscriptions.retrieve(subscriptionId), event.id);
      }
      if (session.metadata?.bynv_user_id) {
        const { error: checkoutAnalyticsError } = await createAdminClient().from("analytics_events").upsert({ event_type: "checkout_complete", source_event_id: event.id, user_id: session.metadata.bynv_user_id, route: "/api/billing/webhook", metadata: { tier: session.metadata.bynv_tier ?? "unknown" } }, { onConflict: "source_event_id", ignoreDuplicates: true });
        assertSupabaseSucceeded("Checkout analytics persistence", checkoutAnalyticsError);
        await sendMembershipStatusEmail(session.metadata.bynv_user_id, event.id, "activated").catch((sendError) => console.error("billing_activation_email_failed", sendError));
      }
    }
    if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
      // Stripe does not guarantee event ordering. Resolve current state so a
      // delayed active event cannot restore access after cancellation/failure.
      const subscription = await getStripe().subscriptions.retrieve(event.data.object.id);
      await syncSubscription(subscription);
      if (event.type === "customer.subscription.deleted") {
        const userId = subscription.metadata.bynv_user_id;
        if (userId) {
          const { error: cancellationAnalyticsError } = await createAdminClient().from("analytics_events").upsert({ event_type: "cancellation", source_event_id: event.id, user_id: userId, route: "/api/billing/webhook", metadata: { tier: subscription.metadata.bynv_tier ?? "unknown" } }, { onConflict: "source_event_id", ignoreDuplicates: true });
          assertSupabaseSucceeded("Cancellation analytics persistence", cancellationAnalyticsError);
          await sendMembershipStatusEmail(userId, event.id, "canceled").catch((sendError) => console.error("billing_cancellation_email_failed", sendError));
        }
      }
    }
    if (event.type === "invoice.payment_failed" || event.type === "invoice.finalization_failed") {
      const invoice = event.data.object;
      const finalizationFailed = event.type === "invoice.finalization_failed";
      const finalizationMessage = invoice.last_finalization_error?.code === "customer_tax_location_invalid"
        ? "Billing address could not be verified for tax calculation. Update the billing address in billing management."
        : "Billing could not finalize the latest invoice. Review billing details in billing management.";
      await recordInvoiceFailure(
        invoice,
        event.id,
        finalizationFailed ? finalizationMessage : "Payment failed. Update the payment method in billing management.",
        !finalizationFailed,
      );
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("billing_webhook_failed", event.id, error);
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
