import { Button, PageHero } from "@/components/ui";
import { membershipTiers, type MembershipTier } from "@/lib/membership";
import { BYNV_CONTACT_EMAIL } from "@/lib/contact";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { getAccountAccess } from "@/lib/admin";

export const metadata = { title: "Account", description: "Manage your BYNV account, security, membership, and support options.", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await requireUser("/account");
  const supabase = await createClient();
  const [{ data: profile }, { data: membership }, access] = await Promise.all([
    supabase.from("profiles").select("display_name,created_at").eq("id", user.id).maybeSingle(),
    supabase.from("memberships").select("tier,status,cancel_at_period_end,current_period_end,stripe_customer_id").eq("user_id", user.id).maybeSingle(),
    getAccountAccess(user.id),
  ]);
  const overrideActive = access?.entitlement_status === "active" && Boolean(access.entitlement_tier);
  const tier = (overrideActive ? access!.entitlement_tier : membership?.tier ?? "foundation") as MembershipTier;
  const tierName = membershipTiers[tier]?.name ?? "Foundation";
  return <>
    <PageHero eyebrow="Your account" title="Your BYNV access, in one place." copy="Review the identity, membership, security, and support details connected to your private Architect account." />
    <section className="container account-grid">
      <article className="panel"><p className="eyebrow">Account identity</p><h2>{profile?.display_name || "Architect"}</h2><dl className="account-details"><div><dt>Email</dt><dd>{user.email}</dd></div><div><dt>Member since</dt><dd>{new Date(profile?.created_at ?? user.created_at).toLocaleDateString()}</dd></div></dl><Button href="/forgot-password" secondary>Reset my password</Button></article>
      <article className="panel"><p className="eyebrow">Membership</p><h2>{tierName}</h2><dl className="account-details"><div><dt>Status</dt><dd>{overrideActive ? "active owner/admin entitlement" : membership?.status ?? "free"}</dd></div>{membership?.current_period_end && !overrideActive && <div><dt>Current period</dt><dd>Through {new Date(membership.current_period_end).toLocaleDateString()}</dd></div>}{membership?.cancel_at_period_end && !overrideActive && <div><dt>Renewal</dt><dd>Ends after the current billing period</dd></div>}</dl><Button href="/membership">Review membership</Button>{membership?.stripe_customer_id && !overrideActive && <p className="field-help">Billing management is available from the Membership page.</p>}</article>
      <article className="panel account-support"><p className="eyebrow">Privacy and support</p><h2>You remain in control of your account.</h2><p>For account access, correction, export, deletion, membership, or privacy support, contact BYNV from the email connected to this account.</p><div className="button-row"><Button href="/contact" secondary>Contact support</Button><a className="button secondary" href={`mailto:${BYNV_CONTACT_EMAIL}`}>Email BYNV</a></div></article>
    </section>
  </>;
}
