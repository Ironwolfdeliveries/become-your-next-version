"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cycleProgress } from "@/lib/journey";
import { KaiPrompt } from "./kai-prompt";
type Cycle = { id: string; starts_on: string; ends_on: string; focus: string; outcome: string | null; status: string };
export function ArchitectCycle({ suggestedPriority = "", suggestedAction = "" }: { suggestedPriority?: string; suggestedAction?: string }) {
  const router = useRouter();
  const [userId, setUserId] = useState(""); const [cycle, setCycle] = useState<Cycle | null>(null);
  const [message, setMessage] = useState("Loading your cycle…"); const [loading, setLoading] = useState(true); const [pending, setPending] = useState(false);
  useEffect(() => { void (async () => {
    const supabase = createClient(); const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setMessage("Sign in to continue."); return; }
    setUserId(user.id);
    const { data, error } = await supabase.from("architect_cycles").select("id,starts_on,ends_on,focus,outcome,status").eq("user_id", user.id).eq("status", "active").order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (error) { setMessage("Your cycle could not be loaded. Refresh to retry."); return; }
    setCycle(data); setLoading(false); setMessage("");
  })().catch(() => setMessage("Your cycle could not be loaded. Refresh to retry.")); }, []);
  async function start(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (pending || !userId || loading) return;
    const data = new FormData(event.currentTarget); const focus = String(data.get("focus") ?? "").trim(); const days = Number(data.get("days"));
    if (!focus || ![14,30,60].includes(days)) return;
    setPending(true); setMessage("Starting your cycle…");
    try {
      const supabase = createClient();
      const existing = await supabase.from("architect_cycles").select("id").eq("user_id", userId).eq("status", "active").limit(1);
      if (existing.error) throw existing.error;
      if (!existing.data?.length) {
        const start = new Date(); const end = new Date(start); end.setUTCDate(end.getUTCDate() + days - 1);
        const { error } = await supabase.from("architect_cycles").insert({ user_id: userId, focus, starts_on: start.toISOString().slice(0,10), ends_on: end.toISOString().slice(0,10) });
        if (error) throw error;
      }
      window.dispatchEvent(new Event("bynv:journey-changed")); router.push("/daily-focus"); router.refresh();
    } catch { setMessage("Your cycle could not be started. Please try again."); setPending(false); }
  }
  async function complete(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!cycle || pending) return;
    const outcome = String(new FormData(event.currentTarget).get("outcome") ?? "").trim(); setPending(true);
    try {
      const { data, error } = await createClient().from("architect_cycles").update({ status: "completed", outcome: outcome || null }).eq("id", cycle.id).eq("user_id", userId).select("id");
      if (error || !data?.length) throw error ?? new Error("Not saved");
      setCycle(null); setMessage("Cycle completed. Your review is preserved in Progress."); window.dispatchEvent(new Event("bynv:journey-changed")); router.refresh();
    } catch { setMessage("Your review could not be saved. Please try again."); } finally { setPending(false); }
  }
  if (loading) return <p role="status">{message}</p>;
  if (!cycle) return <form className="member-form" onSubmit={start}><p className="eyebrow">Blueprint → Your cycle</p><h2>One direction. Fourteen days.</h2><p>Start with a short, manageable cycle. Change the focus or duration to fit your life.</p>{suggestedAction && <div className="journey-suggestion"><strong>Suggested first action</strong><p>{suggestedAction}</p></div>}<label>Cycle focus<input name="focus" defaultValue={suggestedPriority} required maxLength={240} placeholder="What are you building or strengthening?" /></label><label>Cycle length<select name="days" defaultValue="14"><option value="14">14 days — recommended first cycle</option><option value="30">30 days</option><option value="60">60 days</option></select></label><button className="button" disabled={pending}>Begin cycle &amp; choose today&apos;s action</button><KaiPrompt prompt="Help me plan a manageable Architect Cycle from my Blueprint priority.">Ask Kai about this cycle</KaiPrompt><p className="form-message" role="status">{message}</p><Link href="/progress">Review past cycles</Link></form>;
  const progress = cycleProgress(cycle.starts_on, cycle.ends_on);
  return <section className="cycle-card"><p className="eyebrow">Current Architect Cycle</p><h2>{cycle.focus}</h2><p>Day {progress.day} of {progress.total}{progress.reviewDue ? " · Ready for your review" : ""}</p><progress className="journey-progress" value={progress.day} max={progress.total} aria-label="Days through your cycle" /><Link className="button" href="/daily-focus">Continue today&apos;s work</Link><form className="member-form" onSubmit={complete}><label>Cycle review<textarea name="outcome" rows={6} maxLength={3000} placeholder="What changed? What worked? What will you carry into the next cycle?" /></label><button className="button secondary" disabled={pending}>Complete cycle &amp; save review</button><p role="status">{message}</p></form></section>;
}
