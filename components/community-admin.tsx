"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Report = { id: string; target_type: "post" | "comment" | "profile"; target_id: string; reason: string; status: string; created_at: string; reporter_user_id: string };
type Entitlement = { user_id: string; access_level: "community" | "priority" | "mastermind"; first_circle: boolean; community_role: "member" | "moderator" | "admin" };

export function CommunityAdmin({ role, moderatorId }: { role: "moderator" | "admin"; moderatorId: string }) {
  const [reports, setReports] = useState<Report[]>([]);
  const [entitlements, setEntitlements] = useState<Entitlement[]>([]);
  const [restrictedUsers, setRestrictedUsers] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("Loading moderation queue…");
  const load = useCallback(async () => {
    const supabase = createClient();
    const [{ data: reportData, error }, { data: entitlementData }, { data: restrictionData }] = await Promise.all([
      supabase.from("community_reports").select("id,target_type,target_id,reason,status,created_at,reporter_user_id").in("status", ["open", "reviewing"]).order("created_at"),
      role === "admin" ? supabase.from("community_entitlements").select("user_id,access_level,first_circle,community_role").order("updated_at", { ascending: false }).limit(200) : Promise.resolve({ data: [] }),
      role === "admin" ? supabase.from("community_member_restrictions").select("user_id,restricted_until") : Promise.resolve({ data: [] }),
    ]);
    setReports((reportData ?? []) as Report[]); setEntitlements((entitlementData ?? []) as Entitlement[]); setRestrictedUsers(new Set((restrictionData ?? []).filter((item) => !item.restricted_until || new Date(item.restricted_until) > new Date()).map((item) => item.user_id))); setMessage(error ? "The moderation queue could not be loaded." : "");
  }, [role]);
  useEffect(() => { void load(); }, [load]);

  async function moderate(report: Report, action: "hide" | "restore" | "dismiss") {
    const supabase = createClient(); setMessage("Saving moderation action…");
    if (action !== "dismiss") {
      const table = report.target_type === "post" ? "community_posts" : report.target_type === "comment" ? "community_comments" : null;
      if (!table) return setMessage("Profile reports require a member-level admin review.");
      const { error } = await supabase.from(table).update({ status: action === "hide" ? "hidden" : "published" }).eq("id", report.target_id);
      if (error) return setMessage("Content status could not be changed.");
    }
    const [{ error: reportError }, { error: actionError }] = await Promise.all([
      supabase.from("community_reports").update({ status: action === "dismiss" ? "dismissed" : "resolved", resolved_at: new Date().toISOString() }).eq("id", report.id),
      supabase.from("community_moderation_actions").insert({ moderator_user_id: moderatorId, report_id: report.id, target_type: report.target_type, target_id: report.target_id, action, notes: `Action applied through secured BYNV moderation console.` }),
    ]);
    if (reportError || actionError) return setMessage("The moderation action could not be fully recorded.");
    await load(); setMessage("Moderation action recorded.");
  }

  async function saveEntitlement(entitlement: Entitlement) {
    if (role !== "admin") return;
    setMessage("Updating member access…");
    const { error } = await createClient().from("community_entitlements").update({ access_level: entitlement.access_level, first_circle: entitlement.first_circle, community_role: entitlement.community_role }).eq("user_id", entitlement.user_id);
    if (error) return setMessage("Member access could not be updated.");
    await load(); setMessage("Member access updated.");
  }

  async function toggleRestriction(userId: string) {
    if (role !== "admin" || userId === moderatorId) return setMessage("An admin cannot restrict their own account from this console.");
    const supabase = createClient(); const restricted = restrictedUsers.has(userId); setMessage(restricted ? "Restoring posting access…" : "Restricting posting access for seven days…");
    const { error } = restricted
      ? await supabase.from("community_member_restrictions").delete().eq("user_id", userId)
      : await supabase.from("community_member_restrictions").upsert({ user_id: userId, created_by: moderatorId, restricted_until: new Date(Date.now() + 7 * 86400000).toISOString(), reason: "Temporary Community posting restriction applied through the moderation console." }, { onConflict: "user_id" });
    if (error) return setMessage("Member posting access could not be changed.");
    await load(); setMessage(restricted ? "Posting access restored." : "Posting restricted for seven days.");
  }

  return <div className="admin-community-grid">
    <section className="panel"><p className="eyebrow">Report queue</p><h2>Content requiring review</h2>{reports.length ? reports.map((report) => <article className="moderation-item" key={report.id}><p><strong>{report.target_type}</strong> · {new Date(report.created_at).toLocaleString()}</p><p>{report.reason}</p><code>{report.target_id}</code><div className="button-row"><button className="button" type="button" onClick={() => void moderate(report, "hide")}>Hide content</button><button className="button secondary" type="button" onClick={() => void moderate(report, "restore")}>Restore content</button><button className="text-button" type="button" onClick={() => void moderate(report, "dismiss")}>Dismiss report</button></div></article>) : <p>No open reports.</p>}</section>
    {role === "admin" && <section className="panel"><p className="eyebrow">Access control</p><h2>Community entitlements</h2><p>Only admins can grant First Circle, Priority, Mastermind, moderator, or admin access. Temporary restrictions block new posts and replies without exposing private member records.</p>{entitlements.map((item) => <form className="entitlement-row" key={item.user_id} onSubmit={(event) => { event.preventDefault(); void saveEntitlement(item); }}><code>{item.user_id}</code><label>Room access<select value={item.access_level} onChange={(event) => setEntitlements((current) => current.map((entry) => entry.user_id === item.user_id ? { ...entry, access_level: event.target.value as Entitlement["access_level"] } : entry))}><option value="community">Community</option><option value="priority">Priority</option><option value="mastermind">Mastermind</option></select></label><label>Role<select value={item.community_role} onChange={(event) => setEntitlements((current) => current.map((entry) => entry.user_id === item.user_id ? { ...entry, community_role: event.target.value as Entitlement["community_role"] } : entry))}><option value="member">Member</option><option value="moderator">Moderator</option><option value="admin">Admin</option></select></label><label className="check-row"><input type="checkbox" checked={item.first_circle} onChange={(event) => setEntitlements((current) => current.map((entry) => entry.user_id === item.user_id ? { ...entry, first_circle: event.target.checked } : entry))} /> First Circle</label><button className="button secondary" type="submit">Save access</button><button className="text-button" type="button" onClick={() => void toggleRestriction(item.user_id)}>{restrictedUsers.has(item.user_id) ? "Restore posting" : "Restrict 7 days"}</button></form>)}</section>}
    <p className="form-message" role="status" aria-live="polite">{message}</p>
  </div>;
}
