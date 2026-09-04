import { redirect } from "next/navigation";
import { AdminAccessEditor } from "@/components/admin-access-editor";
import { PageHero } from "@/components/ui";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAccountAccess, isPlatformAdmin, type AccountAccess } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Owner Console", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/admin");
  const actorAccess = await getAccountAccess(user.id);
  if (!isPlatformAdmin(actorAccess)) redirect("/dashboard");
  const admin = createAdminClient();
  const [{ data: authData }, profiles, memberships, accessRows, snapshots, assessments, blueprints, daily, reports, feedback, events] = await Promise.all([
    admin.auth.admin.listUsers({ page: 1, perPage: 200 }),
    admin.from("profiles").select("id,display_name,created_at"),
    admin.from("memberships").select("user_id,tier,status,stripe_customer_id,stripe_subscription_id,launch_free_ends_at,launch_discount_ends_at"),
    admin.from("account_access").select("user_id,platform_role,entitlement_tier,entitlement_status,reason"),
    admin.from("version_snapshots").select("user_id,completed_at"),
    admin.from("architect_assessments").select("user_id,status,updated_at"),
    admin.from("architect_blueprints").select("user_id,updated_at"),
    admin.from("daily_focus_entries").select("user_id,updated_at").order("updated_at", { ascending: false }),
    admin.from("community_reports").select("id,status", { count: "exact" }).in("status", ["open", "reviewing"]),
    admin.from("first_circle_feedback").select("user_id,updated_at"),
    admin.from("analytics_events").select("event_type,created_at").gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString()),
  ]);
  const profileById = new Map((profiles.data ?? []).map(row => [row.id, row]));
  const membershipById = new Map((memberships.data ?? []).map(row => [row.user_id, row]));
  const accessById = new Map((accessRows.data ?? []).map(row => [row.user_id, row as AccountAccess]));
  const snapshotUsers = new Set((snapshots.data ?? []).map(row => row.user_id));
  const assessmentById = new Map((assessments.data ?? []).map(row => [row.user_id, row]));
  const blueprintUsers = new Set((blueprints.data ?? []).map(row => row.user_id));
  const lastActivity = new Map<string, string>();
  for (const row of daily.data ?? []) if (!lastActivity.has(row.user_id)) lastActivity.set(row.user_id, row.updated_at);
  const feedbackUsers = new Set((feedback.data ?? []).map(row => row.user_id));
  const metricCounts = new Map<string, number>();
  for (const row of events.data ?? []) metricCounts.set(row.event_type, (metricCounts.get(row.event_type) ?? 0) + 1);
  return <><PageHero eyebrow="Private operations" title="Owner / Admin Console" copy="Membership authority is separate from product entitlement. Every manual access change is server-authorized and auditable." /><section className="container admin-console">
    <div className="admin-metrics"><article><strong>{authData.users.length}</strong><span>member accounts</span></article><article><strong>{metricCounts.get("page_view") ?? 0}</strong><span>page views · 30 days</span></article><article><strong>{metricCounts.get("snapshot_complete") ?? 0}</strong><span>Snapshots completed</span></article><article><strong>{reports.count ?? 0}</strong><span>open reports</span></article></div>
    <div className="admin-member-list">{authData.users.map(member => { const profile=profileById.get(member.id); const membership=membershipById.get(member.id); const access=accessById.get(member.id); const assessment=assessmentById.get(member.id); return <article className="panel admin-member" key={member.id}><header><div><p className="eyebrow">{access?.platform_role ?? "member"}</p><h2>{profile?.display_name || member.email || "Architect"}</h2><p className="muted">{member.email} · joined {new Date(member.created_at).toLocaleDateString()}</p></div><span>{access?.entitlement_tier ?? membership?.tier ?? "foundation"} · {access?.entitlement_status ?? membership?.status ?? "free"}</span></header><dl className="admin-member-status"><div><dt>Snapshot</dt><dd>{snapshotUsers.has(member.id) ? "Complete" : "Not complete"}</dd></div><div><dt>Architect Assessment</dt><dd>{assessment?.status ?? "Not started"}</dd></div><div><dt>Blueprint</dt><dd>{blueprintUsers.has(member.id) ? "Ready" : "Not ready"}</dd></div><div><dt>Last Daily OS activity</dt><dd>{lastActivity.has(member.id) ? new Date(lastActivity.get(member.id)!).toLocaleDateString() : "None"}</dd></div><div><dt>Stripe</dt><dd>{membership?.stripe_subscription_id ? membership.status : membership?.stripe_customer_id ? "Customer only" : "Not connected"}</dd></div><div><dt>Feedback</dt><dd>{feedbackUsers.has(member.id) ? "Submitted" : "Not submitted"}</dd></div></dl><AdminAccessEditor userId={member.id} role={access?.platform_role ?? "member"} tier={access?.entitlement_tier ?? null} status={access?.entitlement_status ?? "active"} ownerMode={actorAccess?.platform_role === "owner"} /></article>; })}</div>
  </section></>;
}
