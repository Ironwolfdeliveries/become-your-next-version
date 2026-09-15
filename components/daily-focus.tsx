"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import {
  addDays, changeExperience, commitmentRules, entryStatus, entrySteps,
  loadExperience, momentum,
  type CheckIn, type DailyEntry, type Experience, type PlanStep, type Recovery,
} from "@/lib/experience";
import { AILeverageAudit } from "./ai-leverage-audit";
import { KaiAvatar } from "./kai-avatar";
import { KaiPrompt } from "./kai-prompt";
import "./todays-plan.css";

const newStep = (text = ""): PlanStep => ({ id: crypto.randomUUID(), text, done: false });
const clean = (value: string) => value.trim().toLocaleLowerCase();
function readableDate(date: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
}

function recommendation(experience: Experience, selectedPriority: string) {
  const cycle = experience.cycle;
  const goal = experience.goals.find(item => item.status === "active");
  const area = experience.priorities[0];
  const defaultPriority = cycle?.focus || goal?.title || area?.label || "Make room for what matters today";
  const priority = (selectedPriority.trim() || defaultPriority).slice(0, 200);
  let source = "A small start for your priority";
  let actions: string[] = [];
  if (cycle && clean(priority) === clean(cycle.focus.slice(0, 200))) {
    source = "From your current Architect Cycle";
    const completedActions = new Set(experience.recent.filter(entry => entry.cycle_id === cycle.id)
      .flatMap(entry => entrySteps(entry).filter(step => step.done).map(step => clean(step.text))));
    const cycleActions = cycle.plan_steps?.filter(Boolean) || [];
    actions = cycleActions.filter(action => !completedActions.has(clean(action))).slice(0, 3);
    if (cycleActions.length && !actions.length) actions = [`Review what changed in “${cycle.focus}” and choose one useful next step for the rest of this Cycle.`];
  } else {
    const matchingGoal = experience.goals.find(item => item.status === "active" && clean(item.title.slice(0, 200)) === clean(priority));
    if (matchingGoal) {
      source = "From your active goal";
      actions = [`Spend 10 minutes taking one small step toward “${matchingGoal.title}”.`];
    } else if (area && clean(priority) === clean(area.label)) {
      source = "A starting point from your Blueprint";
      actions = experience.firstActions.filter(item => item.key === area.key).map(item => item.action).slice(0, 3);
    }
  }
  if (!actions.length) actions = [`Set aside 10 minutes for “${priority}” and complete the smallest useful first step.`];
  return { priority, source, actions };
}

