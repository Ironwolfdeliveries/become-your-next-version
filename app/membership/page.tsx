import { MembershipPlans } from "@/components/membership-plans";
import { PageHero } from "@/components/ui";
import { hasBillingConfig, type MembershipTier } from "@/lib/membership";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "BYNV Membership", description: "Compare BYNV Foundation, Builder, Architect, Architect Coaching, and Graduate access." };
export const dynamic = "force-dynamic";

export default async function Membership({ searchParams }: { searchParams: Promise<{ billing?: string; invite?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data } = user ? await supabase.from("memberships").select("tier,status,cancel_at_period_end,stripe_customer_id,stripe_subscription_id").eq("user_id", user.id).maybeSingle() : { data: null };
  const membership = data ? { tier: data.tier as MembershipTier, status: data.status as string, cancel_at_period_end: Boolean(data.cancel_at_period_end), stripe_customer_id: data.stripe_customer_id as string | null, stripe_subscription_id: data.stripe_subscription_id as string | null } : null;
  const query = await searchParams;
  return <><PageHero eyebrow="The Architects" title="Choose the level that fits the work." copy="Begin with 30 days free, continue at the published Foundation launch rate, or choose a deeper membership when secure billing is activated." />
    <section className="container membership-shell">
      {query.billing === "success" && <p className="save-status">Checkout completed. Membership access updates after secure payment confirmation.</p>}
      {query.billing === "canceled" && <p className="save-status">Checkout was canceled. No membership change was made.</p>}
      {membership?.status === "past_due" && <p className="form-error">A membership payment needs attention. Open billing management to update the payment method.</p>}
      <MembershipPlans signedIn={Boolean(user)} membership={membership} foundationReady={hasBillingConfig("foundation")} billingReady={hasBillingConfig("builder")} architectReady={hasBillingConfig("architect")} />
      <div className="content membership-notes"><h2>Clear value. No invented promises.</h2><p>Launch Access begins with 30 free days. Days 31–90 are $19.99 per month, and Foundation is $29.99 per month beginning on day 91. Paid membership will renew monthly until canceled after billing is securely activated. Plan changes, cancellation, invoices, and payment methods will be managed through Stripe&apos;s billing portal.</p><p>Architect Coaching is separate from the $99.99 Architect membership. Human coaching, events, discounts, and capacity-dependent experiences are offered only when their delivery, scope, and terms are operational. Features described as being released or activated are not represented as available today.</p></div>
    </section></>;
}
