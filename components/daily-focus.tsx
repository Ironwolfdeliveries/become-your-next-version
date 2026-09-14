"use client";

import Link from "next/link";
import { KaiPrompt } from "./kai-prompt";
import { FormEvent, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AILeverageAudit } from "./ai-leverage-audit";

export function DailyFocus({ suggestedPriority = "", suggestedAction = "" }: { suggestedPriority?: string; suggestedAction?: string }) {
  const actionRef = useRef<HTMLTextAreaElement>(null);
  const [loaded, setLoaded] = useState(false); const [pending, setPending] = useState(false);
  const [userId, setUserId] = useState("");
  const [priority, setPriority] = useState("");
  const [action, setAction] = useState("");
  const [reflection, setReflection] = useState("");
  const [completed, setCompleted] = useState(false);
  const [message, setMessage] = useState("Loading today’s focus…");
  const date = new Date().toISOString().slice(0, 10);
  useEffect(() => { void (async () => { const supabase = createClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user) return; setUserId(user.id); const { data, error } = await supabase.from("daily_focus_entries").select("priority,action,reflection,completed").eq("user_id", user.id).eq("focus_date", date).maybeSingle(); if (error) { setMessage("Today’s focus could not be loaded. Refresh to retry."); return; } if (data) { setPriority(data.priority ?? ""); setAction(data.action ?? ""); setReflection(data.reflection ?? ""); setCompleted(Boolean(data.completed)); } setLoaded(true); setMessage(""); })().catch(() => setMessage("Today’s focus could not be loaded. Refresh to retry.")); }, [date]);
  async function save(event: FormEvent) { event.preventDefault(); if (!userId || !loaded || pending) return; setPending(true); setMessage("Saving…"); try { const { error } = await createClient().from("daily_focus_entries").upsert({ user_id: userId, focus_date: date, priority: priority.trim() || null, action: action.trim() || null, reflection: reflection.trim() || null, completed }, { onConflict: "user_id,focus_date" }); setPending(false); setMessage(error ? "Today’s focus could not be saved." : completed ? "Action completed. Your reflection is saved. Review your progress next." : "Saved to your account."); if (!error) window.dispatchEvent(new Event("bynv:journey-changed")); } catch { setMessage("Today’s focus could not be saved. Your entries are still here; try again."); } finally { setPending(false); } }
  return <>{loaded && suggestedAction && !action && <section className="journey-suggestion"><p className="eyebrow">Your Blueprint → Today</p><h2>{suggestedPriority || "One useful next step"}</h2><p>{suggestedAction}</p><div className="button-row"><button className="button" type="button" onClick={() => { setPriority(suggestedPriority.slice(0,200)); setAction(suggestedAction); }}>Use this action</button><button className="button secondary" type="button" onClick={() => { setPriority(suggestedPriority.slice(0,200)); actionRef.current?.focus(); }}>Customize it</button><KaiPrompt prompt="Help me choose a small daily action connected to my current cycle and Blueprint.">Ask Kai</KaiPrompt></div><p className="field-help">A suggestion, not a requirement. Nothing changes until you save.</p></section>}<form className="member-form" onSubmit={save}><label>Today&apos;s priority<input value={priority} onChange={(event) => setPriority(event.target.value)} maxLength={200} placeholder="What matters most today?" /></label><label>One concrete action<textarea ref={actionRef} value={action} onChange={(event) => setAction(event.target.value)} maxLength={1000} rows={4} placeholder="Make the next step specific and doable." /></label><label className="check-row"><input type="checkbox" checked={completed} onChange={(event) => setCompleted(event.target.checked)} /> I completed today&apos;s action</label><label>End-of-day reflection <textarea value={reflection} onChange={(event) => setReflection(event.target.value)} maxLength={2000} rows={5} placeholder="What helped, what created friction, and what will you adjust?" /></label><button className="button" disabled={!loaded || pending}>Save today&apos;s focus</button><p className="form-message" role="status">{message}</p></form>{completed && <p className="journey-milestone"><Link href="/progress">Review your progress →</Link></p>}<AILeverageAudit priority={priority} action={action} /></>;
}
