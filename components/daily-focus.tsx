"use client";

import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function DailyFocus() {
  const [userId, setUserId] = useState("");
  const [priority, setPriority] = useState("");
  const [action, setAction] = useState("");
  const [reflection, setReflection] = useState("");
  const [completed, setCompleted] = useState(false);
  const [message, setMessage] = useState("Loading today’s focus…");
  const date = new Date().toISOString().slice(0, 10);
  useEffect(() => { void (async () => { const supabase = createClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user) return; setUserId(user.id); const { data } = await supabase.from("daily_focus_entries").select("priority,action,reflection,completed").eq("user_id", user.id).eq("focus_date", date).maybeSingle(); if (data) { setPriority(data.priority ?? ""); setAction(data.action ?? ""); setReflection(data.reflection ?? ""); setCompleted(Boolean(data.completed)); } setMessage(""); })(); }, [date]);
  async function save(event: FormEvent) { event.preventDefault(); if (!userId) return; setMessage("Saving…"); const { error } = await createClient().from("daily_focus_entries").upsert({ user_id: userId, focus_date: date, priority: priority.trim() || null, action: action.trim() || null, reflection: reflection.trim() || null, completed }, { onConflict: "user_id,focus_date" }); setMessage(error ? "Today’s focus could not be saved." : "Saved to your account."); }
  return <form className="member-form" onSubmit={save}><label>Today&apos;s priority<input value={priority} onChange={(event) => setPriority(event.target.value)} maxLength={200} placeholder="What matters most today?" /></label><label>One concrete action<textarea value={action} onChange={(event) => setAction(event.target.value)} maxLength={1000} rows={4} placeholder="Make the next step specific and doable." /></label><label className="check-row"><input type="checkbox" checked={completed} onChange={(event) => setCompleted(event.target.checked)} /> I completed today&apos;s action</label><label>End-of-day reflection <textarea value={reflection} onChange={(event) => setReflection(event.target.value)} maxLength={2000} rows={5} placeholder="What helped, what created friction, and what will you adjust?" /></label><button className="button">Save today&apos;s focus</button><p className="form-message" role="status">{message}</p></form>;
}