function RecoveryCard({ entry, experience, disabled, hasUnsavedChanges, onRecovered, onPending }: {
  entry: DailyEntry; experience: Experience; disabled: boolean; hasUnsavedChanges: boolean; onRecovered: () => Promise<void>; onPending: (pending: boolean) => void;
}) {
  const original = entrySteps(entry).filter(step => !step.done).map(step => step.text).join("; ");
  const [strategy, setStrategy] = useState<Recovery["strategy"] | null>(null);
  const [nextAction, setNextAction] = useState(original.slice(0, 1000));
  const [nextDate, setNextDate] = useState(entry.focus_date === experience.today ? addDays(experience.today, 1) : experience.today);
  const [blocker, setBlocker] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const lock = useRef(false);
  const rule = commitmentRules.find(item => item.key === (experience.cycles.find(cycle => cycle.id === entry.cycle_id)?.commitment_rule));
  function choose(next: Recovery["strategy"]) {
    setStrategy(next); setMessage("");
    setNextAction(next === "replace" ? "" : next === "shrink" ? `Spend just 5 minutes starting: ${original}`.slice(0, 1000) : original.slice(0, 1000));
    if (next === "reschedule") setNextDate(addDays(experience.today, 1));
  }
  async function recover(event: FormEvent) {
    event.preventDefault();
    if (!strategy || disabled || lock.current || !nextAction.trim()) return;
    lock.current = true; setPending(true); onPending(true); setMessage("Saving your next step…");
    try {
      await changeExperience({ action: "recover", entry_id: entry.id, strategy, next_date: nextDate,
        next_action: nextAction.trim(), blocker: blocker.trim() || undefined, expected_updated_at: entry.updated_at });
      setMessage("Your next step is saved. Updating your plan…");
      await onRecovered();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Your next step could not be saved. Please try again.");
    } finally { setPending(false); onPending(false); lock.current = false; }
  }
  return <article className="today-recovery-card">
    <p className="eyebrow">{entry.focus_date === experience.today ? "Let’s adjust" : `Still open · ${readableDate(entry.focus_date)}`}</p>
    <h3>{entry.priority || "One commitment to return to"}</h3>
    <ul>{entrySteps(entry).filter(step => !step.done).map(step => <li key={step.id}>{step.text}</li>)}</ul>
    {entry.reflection && <details className="today-details"><summary>Your saved note</summary><p className="today-preserved-note">{entry.reflection}</p></details>}
    <p className="today-muted">{entryStatus(entry) === "progress" ? "You made progress. Let’s give the remaining step a clear next move." : "We can work with what happened. What would help you move forward?"}</p>
    {rule && <p className="today-rule">Your commitment rule: {rule.label}.</p>}
    <div className="today-recovery-choices" role="group" aria-label={`Adjust your ${readableDate(entry.focus_date)} action`}>
      {([ ["keep", "Keep the action"], ["shrink", "Make it smaller"], ["reschedule", "Reschedule it"], ["replace", "Another approach"] ] as const).map(([key, label]) =>
        <button type="button" key={key} aria-pressed={strategy === key} disabled={disabled || pending} onClick={() => choose(key)}>{label}</button>)}
    </div>
    {hasUnsavedChanges && <p className="field-help">Save your changes to today’s plan before adjusting an earlier commitment.</p>}
    {strategy && <form className="today-recovery-form" onSubmit={recover}>
      <label>Next action<textarea value={nextAction} onChange={event => setNextAction(event.target.value)} maxLength={1000} rows={2} required disabled={pending || disabled} placeholder="What is one different, doable step?" /></label>
      <label>When will you take it?<input type="date" min={experience.today} value={nextDate} onChange={event => setNextDate(event.target.value)} required disabled={pending || disabled} /></label>
      <details className="today-details"><summary>What got in the way? <span>Optional</span></summary><label><span className="sr-only">What got in the way?</span><textarea value={blocker} onChange={event => setBlocker(event.target.value)} maxLength={1000} rows={2} disabled={pending || disabled} placeholder="Time, energy, unclear next step…" /></label></details>
      <p className="field-help">This gives this day’s unfinished plan one next move. All original steps stay in your history. The next move is added to the day you choose.</p>
      <button className="button" disabled={disabled || pending || !nextAction.trim()}>{pending ? "Saving…" : "Save my next step"}</button>
    </form>}
    <p className="form-message" role="status">{message}</p>
  </article>;
}

