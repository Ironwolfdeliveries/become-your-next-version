"use client";

import Link from "next/link";
import Image from "next/image";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { architectSections } from "@/lib/architect-assessment";
import { commitmentRules, type CommitmentRule, type Goal } from "@/lib/experience";
import { createClient } from "@/lib/supabase/client";
import "./goals-workspace.css";

const goalFields = "id,title,pillar_key,status,target_date,success_vision,commitment_rule,advanced_at";
const questions = ["What do you want to change or achieve?", "What would success look like?", "What part of your life does this goal belong to?", "Does this feel worth building?"];
type GoalDraft = { title: string; success: string; area: string; targetDate: string; rule: CommitmentRule | "" };
const blankDraft: GoalDraft = { title: "", success: "", area: "", targetDate: "", rule: "" };

export function GoalsWorkspace({ userId }: { userId: string }) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [step, setStep] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<GoalDraft>(blankDraft);
  const [composerOpen, setComposerOpen] = useState(false);
  const question = useRef<HTMLHeadingElement>(null);
  const actionLock = useRef(false);

  const load = useCallback(async () => {
    setLoading(true); setLoadError("");
    try {
      const { data, error: queryError } = await createClient().from("goals").select(goalFields).eq("user_id", userId).neq("status", "archived").order("created_at", { ascending: false });
      if (queryError) throw queryError;
      setGoals((data ?? []) as Goal[]);
      if (!data?.length) setComposerOpen(true);
    } catch { setLoadError("Your saved goals could not be loaded. Please try again before making changes."); }
    finally { setLoading(false); }
  }, [userId]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (composerOpen && !loading) question.current?.focus(); }, [step, composerOpen, loading]);

  function begin(goal?: Goal) {
    setEditingId(goal?.id ?? null);
    setDraft(goal ? { title: goal.title, success: goal.success_vision ?? "", area: goal.pillar_key ?? "", targetDate: goal.target_date ?? "", rule: goal.commitment_rule ?? "" } : blankDraft);
    setStep(goal ? 3 : 0); setError(""); setMessage(""); setComposerOpen(true);
  }
  function updateDraft(key: keyof GoalDraft, value: string) { setDraft(current => ({ ...current, [key]: value })); }
  function cancel() { setComposerOpen(false); setEditingId(null); setDraft(blankDraft); setStep(0); setError(""); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (actionLock.current) return;
    if (step === 0 && !draft.title.trim()) { setError("Give your goal a short name so Kai knows what you want to change."); return; }
    if (step < 3) { setError(""); setStep(step + 1); return; }
    if (!draft.title.trim()) { setStep(0); return; }
    actionLock.current = true; setPending(true); setError(""); setMessage("");
    try {
      const values = { title: draft.title.trim(), success_vision: draft.success.trim() || null, pillar_key: draft.area || null, target_date: draft.targetDate || null, commitment_rule: draft.rule || null };
      const supabase = createClient();
      const query = editingId ? supabase.from("goals").update(values).eq("id", editingId).eq("user_id", userId) : supabase.from("goals").insert({ ...values, user_id: userId });
      const { data, error: saveError } = await query.select(goalFields).single();
      if (saveError || !data) throw saveError ?? new Error("Goal was not returned.");
      const saved = data as Goal;
      setGoals(current => editingId ? current.map(goal => goal.id === saved.id ? saved : goal) : [saved, ...current]);
      setMessage(editingId ? "Your goal is updated. Keep the next step realistic." : "Your goal is saved. Turn it into a 14-day plan when you’re ready.");
      window.dispatchEvent(new Event("bynv:journey-changed")); cancel();
    } catch { setError("That goal could not be saved. Your words are still here. Please try again."); }
    finally { setPending(false); actionLock.current = false; }
  }
  async function mark(goal: Goal, action: "advance" | "complete" | "reopen") {
    if (actionLock.current) return;
    actionLock.current = true; setPending(true); setError(""); setMessage("");
    try {
      const values = action === "advance" ? { advanced_at: new Date().toISOString() } : { status: action === "complete" ? "completed" : "active" };
      const { data, error: saveError } = await createClient().from("goals").update(values).eq("id", goal.id).eq("user_id", userId).select(goalFields).single();
      if (saveError || !data) throw saveError ?? new Error("Goal was not returned.");
      setGoals(current => current.map(item => item.id === goal.id ? data as Goal : item));
      setMessage(action === "advance" ? "Progress noted. Small moves count, even before the goal is finished." : action === "complete" ? "Goal completed. Take a moment to notice what you made possible." : "Goal reopened. You can pick up from here.");
      window.dispatchEvent(new Event("bynv:journey-changed"));
    } catch { setError("That change could not be saved. Your goal is unchanged. Please try again."); }
    finally { setPending(false); actionLock.current = false; }
  }

  if (loading) return <p role="status">Loading your goals…</p>;
  if (loadError) return <div className="goals-load-error"><p className="form-error" role="alert">{loadError}</p><button className="button secondary" onClick={() => void load()}>Try again</button></div>;
  const active = goals.filter(goal => goal.status !== "completed");
  const completed = goals.filter(goal => goal.status === "completed");
  const selectedArea = architectSections.find(area => area.key === draft.area);

  function goalCard(goal: Goal) {
    const isComplete = goal.status === "completed";
    return <article className={`guided-goal-card${isComplete ? " is-complete" : ""}`} key={goal.id}>
      <p className="eyebrow">{architectSections.find(area => area.key === goal.pillar_key)?.label ?? "Personal goal"}{isComplete ? " · Complete" : ""}</p>
      <h3>{goal.title}</h3>
      {goal.success_vision && <p className="goal-success"><span>Success looks like</span>{goal.success_vision}</p>}
      <div className="goal-facts">
        {goal.target_date && <time dateTime={goal.target_date}>Progress by {new Date(`${goal.target_date}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</time>}
        {goal.advanced_at && <span>Last advanced {new Date(goal.advanced_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>}
        {goal.commitment_rule && <span>If I miss: {commitmentRules.find(rule => rule.key === goal.commitment_rule)?.label}</span>}
      </div>
      <div className="goal-card-actions">
        {!isComplete && <Link className="button" href={`/architect-cycle?goal=${encodeURIComponent(goal.id)}`}>Build a 14-day plan <span aria-hidden="true">→</span></Link>}
        {!isComplete && <button className="button secondary" disabled={pending} type="button" onClick={() => void mark(goal, "advance")}>I made progress</button>}
      </div>
      <div className="goal-quiet-actions"><button disabled={pending} type="button" onClick={() => begin(goal)}>Edit goal</button><button disabled={pending} type="button" onClick={() => void mark(goal, isComplete ? "reopen" : "complete")}>{isComplete ? "Reopen goal" : "Mark goal complete"}</button></div>
    </article>;
  }

  return <div className="guided-goals">
    <div className="goals-toolbar"><p>{active.length ? `${active.length} active ${active.length === 1 ? "goal" : "goals"}. Give one your attention today.` : "One meaningful change is enough to start."}</p>{!composerOpen && <button className="button secondary" disabled={pending} onClick={() => begin()}>New goal</button>}</div>
    <p className="goals-feedback" role="status">{message}</p>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className={`guided-goals-layout${composerOpen ? " with-composer" : ""}`}>
      {composerOpen && <form onSubmit={submit} className="goal-conversation">
        <header className="goal-kai-header"><Image src="/images/kai-approved-face.webp" alt="Kai" width={50} height={50} /><div><p className="eyebrow">Kai · Let’s give it direction</p><span>{step < 3 ? `Question ${step + 1} of 3` : "Your goal, in your words"}</span></div></header>
        <h2 tabIndex={-1} ref={question}>{questions[step]}</h2>
        <fieldset disabled={pending}>
          {step === 0 && <><label className="goal-field"><span>A short phrase is enough.</span><input autoComplete="off" name="goalTitle" aria-label="What do you want to change or achieve?" required maxLength={160} value={draft.title} onChange={event => updateDraft("title", event.target.value)} placeholder="Protect time for what matters" /></label><p className="field-help">Choose something that matters to you. You can refine it as you learn.</p></>}
          {step === 1 && <><p className="goal-context">You’re working toward: <strong>{draft.title}</strong></p><label className="goal-field"><span>What would be noticeably different?</span><textarea name="success" aria-label="What would success look like?" rows={3} maxLength={600} value={draft.success} onChange={event => updateDraft("success", event.target.value)} placeholder="I have two evenings a week for the things I keep putting off." /></label><p className="field-help">One sentence helps Kai shape the plan. You can also leave this open for now.</p></>}
          {step === 2 && <div className="goal-area-options" role="group" aria-label="Area of your life">{architectSections.map(area => <button className={draft.area === area.key ? "selected" : ""} type="button" aria-pressed={draft.area === area.key} key={area.key} onClick={() => updateDraft("area", area.key)}>{area.label}</button>)}<button type="button" className={!draft.area ? "selected" : ""} aria-pressed={!draft.area} onClick={() => updateDraft("area", "")}>I’ll decide later</button></div>}
          {step === 3 && <><dl className="goal-review"><div><dt>What I’m building</dt><dd>{draft.title}<button type="button" onClick={() => setStep(0)}>Edit</button></dd></div><div><dt>Success looks like</dt><dd>{draft.success || "I’ll make this clearer as I build."}<button type="button" onClick={() => setStep(1)}>Edit</button></dd></div><div><dt>Part of my life</dt><dd>{selectedArea?.label ?? "I’ll decide later"}<button type="button" onClick={() => setStep(2)}>Edit</button></dd></div></dl>
            <details className="goal-options" open={draft.targetDate || draft.rule ? true : undefined}><summary>Timing & a commitment rule <span>Optional</span></summary><label className="goal-field"><span>When would you like to make meaningful progress?</span><input type="date" name="targetDate" value={draft.targetDate} onChange={event => updateDraft("targetDate", event.target.value)} /></label><label className="goal-field"><span>If I miss a commitment, I will…</span><select name="commitmentRule" value={draft.rule} onChange={event => updateDraft("rule", event.target.value)}><option value="">No rule for now</option>{commitmentRules.map(rule => <option key={rule.key} value={rule.key}>{rule.label}</option>)}</select></label><p className="field-help">A way back when life interrupts. Kai uses this when you build a Cycle from this goal.</p></details></>}
          <div className="goal-wizard-actions">{step > 0 && <button type="button" className="button secondary" onClick={() => setStep(step - 1)}>Back</button>}<button className="button" type="submit">{pending ? "Saving…" : step === 3 ? editingId ? "Save changes" : "Save my goal" : "Continue"}</button></div>
          <button className="goal-cancel" type="button" onClick={cancel}>Cancel</button>
        </fieldset>
      </form>}
      <section className="guided-goal-list" aria-label="Your saved goals">
        {active.length > 0 && <><h2>What you’re building</h2>{active.map(goalCard)}</>}
        {!active.length && <div className="goal-empty"><p className="eyebrow">Start with what matters</p><h2>{completed.length ? "Ready for your next chapter?" : "Your direction belongs here."}</h2><p>{completed.length ? "You’ve finished meaningful work. Choose what deserves your attention next." : "Choose a goal, then let Kai help turn it into a realistic 14-day plan."}</p>{!composerOpen && <button className="button" type="button" disabled={pending} onClick={() => begin()}>Choose a goal</button>}</div>}
        {completed.length > 0 && <details className="goals-completed"><summary>{completed.length} {completed.length === 1 ? "goal" : "goals"} completed</summary>{completed.map(goalCard)}</details>}
      </section>
    </div>
  </div>;
}
