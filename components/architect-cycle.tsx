"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { architectSections } from "@/lib/architect-assessment";
import { changeExperience, commitmentRules, entrySteps, loadExperience, type CommitmentRule, type Experience, type Goal } from "@/lib/experience";
import { cycleProgress } from "@/lib/journey";
import { ChangeReviewForm, ChangeEvidence } from "./change-review";
import { PersonalCommitment } from "./personal-commitment";
import { DirectionHelp } from "./direction-help";
import { reviewSummary, safePersonalChoice, type ChangeReview } from "@/lib/momentum";
import { KaiAvatar } from "./kai-avatar";
import { KaiPrompt } from "./kai-prompt";
import { AreaHelp } from "./area-help";
import { areaGuidance, getAreaGuidance, resolveAreaKey } from "@/lib/area-guidance";
import "./cycle-guide.css";

const suggestions: Record<string, readonly string[]> = Object.fromEntries(Object.entries(areaGuidance).map(([key, area]) => [key, area.actions]));

function suggestedSteps(pillar: string | null, focus: string, isGoal = false) {
  const areaSuggestions = suggestions[resolveAreaKey(pillar, focus) ?? ""] ?? [];
  const first = isGoal ? `Choose one task that would move “${focus}” forward, then spend 10 minutes starting it.` : areaSuggestions[0] || `Choose one task that would move “${focus}” forward, then spend 10 minutes starting it.`;
  return [first.slice(0, 500)];
}

type Stage = "choose" | "success" | "steps" | "commitment";