export function DailyFocus() {
  const [experience, setExperience] = useState<Experience | null>(null);
  const [priority, setPriority] = useState("");
  const [steps, setSteps] = useState<PlanStep[]>([]);
  const [checkIn, setCheckIn] = useState<CheckIn | null>(null);
  const [reflection, setReflection] = useState("");
  const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [syncNeeded, setSyncNeeded] = useState(false);
  const [editPriority, setEditPriority] = useState(false);
  const [editingStep, setEditingStep] = useState<string | null>(null);
  const [showSuggestion, setShowSuggestion] = useState(false);
  const priorityRef = useRef<HTMLInputElement>(null);
  const lock = useRef(false);
  const load = useCallback(async () => {
    const data = await loadExperience();
    setExperience(data); setPriority(data.daily?.priority || ""); setSteps(entrySteps(data.daily));
    setCheckIn(entryStatus(data.daily)); setReflection(data.daily?.reflection || "");
    setDirty(false); setSyncNeeded(false); setLoadError("");
  }, []);
  useEffect(() => { let active = true; void load().catch(error => { if (active) setLoadError(error instanceof Error ? error.message : "Your plan could not be loaded."); }); return () => { active = false; }; }, [load]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function changed() { setDirty(true); setMessage(""); setIsError(false); }
  async function refreshSaved() {
    if (lock.current) return;
    lock.current = true; setPending(true); setMessage("Loading your saved plan…"); setIsError(false);
    try { await load(); setMessage("Your saved plan is up to date."); }
    catch (error) { setIsError(true); setMessage(error instanceof Error ? error.message : "Your saved plan could not be loaded."); }
    finally { setPending(false); lock.current = false; }
  }
  async function save(nextSteps = steps, nextCheckIn = checkIn, nextPriority = priority) {
    if (!experience || lock.current || syncNeeded) return;
    const normalized = nextSteps.map(step => ({ ...step, text: step.text.trim() }));
    if (!nextPriority.trim() || !normalized.length || normalized.some(step => !step.text)) {
      setIsError(true); setMessage("Choose a priority and at least one concrete step. Remove any empty extra steps."); return;
    }
    lock.current = true; setPending(true); setMessage("Saving your plan…"); setIsError(false);
    setSteps(nextSteps); setPriority(nextPriority); setCheckIn(nextCheckIn); setDirty(true);
    let saved = false;
    try {
      await changeExperience({ action: "save-day", date: experience.today, priority: nextPriority.trim(), steps: normalized,
        check_in: nextCheckIn, reflection, expected_updated_at: experience.daily?.updated_at || null, cycle_id: experience.cycle?.id || experience.daily?.cycle_id || null });
      saved = true; setSyncNeeded(true); await load(); setEditPriority(false); setEditingStep(null); setShowSuggestion(false);
      setMessage(nextCheckIn === "done" ? "Saved. Today’s plan is complete — you can call today done." : nextCheckIn === "progress" ? "Progress saved. Let’s make the remaining step work for you." : nextCheckIn === "missed" ? "Check-in saved. Choose a smaller step or a better time below." : "Your plan is saved. One useful step at a time.");
    } catch (error) {
      setIsError(true);
      setMessage(saved ? "Your change was saved, but the updated plan could not be loaded. Reload your saved plan before making another change." : error instanceof Error ? error.message : "Your plan could not be saved. Your edits are still here.");
    } finally { setPending(false); lock.current = false; }
  }
  async function afterRecovery() {
    setSyncNeeded(true);
    try { await load(); setMessage("Your next step is saved. Your original commitment remains in your history."); setIsError(false); }
    catch { setIsError(true); setMessage("Your next step was saved. Reload your saved plan to see the update before making another change."); }
  }
  function customize() {
    if (!steps.length) setSteps([newStep()]);
    setEditPriority(true); setShowSuggestion(false); changed();
    setTimeout(() => priorityRef.current?.focus(), 0);
  }
  if (!experience) return <section className="todays-plan today-loading" aria-busy={!loadError}>
    <KaiAvatar className="today-kai-avatar" /><h2>Let’s find your next step.</h2>
    <p role={loadError ? "alert" : "status"}>{loadError || "Kai is bringing together your saved plan, Cycle, and progress…"}</p>
    {loadError && <button className="button" onClick={() => { setLoadError(""); void load().catch(error => setLoadError(error instanceof Error ? error.message : "Your plan could not be loaded.")); }}>Try again</button>}
  </section>;
  const suggested = recommendation(experience, priority);
  const stats = momentum(experience.recent, experience.today);
  const completedCount = steps.filter(step => step.done).length;
  const savedCheckIn = entryStatus(experience.daily);
  const todayRecovery = experience.daily && !experience.daily.recovery && (savedCheckIn === "missed" || savedCheckIn === "progress") && entrySteps(experience.daily).some(step => !step.done) ? experience.daily : null;
  const unresolved = [...experience.unresolved].filter(entry => entry.focus_date !== experience.today).sort((a, b) => a.focus_date.localeCompare(b.focus_date));
  const greeting = savedCheckIn === "done" ? `${experience.name}, today’s plan is complete.`
    : todayRecovery ? `${experience.name}, let’s make your next step doable.`
    : unresolved.length ? `${experience.name}, you can continue from here.`
    : experience.daily ? `${experience.name}, your next step is ready.` : `${experience.name}, what would make today count?`;
  const disabled = pending || syncNeeded;
  return <div className="todays-plan">
    <section className="today-kai" aria-labelledby="today-kai-title">
      <KaiAvatar className="today-kai-avatar" />
      <div><p className="eyebrow">Kai · {readableDate(experience.today)}</p><h2 id="today-kai-title">{greeting}</h2>
        <p>{savedCheckIn === "done" ? `You’ve completed ${stats.thisWeek} ${stats.thisWeek === 1 ? "action" : "actions"} in the last seven days. Give that progress room to count.`
          : todayRecovery ? "A missed step is useful information. We can keep it, make it smaller, move it, or try another approach."
          : unresolved.length ? "An earlier action is still open below. We’ll give it a next move, and keep today manageable."
          : experience.cycle ? `You’re building toward “${experience.cycle.focus}”. Let’s take one useful step today.` : "Start with one useful action. You can add up to three if they fit your day."}</p>
        <KaiPrompt prompt="Help me choose or adjust a small, realistic action for today using my saved Cycle, goals, Blueprint, and recent check-ins.">Talk it through with Kai</KaiPrompt>
      </div>
    </section>
    {experience.cycle && <Link className="today-cycle-link" href="/architect-cycle"><span>Current Architect Cycle</span><strong>{experience.cycle.focus}</strong><span>View plan →</span></Link>}
    <section className="today-plan-card" aria-labelledby="today-priority-title" aria-busy={pending}>
      <div className="today-card-heading"><div><p className="eyebrow">Today’s Priority</p><h2 id="today-priority-title">{priority || "What matters most today?"}</h2></div>
        {priority && <button type="button" className="text-button" onClick={() => setEditPriority(value => !value)} disabled={disabled}>{editPriority ? "Close priority editor" : "Change priority"}</button>}
      </div>
      {(editPriority || (steps.length > 0 && !priority)) && <div className="today-priority-editor"><label>What matters most today?<input ref={priorityRef} value={priority} onChange={event => { setPriority(event.target.value); changed(); }} maxLength={200} disabled={disabled} placeholder="Choose a direction that matters to you" /></label>
        {(experience.cycle || experience.goals.some(goal => goal.status === "active")) && <div className="today-priority-choices" role="group" aria-label="Use a priority you already chose">
          {experience.cycle && <button type="button" disabled={disabled} onClick={() => { setPriority(experience.cycle!.focus.slice(0, 200)); setShowSuggestion(true); changed(); }}>Use my Cycle focus</button>}
          {experience.goals.filter(goal => goal.status === "active").slice(0, 3).map(goal => <button key={goal.id} type="button" disabled={disabled} onClick={() => { setPriority(goal.title.slice(0, 200)); setShowSuggestion(true); changed(); }}>{goal.title}</button>)}
        </div>}
      </div>}
      {(!steps.length || showSuggestion) && <div className="today-suggestion"><p className="eyebrow">{suggested.source}</p><h3>{suggested.priority}</h3><ul>{suggested.actions.map((action, index) => <li key={index}>{action}</li>)}</ul>
        <div className="button-row"><button type="button" className="button" disabled={disabled} onClick={() => void save(suggested.actions.map(action => newStep(action)), null, suggested.priority)}>Use this plan</button>
          <button type="button" className="button secondary" disabled={disabled} onClick={customize}>Build my own</button>
          {showSuggestion && steps.length > 0 && <button type="button" className="text-button" onClick={() => setShowSuggestion(false)}>Keep current steps</button>}
        </div>{steps.length > 0 && <p className="field-help">Using this plan replaces the steps shown for today. Earlier days stay in your history.</p>}
      </div>}
      {steps.length > 0 && <><div className="today-steps-heading"><h3>Today’s Steps</h3><span>{completedCount} of {steps.length} complete</span></div>
        <ol className="today-steps">{steps.map((step, index) => <li key={step.id} className={step.done ? "is-complete" : ""}>
          <label className="today-step-check"><input type="checkbox" checked={step.done} disabled={disabled || !step.text.trim()} aria-label={`Mark step ${index + 1} ${step.done ? "incomplete" : "complete"}: ${step.text}`} onChange={() => {
            const next = steps.map(item => item.id === step.id ? { ...item, done: !item.done } : item);
            void save(next, next.every(item => item.done) ? "done" : checkIn === "missed" || checkIn === "progress" ? "progress" : null);
          }} /><span className="sr-only">Step {index + 1}</span></label>
          <div className="today-step-content">{editingStep === step.id || !step.text ? <label><span className="sr-only">Step {index + 1} action</span><textarea autoFocus value={step.text} maxLength={1000} rows={2} disabled={disabled} onChange={event => {
            setSteps(items => items.map(item => item.id === step.id ? { ...item, text: event.target.value, done: false } : item)); setCheckIn(null); changed();
          }} placeholder="Make it specific and doable" /></label> : <p>{step.text}</p>}
            <div className="today-step-controls"><button type="button" disabled={disabled} onClick={() => setEditingStep(editingStep === step.id ? null : step.id)}>{editingStep === step.id ? "Close editor" : "Edit"}<span className="sr-only"> step {index + 1}</span></button>
              <button type="button" disabled={disabled} onClick={() => { setSteps(items => items.map(item => item.id === step.id ? { ...item, text: "", done: false } : item)); setCheckIn(null); setEditingStep(step.id); changed(); }}>Replace<span className="sr-only"> step {index + 1}</span></button>
              {steps.length > 1 && <button type="button" disabled={disabled} onClick={() => { setSteps(items => items.filter(item => item.id !== step.id)); setCheckIn(null); changed(); }}>Remove<span className="sr-only"> step {index + 1}</span></button>}
            </div>
          </div>
        </li>)}</ol>
        <div className="today-add-row">{steps.length < 3 && <button type="button" className="button secondary" disabled={disabled} onClick={() => { const step = newStep(); setSteps(items => [...items, step]); setEditingStep(step.id); setCheckIn(null); changed(); }}>Add a step</button>}
          <button type="button" className="text-button" disabled={disabled} onClick={() => setShowSuggestion(value => !value)}>{showSuggestion ? "Hide suggestion" : "Show Kai’s suggestion"}</button><span className="field-help">One step is enough. Three is the maximum.</span>
        </div>
        <div className="today-save-row"><button type="button" className="button" disabled={disabled || !dirty} onClick={() => void save()}>{pending ? "Saving…" : "Save today’s plan"}</button><span className="field-help">{dirty ? "You have unsaved changes." : "Saved to your account."}</span></div>
        <section className="today-checkin" aria-labelledby="today-checkin-title"><h3 id="today-checkin-title">How did today go?</h3><p>Choose what happened. Your check-in saves right away.</p>
          <div className="today-checkin-choices" role="group" aria-label="Today’s check-in">{([ ["done", "Got it done"], ["progress", "Made progress"], ["missed", "Didn’t happen"] ] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={checkIn === value} disabled={disabled} onClick={() => {
            if (value === "progress" && steps.every(step => step.done)) { setIsError(false); setMessage("All your steps are marked complete. Uncheck any unfinished step, then choose Made progress."); return; }
            const next = value === "done" ? steps.map(step => ({ ...step, done: true })) : value === "missed" ? steps.map(step => ({ ...step, done: false })) : steps;
            void save(next, value);
          }}>{label}</button>)}</div>
          <details className="today-details" open={reflection.length > 0 ? true : undefined}><summary>Want to add a note? <span>Optional</span></summary><label><span className="sr-only">Optional note about today</span><textarea value={reflection} onChange={event => { setReflection(event.target.value); changed(); }} maxLength={2000} rows={2} disabled={disabled} placeholder="A line about what helped or got in the way" /></label><button type="button" className="button secondary" disabled={disabled || !dirty} onClick={() => void save()}>Save note</button></details>
        </section>
      </>}
      <div className="today-save-feedback"><p className={isError ? "form-error" : "form-message"} role={isError ? "alert" : "status"}>{message}</p>
        {(syncNeeded || isError) && <button className="text-button" disabled={pending} type="button" onClick={() => void refreshSaved()}>{dirty && !syncNeeded ? "Discard unsaved edits and reload saved plan" : "Reload saved plan"}</button>}
      </div>
    </section>
    {todayRecovery && <section id="recovery" className="today-recovery" aria-label="Adjust today’s incomplete action"><RecoveryCard key={`${todayRecovery.id}-${todayRecovery.updated_at}`} entry={todayRecovery} experience={experience} disabled={disabled || dirty} hasUnsavedChanges={dirty} onRecovered={afterRecovery} onPending={setPending} /></section>}
    {experience.daily?.recovery && <p className="today-saved-recovery" role="status">Next step saved for {readableDate(experience.daily.recovery.next_date)}: {experience.daily.recovery.next_action}</p>}
    {unresolved.length > 0 && <section id={todayRecovery ? undefined : "recovery"} className="today-recovery" aria-labelledby="open-commitments-title"><div className="today-card-heading"><div><p className="eyebrow">A clear way back</p><h2 id="open-commitments-title">Let’s close the loop.</h2></div><span>{unresolved.length} still open</span></div><p className="today-muted">These saved actions are still here. Choose one next move for each unfinished plan.</p>
      {unresolved.map(entry => <RecoveryCard key={`${entry.id}-${entry.updated_at}`} entry={entry} experience={experience} disabled={disabled || dirty} hasUnsavedChanges={dirty} onRecovered={afterRecovery} onPending={setPending} />)}
    </section>}
    <div className="today-bottom"><Link className="button secondary" href="/dashboard">Back to my dashboard</Link><Link href="/progress">See my progress →</Link></div>
    <details className="today-details today-support"><summary>Want help making room for your next step?</summary><AILeverageAudit priority={priority} action={steps.map(step => step.text).join("; ")} /></details>
  </div>;
}
