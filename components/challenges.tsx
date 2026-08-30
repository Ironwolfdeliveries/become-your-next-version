"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const challenges = [
  { key: "clarity-7", days: 7, title: "7-Day Clarity Reset", description: "Name one priority each morning and remove one competing distraction." },
  { key: "energy-14", days: 14, title: "14-Day Energy Protection", description: "Protect one repeatable source of energy and notice what makes it easier to keep." },
  { key: "consistency-30", days: 30, title: "30-Day Consistency Build", description: "Repeat one small action connected to your Blueprint and review the pattern weekly." },
] as const;
type Enrollment = { id: string; challenge_key: string; status: string; progress: number };
export function Challenges() {
  const [userId, setUserId] = useState(""); const [enrollments, setEnrollments] = useState<Enrollment[]>([]); const [message, setMessage] = useState("Loading your challenges…");
  async function load() { const supabase = createClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user) return; setUserId(user.id); const { data } = await supabase.from("challenge_enrollments").select("id,challenge_key,status,progress").eq("user_id", user.id); setEnrollments(data ?? []); setMessage(""); }
  useEffect(() => { void load(); }, []);
  async function start(key: string) { setMessage("Saving…"); const { error } = await createClient().from("challenge_enrollments").upsert({ user_id: userId, challenge_key: key, status: "active", progress: 0, completed_at: null }, { onConflict: "user_id,challenge_key" }); if (error) return setMessage("Challenge could not be saved."); await load(); }
  async function advance(enrollment: Enrollment, days: number) { const progress = Math.min(days, enrollment.progress + 1); const completed = progress >= days; await createClient().from("challenge_enrollments").update({ progress, status: completed ? "completed" : "active", completed_at: completed ? new Date().toISOString() : null }).eq("id", enrollment.id).eq("user_id", userId); await load(); setMessage(completed ? "Challenge completed and saved." : `Day ${progress} saved.`); }
  return <><div className="challenge-grid">{challenges.map((challenge) => { const enrollment = enrollments.find((item) => item.challenge_key === challenge.key); return <article className="card" key={challenge.key}><p className="eyebrow">{challenge.days} deliberate days</p><h2>{challenge.title}</h2><p>{challenge.description}</p>{enrollment ? <><div className="architect-progress"><span style={{ width: `${Math.round((enrollment.progress / challenge.days) * 100)}%` }} /></div><p className="progress-copy">{enrollment.progress} of {challenge.days} days recorded · {enrollment.status}</p><button className="button secondary" disabled={enrollment.status === "completed"} onClick={() => void advance(enrollment, challenge.days)}>{enrollment.status === "completed" ? "Completed" : "Record today"}</button></> : <button className="button secondary" onClick={() => void start(challenge.key)}>Begin challenge</button>}</article>; })}</div><p className="form-message" role="status">{message}</p></>;
}
