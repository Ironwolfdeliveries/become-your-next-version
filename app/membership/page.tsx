import { MembershipPlans } from "@/components/membership-plans";
import { PageHero } from "@/components/ui";
import { hasBillingConfig, type MembershipTier } from "@/lib/membership";
import { createClient } from "@/lib/supabase/server";
import { getAccountAccess } from "@/lib/admin";

export const metadata = { title: "BYNV Membership", description: "Compare BYNV Foundation, Builder, Architect, Architect Coaching, and Graduate access." };
export const dynamic = "force-dynamic";

export default async function Membership({ searchParams }: { searchParams: Promise<{ billing?: string; invite?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [{ data }, access] = await Promise.all([user ? supabase.from("memberships").select("tier,status,cancel_at_period_end,stripe_customer_id,stripe_subscription_id").eq("user_id", user.id).maybeSingle() : Promise.resolve({ data: null }), user ? getAccountAccess(user.id) : Promise.resolve(null)]);
  const overrideActive = access?.entitlement_status === "active" && Boolean(access.entitlement_tier);
  const membership = overrideActive ? { tier: access!.entitlement_tier as MembershipTier, status: "active", cancel_at_period_end: false, stripe_customer_id: null, stripe_subscription_id: null } : data ? { tier: data.tier as MembershipTier, status: data.status as string, cancel_at_period_end: Boolean(data.cancel_at_period_end), stripe_customer_id: data.stripe_customer_id as string | null, stripe_subscription_id: data.stripe_subscription_id as string | null } : null;
  const query = await searchParams;
  const foundationReady = hasBillingConfig("foundation"); const builderReady = hasBillingConfig("builder"); const architectReady = hasBillingConfig("architect");
  return <><PageHero eyebrow="The Architects" title="Choose the membership that fits your goals." copy={foundationReady && builderReady && architectReady ? "Begin with 30 days free, continue with Foundation, or choose the level of support that fits where you are going." : "Create your BYNV account now. Paid membership will open after checkout setup is complete."} />
    <section className="container membership-shell">
      {query.billing === "success" && <p className="save-status">Checkout completed. Membership access updates after secure payment confirmation.</p>}
      {query.billing === "canceled" && <p className="save-status">Checkout was canceled. No membership change was made.</p>}
      {membership?.status === "past_due" && <p className="form-error">A membership payment needs attention. Open billing management to update the payment method.</p>}
      <MembershipPlans signedIn={Boolean(user)} membership={membership} foundationReady={foundationReady} billingReady={builderReady} architectReady={architectReady} />
      <div className="content membership-notes"><h2>Know what is included.</h2><p>Launch Access begins with 30 free days. Days 31–90 are $19.99 per month, and Foundation is $29.99 per month beginning on day 91. Paid membership renews monthly until canceled. You can manage plan changes, cancellation, invoices, and payment methods through Stripe&apos;s billing portal.</p><p>Architect Coaching is separate from the $99.99 Architect membership. Coaching, events, and discounts are included only when they are clearly listed as available. We will not promise a feature before it is ready.</p></div>
    </section></>;
}