export function ArchitectCycle({ initialGoalId = "", chooseAnother = false }: { initialGoalId?: string; chooseAnother?: boolean }) {
  const router = useRouter();
  const [context, setContext] = useState<Experience | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [stage, setStage] = useState<Stage>("choose");
  const [focus, setFocus] = useState("");
  const [pillar, setPillar] = useState<string | null>(null);
  const [goalId, setGoalId] = useState<string | null>(null);
  const [success, setSuccess] = useState("");
  const [steps, setSteps] = useState<string[]>([]);
  const [editingStep, setEditingStep] = useState<number | null>(null);
  const [rule, setRule] = useState<CommitmentRule | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reward, setReward] = useState("");
  const [customRule, setCustomRule] = useState("");
  const initialGoalApplied = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);

  const refresh = useCallback(async () => {
    setLoading(true); setMessage("");
    try {
      const data = await loadExperience(); setContext(data);
      const goal = data.goals.find(item => item.id === initialGoalId && item.status === "active");
      if (goal && !data.cycle && !initialGoalApplied.current) {
        initialGoalApplied.current = true;
        setFocus(goal.title); setPillar(goal.pillar_key); setGoalId(goal.id); setSuccess(goal.success_vision ?? "");
        setRule(goal.commitment_rule); setReward(goal.personal_reward ?? ""); setCustomRule(goal.custom_rule ?? ""); setSteps(suggestedSteps(goal.pillar_key, goal.title, true));
        setStage(goal.success_vision ? "steps" : "success");
      }
    } catch (error) { setMessage(error instanceof Error ? error.message : "Your Cycle could not be loaded. Please try again."); }
    finally { setLoading(false); }
  }, [initialGoalId]);
  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => { if (!loading) heading.current?.focus(); }, [stage, reviewOpen, loading]);

  function choose(title: string, key: string | null, goal?: Goal) {
    if (!context || !title.trim()) return;
    setFocus(title.trim()); setPillar(key); setGoalId(goal?.id ?? null); setSuccess(goal?.success_vision ?? "");
    setRule(goal?.commitment_rule ?? null); setReward(goal?.personal_reward ?? ""); setCustomRule(goal?.custom_rule ?? ""); setSteps(suggestedSteps(key, title.trim(), Boolean(goal)));
    setEditingStep(null); setMessage(""); setStage(goal?.success_vision ? "steps" : "success");
  }

  async function startCycle() {
    if (pending || !focus.trim() || !success.trim() || !steps.length || steps.some(step => !step.trim())) return;
    if (!safePersonalChoice(customRule) || !safePersonalChoice(reward)) { setMessage("Choose a constructive response and reward."); return; }
    setPending(true); setMessage("");
    try {
      await changeExperience({ action: "start-cycle", custom_rule: customRule.trim(), personal_reward: reward.trim(), focus: focus.trim(), success_vision: success.trim(), plan_steps: steps.map(step => step.trim()), commitment_rule: rule, pillar_key: pillar, goal_id: goalId });
      router.push("/daily-focus"); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Your Cycle could not be started. Your choices are still here."); setPending(false); }
  }

  async function finishCycle(review: ChangeReview) {
    if (pending || !context?.cycle) return;
    setPending(true); setMessage("");
    const reviewedCycle = context.cycle;
    const outcome = reviewSummary(review);
    let reviewSaved = false;
    try {
      await changeExperience({ action: "review-cycle", cycle_id: reviewedCycle.id, expected_updated_at: reviewedCycle.updated_at, change_review: review });
      reviewSaved = true;
      setContext(current => current ? { ...current, cycle: null, cycles: current.cycles.map(item => item.id === reviewedCycle.id ? { ...item, status: "completed", outcome, change_review: review } : item) } : current);
      setReviewOpen(false); setStage("choose");
      const data = await loadExperience(); setContext(data);
      setMessage("Cycle completed. Your review is saved in Momentum. Let's decide what you want to build next."); router.refresh();
    } catch (error) { setMessage(reviewSaved ? "Your review is saved and this Cycle is complete. Updated progress could not be loaded yet. You can still choose your next direction." : error instanceof Error ? error.message : "Your review could not be saved. Please try again."); }
    finally { setPending(false); }
  }

  if (loading) return <section className="cycle-guide"><p role="status">Kai is gathering your Blueprint, goals, and saved progress…</p></section>;
  if (!context) return <section className="cycle-guide"><p role="alert">{message}</p><button className="button" onClick={() => void refresh()}>Try again</button></section>;
  if (!context.assessmentComplete) return <section className="cycle-guide"><KaiAvatar /><h2>Let&apos;s start with where you are.</h2><p>Your Architect Assessment gives us the starting point for a useful first Cycle.</p><Link className="button" href="/architect-assessment">Continue my assessment</Link></section>;

  const cycle = context.cycle;
  const strongest = context.strengths[0];
  const opportunity = context.priorities[0];
  const lastCycle = context.cycles.find(item => item.status === "completed");
  const activeGoals = context.goals.filter(goal => goal.status === "active");
  const progress = cycle ? cycleProgress(cycle.starts_on, cycle.ends_on, context.today) : null;
  const cycleEntries = cycle ? context.recent.filter(entry => entry.cycle_id === cycle.id || (!entry.cycle_id && entry.focus_date >= cycle.starts_on && entry.focus_date <= cycle.ends_on)) : [];
  const actionsCompleted = cycleEntries.reduce((total, entry) => total + entrySteps(entry).filter(step => step.done).length, 0);
  const progressDays = cycleEntries.filter(entry => entry.check_in === "progress").length;
  const due = Boolean(cycle && (progress?.reviewDue || context.today === cycle.ends_on));

  return <section className="cycle-guide" aria-busy={pending}>
    <div className="cycle-guide-kai"><KaiAvatar /><div><p className="eyebrow">Kai · Your next version, one step at a time</p><p>{cycle ? `${context.name}, let's keep the direction clear and the next step realistic.` : `${context.name}, you choose the direction. I'll help you make a plan you can actually use.`}</p></div></div>
    {message && <p className="cycle-guide-message" role="status">{message}</p>}

    {cycle && progress ? <>
      <div className="cycle-guide-context"><span className="eyebrow">Your current Architect Cycle</span><h2 ref={heading} tabIndex={-1}>{cycle.focus}</h2><AreaHelp areaKey={resolveAreaKey(cycle.pillar_key, cycle.focus)} actionable />{cycle.success_vision && <p><strong>You want to see:</strong> {cycle.success_vision}</p>}<p>Day {progress.day} of {progress.total} · {due ? "Ready to review" : `Review on ${cycle.ends_on}`}</p><progress value={progress.day} max={progress.total} aria-label="Days through this Cycle" /><small>Time through your Cycle. Your review helps you see what changed.</small></div>
      <div className="cycle-guide-momentum"><div><strong>{actionsCompleted}</strong><span>actions completed</span></div><div><strong>{progressDays}</strong><span>check-ins with progress</span></div></div>
      {cycle.plan_steps?.length > 0 && <div><h3>Your small starting steps</h3><ol className="cycle-guide-step-list">{cycle.plan_steps.map((step, index) => <li key={index}>{step}</li>)}</ol></div>}
      {cycle.personal_reward && <p className="cycle-guide-note">Your way to recognize the win: <strong>{cycle.personal_reward}</strong></p>}
      {cycle.custom_rule && <p className="cycle-guide-note">Your supportive response: {cycle.custom_rule}</p>}
      {cycle.commitment_rule && <p className="cycle-guide-note"><strong>Your Commitment Rule:</strong> {commitmentRules.find(item => item.key === cycle.commitment_rule)?.label}.</p>}
      {!reviewOpen ? <div className="cycle-guide-actions"><Link className="button" href="/daily-focus">Open Today&apos;s Plan</Link><button className="button secondary" onClick={() => setReviewOpen(true)}>{due ? "Review & finish this Cycle" : "Review this Cycle early"}</button><Link href="/momentum">See my momentum</Link></div> : <ChangeReviewForm evidence={cycleEntries.flatMap(entry => entrySteps(entry).filter(step => step.done).map(step => `${entry.focus_date}: ${step.text}`))} starting={cycle.success_vision || cycle.focus} reward={cycle.personal_reward} pending={pending} onSave={finishCycle} onCancel={() => setReviewOpen(false)} />}
    </> : <>
      <p className="cycle-guide-stage">{["choose", "success", "steps", "commitment"].indexOf(stage) + 1} of 4 · A short conversation, then a real plan</p>
      {stage === "choose" && <>
        <h2 ref={heading} tabIndex={-1}>What would you genuinely like to be different?</h2>
        {lastCycle && <div className="cycle-guide-context"><p className="eyebrow">Your next Cycle</p><h3>You finished: {lastCycle.focus}</h3>{lastCycle.change_review ? <ChangeEvidence review={lastCycle.change_review} /> : lastCycle.outcome && <p>{lastCycle.outcome}</p>}<p>Build on this direction, or choose a different priority below.</p><button className="button secondary" onClick={() => { setFocus(lastCycle.focus); setPillar(lastCycle.pillar_key); setGoalId(lastCycle.goal_id); setSuccess(lastCycle.success_vision ?? ""); setRule(lastCycle.commitment_rule); setReward(lastCycle.personal_reward ?? ""); setCustomRule(lastCycle.custom_rule ?? ""); setSteps(lastCycle.change_review?.carry?.trim() ? [lastCycle.change_review.carry.trim().slice(0,500)] : lastCycle.plan_steps?.length ? lastCycle.plan_steps.slice(0, 3) : suggestedSteps(lastCycle.pillar_key, lastCycle.focus)); setStage(lastCycle.success_vision ? "steps" : "success"); setMessage(""); }}>Build on this Cycle</button></div>}
        <form onSubmit={event => { event.preventDefault(); choose(focus, null); }}><label className="cycle-guide-field">What would you like to be different?<input value={focus} maxLength={240} onChange={event => setFocus(event.target.value)} /></label><DirectionHelp /><button className="button" disabled={!focus.trim()}>Build around my answer</button></form>
        <details className="cycle-guide-details"><summary>Help me choose using my Blueprint</summary>{strongest && opportunity && <p>Your strongest area is <strong>{strongest.label}</strong>. Your Blueprint suggests <strong>{opportunity.label}</strong> has the most room to grow. Does that fit what matters to you right now?</p>}
        {opportunity && <button className="cycle-guide-choice recommended" onClick={() => choose(opportunity.label, opportunity.key)}><span>Start with my Blueprint recommendation</span><strong>{opportunity.label}</strong><span className="area-choice-meaning">{getAreaGuidance(opportunity.key)?.meaning}</span></button>}{opportunity && <AreaHelp areaKey={opportunity.key} />}</details>
        {activeGoals.length > 0 && <div><h3>Or build on a goal you already chose</h3><div className="cycle-guide-choices">{activeGoals.map(goal => <button key={goal.id} className="cycle-guide-choice" onClick={() => choose(goal.title, goal.pillar_key, goal)}><strong>{goal.title}</strong>{goal.success_vision && <span>{goal.success_vision}</span>}</button>)}</div></div>}
        <details className="cycle-guide-details" open={chooseAnother || undefined}><summary>Choose a different part of my life</summary><div className="cycle-guide-choices">{architectSections.map(area => <button key={area.key} className="cycle-guide-choice" onClick={() => choose(area.label, area.key)}><strong>{area.label}</strong><span className="area-choice-meaning">{getAreaGuidance(area.key)?.meaning}</span></button>)}</div></details>

      </>}
      {stage !== "choose" && <AreaHelp areaKey={resolveAreaKey(pillar, focus)} actionable />}
      {stage === "success" && <form onSubmit={event => { event.preventDefault(); if (success.trim()) setStage("steps"); }}>
        <p className="cycle-guide-note">Your direction: <strong>{focus}</strong></p><h2 ref={heading} tabIndex={-1}>What would noticeably improve in two weeks?</h2><p>Choose a small sign of progress you would recognize. You don&apos;t have to solve everything in one Cycle.</p>
        <label className="cycle-guide-field">I&apos;ll know this is helping when…<input value={success} onChange={event => setSuccess(event.target.value)} maxLength={600} required  /></label>
        <div className="cycle-guide-actions"><button className="button" disabled={!success.trim()}>Help me choose my steps</button><button className="button secondary" type="button" onClick={() => setStage("choose")}>Back</button></div>
      </form>}
      {stage === "steps" && <>
        <p className="cycle-guide-note">Your direction: <strong>{focus}</strong><br />What success looks like: {success}</p><h2 ref={heading} tabIndex={-1}>Let&apos;s make the first step doable.</h2><p>Here&apos;s a starting suggestion. Keep it, make it more specific, or replace it. One useful action is enough; add up to three if that is realistic.</p>
        <ol className="cycle-guide-step-list">{steps.map((step, index) => <li key={index}><div className="cycle-guide-step-body">{editingStep === index ? <label className="cycle-guide-field">Step {index + 1}<input autoFocus value={step} onChange={event => setSteps(current => current.map((value, position) => position === index ? event.target.value : value))} maxLength={500} placeholder="A concrete action I can do today" /><button className="cycle-guide-text" type="button" disabled={!step.trim()} onClick={() => setEditingStep(null)}>Keep this step</button></label> : <p>{step || "Choose your next small action"}</p>}<div className="cycle-guide-mini-actions"><button className="cycle-guide-text" onClick={() => setEditingStep(index)}>Edit</button><button className="cycle-guide-text" onClick={() => { const options = suggestions[resolveAreaKey(pillar, focus) ?? ""] ?? ["Protect a 10-minute window today and use it for one small action toward your priority."]; const next = options.find(option => !steps.includes(option)); setSteps(current => current.map((value, position) => position === index ? next ?? "" : value)); if (!next) setEditingStep(index); }}>Try another idea</button>{steps.length > 1 && <button className="cycle-guide-text" onClick={() => { setSteps(current => current.filter((_, position) => position !== index)); setEditingStep(null); }}>Remove step {index + 1}</button>}</div></div></li>)}</ol>
        {steps.length < 3 && <button className="button secondary" onClick={() => { setEditingStep(steps.length); setSteps(current => [...current, ""]); }}>Add a step · {steps.length}/3</button>}
        <div className="cycle-guide-actions"><button className="button" disabled={!steps.length || steps.some(step => !step.trim())} onClick={() => { setEditingStep(null); setStage("commitment"); }}>Use these steps</button><button className="button secondary" onClick={() => setStage("success")}>Adjust my outcome</button><button className="cycle-guide-text" onClick={() => setStage("choose")}>Change direction</button></div>
      </>}
      {stage === "commitment" && <>
        <h2 ref={heading} tabIndex={-1}>A plan for real life.</h2><p>We&apos;ll work toward <strong>{success}</strong> over the next 14 days. If something gets in the way, we&apos;ll adjust the next step.</p>
        <PersonalCommitment rule={rule} customRule={customRule} reward={reward} disabled={pending} onChange={values => { setRule(values.rule); setCustomRule(values.customRule); setReward(values.reward); }} />
        <div className="cycle-guide-context"><p className="eyebrow">Your 14-day Architect Cycle</p><h3>{focus}</h3><ol>{steps.map((step, index) => <li key={index}>{step}</li>)}</ol><p>{context.daily ? "Your saved plan for today stays in place. Your new Cycle will guide the next step you choose." : "These steps will be ready in Today's Plan as soon as you begin."}</p></div>
        <div className="cycle-guide-actions"><button className="button" disabled={pending} onClick={() => void startCycle()}>{pending ? "Starting your Cycle…" : "Begin my Cycle & open Today's Plan"}</button><button className="button secondary" disabled={pending} onClick={() => setStage("steps")}>Adjust my steps</button></div>
      </>}
    </>}
    <div className="cycle-guide-footer"><KaiPrompt prompt={cycle ? `Help me take a practical next step in my current Architect Cycle: ${cycle.focus}.` : focus ? `Help me choose a realistic small action toward ${focus}. My desired progress is ${success || "still being decided"}.` : "Help me choose a realistic first Architect Cycle from my saved Blueprint and goals."}>Talk this through with Kai</KaiPrompt><Link href="/orientation">How BYNV works</Link></div>
  </section>;
}
