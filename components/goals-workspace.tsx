"use client";

import { FormEvent, useEffect, useState } from "react";
import { architectSections } from "@/lib/architect-assessment";
import { createClient } from "@/lib/supabase/client";

type Goal = { id: string; title: string; pillar_key: string | null; status: string; target_date: string | null };
export function GoalsWorkspace() {
  const [userId, setUserId] = useState(""); const [goals, setGoals] = useState<Goal[]>([]); const [message, setMessage] = useState("Loading your goals…");
  async function load() { const supabase = createClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user) return; setUserId(user.id); const { data } = await supabase.from("goals").select("id,title,pillar_key,status,target_date").eq("user_id", user.id).neq("status", "archived").order("created_at", { ascending: false }); setGoals(data ?? []); setMessage(""); }
  useEffect(() => { void load(); }, []);
  async function add(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); const title = String(data.get("title") ?? "").trim(); if (!title || !userId) return; setMessage("Saving…"); const { error } = await createClient().from("goals").insert({ user_id: userId, title, pillar_key: String(data.get("pillar") ?? "") || null, target_date: String(data.get("targetDate") ?? "") || null }); if (error) return setMessage("Goal could not be saved."); form.reset(); await load(); setMessage("Goal saved."); }
  async function toggle(goal: Goal) { await createClient().from("goals").update({ status: goal.status === "completed" ? "active" : "completed" }).eq("id", goal.id).eq("user_id", userId); await load(); }
  return <div className="goals-layout"><form className="member-form" onSubmit={add}><label>Goal<input name="title" maxLength={160} required placeholder="What outcome are you building toward?" /></label><label>Related domain<select name="pillar"><option value="">Choose a domain</option>{architectSections.map((section) => <option key={section.key} value={section.key}>{section.label}</option>)}</select></label><label>Target date (optional)<input name="targetDate" type="date" /></label><button className="button">Add goal</button><p className="form-message" role="status">{message}</p></form><section className="goal-list" aria-label="Saved goals">{goals.length ? goals.map((goal) => <article key={goal.id} className={goal.status === "completed" ? "complete" : ""}><div><p className="eyebrow">{architectSections.find((section) => section.key === goal.pillar_key)?.label || "Personal goal"}</p><h2>{goal.title}</h2>{goal.target_date && <time dateTime={goal.target_date}>Target {new Date(`${goal.target_date}T00:00:00`).toLocaleDateString()}</time>}</div><button className="button secondary" type="button" onClick={() => void toggle(goal)}>{goal.status === "completed" ? "Reopen" : "Mark complete"}</button></article>) : <p className="muted">Your active goals will appear here.</p>}</section></div>;
}
