"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { changeExperience, loadExperience, type Experience } from "@/lib/experience";
import { blankReset, resetDay, resetQuestions } from "@/lib/next-version-reset";
import { buildKaiSafetyResponse } from "@/lib/kai-guided";
import { KaiAvatar } from "./kai-avatar";
import "./member-command-center.css";
import "./next-version-reset.css";
export function NextVersionReset({ initial }: { initial: Experience }) {
  const [answers, setAnswers] = useState(blankReset), [step, setStep] = useState(0), [deeper, setDeeper] = useState(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [saved, setSaved] = useState<Record<string, string>>({}), [safety, setSafety] = useState("");
  const ids = useRef<Record<string, string>>({}), heading = useRef<HTMLHeadingElement>(null);
  const [locked, setLocked] = useState(false);
  const q = resetQuestions[step], review = step === resetQuestions.length;
  useEffect(() => { heading.current?.focus(); }, [step, safety]);
  useEffect(() => {
    if (!Object.values(answers).some(Boolean) || saved.journal) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn);
  }, [answers, saved.journal]);
  function advance(skip = false) {
    const response = buildKaiSafetyResponse(skip ? "" : answers[q.key], Object.values(answers));
    if (response) { setSafety(response.answer); return; }
    if (skip) setAnswers(old => ({ ...old, [q.key]: "" }));
    setStep(step === 0 && !deeper ? 5 : step + 1); setError("");
  }
  async function save(kind: "journal" | "goal" | "today") {
    if (busy) return;
    setBusy(true); setError(""); setLocked(true);
    const id = ids.current[kind] ||= crypto.randomUUID();
    try {
      if (kind === "today") {
        const latest = await loadExperience();
        if (latest.today !== initial.today) throw new Error("A new day has started. Open Today’s Plan before adding this action.");
        const payload = resetDay(latest, answers, id); if (payload) await changeExperience(payload);
      } else {
        const response = await fetch("/api/account/reset", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, id, answers: kind === "goal" ? { ...blankReset(), direction: answers.direction, change: answers.change, action: answers.action } : answers }) });
        const result = await response.json(); if (!response.ok) throw new Error(result.error || "Your Reset could not be saved.");
        window.dispatchEvent(new Event("bynv:journey-changed"));
      }
      setSaved(old => ({ ...old, [kind]: id }));
    } catch (e) { setError(e instanceof Error ? e.message : "Please try again."); }
    finally { setBusy(false); }
  }
  return <div className="container command-center reset-center">
    <header className="command-heading"><div><p className="eyebrow">Next Version Reset · Guided Kai</p><h1>Find your next honest step.</h1><p>A short conversation to notice what matters and choose one useful move.<br/>You decide how deep to go and what to save.</p></div></header>
    <section className="command-kai"><KaiAvatar /><div>
      {safety ? <><h2 ref={heading} tabIndex={-1}>Let’s pause and connect with support.</h2><p role="alert">{safety}</p><a className="button" href="https://988lifeline.org/">Call, text, or chat with 988</a></> : review ? <>
        <p className="eyebrow">Your words · Your choice</p><h2 ref={heading} tabIndex={-1}>Here’s what I heard.</h2>
        <p>I’ve gathered your answers below. You can choose a next step without having everything figured out.</p>
        <div className="reset-summary">{resetQuestions.filter(item => answers[item.key]).map(item => <div key={item.key}><strong>{item.label}</strong><p>{answers[item.key]}</p></div>)}</div>
        {!locked && <button className="button secondary" onClick={() => { setStep(0); setDeeper(true); }}>Edit my answers</button>}
        <p className="command-small">The full summary goes only to Journal if you save it. A new goal contains your direction and how you’ll notice change. Today’s Plan receives only your action and, for a new plan, your direction.</p>
        <div className="button-row">
          <button className="button secondary" disabled={busy || !!saved.journal} onClick={() => void save("journal")}>{saved.journal ? "Saved to Journal" : "Save summary privately to Journal"}</button>
          <button className="button" disabled={busy || !!saved.today} onClick={() => void save("today")}>{saved.today ? "Action added" : "Add my action to Today’s Plan"}</button>
          <button className="button secondary" disabled={busy || !!saved.goal} onClick={() => void save("goal")}>{saved.goal ? "Goal saved" : "Save direction as a new goal"}</button>
        </div>
        {saved.goal && <p><Link className="command-link" href={`/architect-cycle?goal=${saved.goal}`}>{initial.cycle ? "Review my current Cycle before choosing another" : "Build a 14-day Cycle from this goal"}</Link></p>}
        {initial.cycle && <p><Link className="command-link" href="/architect-cycle">Continue my existing Cycle: {initial.cycle.focus}</Link></p>}
        <nav className="button-row" aria-label="Continue from my Reset"><Link href="/daily-focus">Today’s Plan</Link><Link href="/momentum">See my Momentum</Link><Link href="/journal">My Journal</Link><Link href="/challenges">Explore an optional challenge</Link></nav>
        <p role="status">{busy ? "Saving your choice…" : Object.keys(saved).length ? "Your chosen changes are saved. Check in after your action to see it in Momentum." : "Nothing has been saved yet."}</p>
        {locked && <p className="command-small">Ready to explore a different direction? Start a new Reset.</p>}
        <button className="command-link" disabled={busy} onClick={() => { setAnswers(blankReset()); setSaved({}); ids.current = {}; setLocked(false); setStep(0); setDeeper(false); setError(""); }}>Start a new Reset</button>
      </> : <form onSubmit={e => { e.preventDefault(); advance(); }}>
        <p className="eyebrow">{q.optional ? "Optional reflection" : "Your choice"}</p><h2 ref={heading} tabIndex={-1}><label htmlFor="reset-answer">{q.label}</label></h2>
        {step === 0 && <>
          {initial.cycle && <button type="button" className="button secondary" onClick={() => setAnswers(old => ({ ...old, direction: initial.cycle!.focus.slice(0,160), change: (initial.cycle!.success_vision ?? "").slice(0,600) }))}>Stay with my Cycle: {initial.cycle.focus}</button>}
          {initial.goals.filter(g => g.status === "active").slice(0,3).map(g => <button type="button" className="button secondary" key={g.id} onClick={() => setAnswers(old => ({ ...old, direction: g.title.slice(0,160), change: (g.success_vision ?? "").slice(0,600) }))}>Reflect on: {g.title}</button>)}
          <details><summary>Help me find a starting point</summary><p>This could involve health, work, relationships, organization, money habits, confidence, finishing something you’ve delayed, or something completely different.</p></details>
        </>}
        {step > 0 && <p className="reset-context">You’re exploring: {answers.direction}</p>}
        {step === 5 && answers.pattern && <p>You noticed: “{answers.pattern}”. What would be different if that pattern loosened?</p>}
        {step === 6 && <p>{answers.fear ? "Given the worry you named, choose a step that feels manageable and within your control." : "Choose something you can actually do, rather than an outcome you cannot control."}</p>}
        {step === 6 && initial.cycle && answers.direction === initial.cycle.focus.slice(0,160) && initial.cycle.plan_steps.length > 0 && <details><summary>Use a step from my current Cycle</summary>{initial.cycle.plan_steps.slice(0,3).map((action,index) => <button key={index} type="button" className="button secondary" onClick={() => setAnswers(old => ({ ...old, action: action.slice(0,600) }))}>{action}</button>)}</details>}
        <textarea id="reset-answer" rows={3} maxLength={q.key === "direction" ? 160 : 600} required={!q.optional} value={answers[q.key]} onChange={e => setAnswers(old => ({ ...old, [q.key]: e.target.value }))} />
        {step === 0 && <label className="reset-choice"><input type="checkbox" checked={deeper} onChange={e => { setDeeper(e.target.checked); if (!e.target.checked) setAnswers(old => ({ ...old, pattern: "", avoidance: "", identity: "", fear: "" })); }} /> I’d like to explore patterns, expectations, and worries first.</label>}
        <div className="button-row"><button className="button" disabled={!q.optional && !answers[q.key].trim()}>{step === 6 ? "Review my summary" : "Continue"}</button>{q.optional && <button className="button secondary" type="button" onClick={() => advance(true)}>Skip this question</button>}{step > 0 && <button className="command-link" type="button" onClick={() => setStep(step === 5 && !deeper ? 0 : step - 1)}>Back</button>}</div>
      </form>}
      {error && <p role="alert" className="form-error">{error}</p>}
    </div></section>
    <p className="command-small">This is personal reflection with Guided Kai, not therapy or diagnosis. Unsaved answers stay in this page’s memory and disappear when you leave.</p>
    <Link className="command-link" href="/dashboard">Return to my dashboard</Link>
  </div>;
}
