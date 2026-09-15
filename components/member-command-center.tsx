"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { loadExperience, entrySteps, momentum, type Experience } from "@/lib/experience";
import { nextExperienceStep } from "@/lib/experience-guidance";
import { cycleProgress } from "@/lib/journey";
import { KaiAvatar } from "./kai-avatar";
import { KaiPrompt } from "./kai-prompt";
import "./member-command-center.css";
export function MemberCommandCenter({ initial, owner }: { initial: Experience; owner: boolean }) {
  const [state, setState] = useState(initial), [error, setError] = useState("");
  useEffect(() => {
    let alive = true, version = 0;
    const refresh = () => { const request = ++version; void loadExperience().then(data => { if (alive && request === version) { setState(data); setError(""); } }).catch(() => { if (alive && request === version) setError("Your latest changes couldn’t be loaded. Refresh to try again."); }); };
    const visible = () => { if (document.visibilityState === "visible") refresh(); };
    window.addEventListener("bynv:journey-changed", refresh); document.addEventListener("visibilitychange", visible);
    const timer = window.setInterval(visible, 60000);
    return () => { alive = false; window.clearInterval(timer); window.removeEventListener("bynv:journey-changed", refresh); document.removeEventListener("visibilitychange", visible); };
  }, []);
  const next = nextExperienceStep(state), stats = momentum(state.recent, state.today), steps = entrySteps(state.daily);
  const cycle = state.cycle, days = cycle ? cycleProgress(cycle.starts_on, cycle.ends_on, state.today) : null;
  const cycleActions = cycle ? state.recent.filter(e => e.focus_date >= cycle.starts_on && e.focus_date <= cycle.ends_on && (!e.cycle_id || e.cycle_id === cycle.id)).reduce((n,e)=>n+entrySteps(e).filter(s=>s.done).length,0) : 0;
  const activeGoals = state.goals.filter(g => g.status === "active");
  return <div className="command-center container">
    <header className="command-heading"><div><p className="eyebrow">My BYNV</p><h1>Your next move.</h1></div><p><time dateTime={state.today}>{new Date(`${state.today}T12:00:00Z`).toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",timeZone:"UTC"})}</time></p></header>
    {error && <p className="form-error" role="alert">{error}</p>}
    <section className="command-kai" aria-labelledby="kai-next-title"><KaiAvatar /><div><p className="eyebrow">Kai · Keep Advancing Intentionally</p><h2 id="kai-next-title">{next.greeting}</h2><p>{next.message}</p><div className="button-row"><Link className="button" href={next.href}>{next.label}</Link><KaiPrompt prompt="Use my saved Cycle, today's steps and recent check-ins to help me choose one useful next move.">Talk it through with Kai</KaiPrompt></div></div></section>
    <div className="command-main">
      <section className="command-panel" aria-labelledby="current-cycle-title"><p className="eyebrow">Current Architect Cycle</p><h2 id="current-cycle-title">{cycle?.focus || "Choose what you’re building next."}</h2>{cycle && days ? <><p>{cycle.success_vision || "Your chosen focus for this Cycle."}</p><div className="command-cycle-numbers"><strong>Day {days.day} <span>of {days.total}</span></strong><strong>{cycleActions} <span>actions completed</span></strong></div><progress value={days.day} max={days.total} aria-label="Calendar days through this Cycle"/><p className="command-small">{days.reviewDue ? "Ready to review what changed." : `Through ${cycle.ends_on}. Calendar progress is separate from completed actions.`}</p><Link className="command-link" href="/architect-cycle">{days.reviewDue ? "Review my Cycle" : "View my direction"}</Link></> : <><p>Kai will help you turn one priority into a realistic 14-day plan.</p><Link className="command-link" href={state.assessmentComplete ? "/architect-cycle" : "/architect-assessment"}>{state.assessmentComplete ? "Build a Cycle with Kai" : "Find my starting point"}</Link></>}</section>
      <section className="command-panel" aria-labelledby="todays-plan-title"><p className="eyebrow">Today’s Plan</p><h2 id="todays-plan-title">{state.daily?.priority || cycle?.focus || "A few meaningful actions."}</h2>{steps.length ? <ul className="command-steps">{steps.map(s=><li key={s.id}><span aria-label={s.done ? "Completed" : "Still to do"}>{s.done ? "✓" : "○"}</span><span>{s.text}</span></li>)}</ul> : <p>{cycle?.plan_steps[0] || "Choose one small step. You can add up to three when that fits your day."}</p>}<Link className="command-link" href="/daily-focus">{state.daily?.completed ? "View today’s check-in" : "Open Today’s Plan"}</Link></section>
    </div>
    <section className="command-momentum" aria-label="Your momentum"><div><p className="eyebrow">Momentum</p><h2>Every useful action counts.</h2></div><div><strong>{stats.thisWeek}</strong><span>actions · last 7 days</span></div><div><strong>{stats.streak}</strong><span>day Build Streak</span></div><div><strong>{state.cycles.filter(c=>c.status==="completed").length}</strong><span>Cycles completed</span></div><Link className="command-link" href="/progress">See my progress</Link></section>
    {activeGoals.length > 0 && <section className="command-panel command-goals"><p className="eyebrow">What you’re working toward</p>{activeGoals.slice(0,3).map(goal=><Link key={goal.id} href="/goals"><strong>{goal.title}</strong><span>{goal.advanced_at ? "Progress recorded" : goal.success_vision || "Active goal"}</span></Link>)}</section>}
    <section className="command-support"><h2>Your supporting tools</h2><nav aria-label="Member tools">{[["/blueprint","My Blueprint"],["/goals","Goals"],["/journal","Journal"],["/challenges","Challenges"],["/community","Community"],["/resources","Architect Library"],["/orientation","How BYNV works"],["/account","My account"]].map(([href,label])=><Link key={href} href={href}>{label}</Link>)}{owner && <Link href="/coaching">Coaching · Owner QA</Link>}</nav></section>
  </div>;
}
