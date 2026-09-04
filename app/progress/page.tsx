import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHero, Button } from "@/components/ui";

export const metadata = { title: "Progress", description: "Review BYNV Version Scores and completed Architect Cycles over time." };
export const dynamic = "force-dynamic";
export default async function ProgressPage() {
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user) redirect("/sign-in");
  const [{ data: snapshots }, { data: assessment }, { data: cycles }, { count: completedActions }] = await Promise.all([
    supabase.from("version_snapshots").select("id,score,completed_at").eq("user_id", user.id).order("completed_at", { ascending: false }),
    supabase.from("architect_assessments").select("version_score,completed_at,status").eq("user_id", user.id).eq("version", 1).maybeSingle(),
    supabase.from("architect_cycles").select("id,focus,outcome,starts_on,ends_on,status").eq("user_id", user.id).order("created_at", { ascending: false }),
    supabase.from("daily_focus_entries").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("completed", true),
  ]);
  return <><PageHero eyebrow="Progress" title="See how far you have come." copy="Your saved scores, completed actions, and cycle reviews give you a clear record of what you have done and what to work on next." /><div className="container progress-grid"><article className="panel"><p className="eyebrow">Full Version Score</p><h2>{assessment?.status === "completed" ? `${assessment.version_score}/100` : "Not established"}</h2><p>{assessment?.status === "completed" ? "Your Version Score from the full Architect Assessment." : "Complete the Architect Assessment to get your full Version Score."}</p><Button href={assessment?.status === "completed" ? "/blueprint" : "/architect-assessment"} secondary>{assessment?.status === "completed" ? "Review Blueprint" : "Continue Assessment"}</Button></article><article className="panel"><p className="eyebrow">Completed daily actions</p><h2>{completedActions ?? 0}</h2><p>Actions you marked complete in Daily Focus.</p><Button href="/daily-focus" secondary>Open Daily Focus</Button></article><section className="progress-history"><p className="eyebrow">Version Snapshot history</p><h2>Your saved scores</h2>{snapshots?.length ? snapshots.map((snapshot) => <article key={snapshot.id}><strong>{snapshot.score}/100</strong><time dateTime={snapshot.completed_at}>{new Date(snapshot.completed_at).toLocaleDateString()}</time></article>) : <p className="muted">No saved Snapshots yet.</p>}</section><section className="progress-history"><p className="eyebrow">Architect Cycle history</p><h2>Your completed work</h2>{cycles?.length ? cycles.map((cycle) => <article key={cycle.id}><div><strong>{cycle.focus}</strong><p>{cycle.outcome || (cycle.status === "active" ? "Cycle in progress" : "No review recorded")}</p></div><time>{cycle.starts_on} — {cycle.ends_on}</time></article>) : <p className="muted">No Architect Cycles yet.</p>}</section></div></>;
}
