"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { changeExperience, loadExperience, type Experience } from "@/lib/experience";
import { KaiAvatar } from "./kai-avatar";
import "./cycle-guide.css";

const orientationSteps = [
  { title: "See where you're starting.", text: "Your Blueprint brings your assessment together: what's working, where there's room to grow, and possible first actions. It's a starting point you can build from.", label: "Your Blueprint", next: "How do I choose a direction?" },
  { title: "You choose what matters next.", text: "Kai can suggest a starting point from your Blueprint. You can choose it, use a goal you've already saved, or pick something more important to you right now.", label: "Your choice", next: "How does that become a plan?" },
  { title: "Build one realistic Cycle with Kai.", text: "Decide what meaningful progress would look like over the next 14 days. Kai suggests small steps, and you accept or adjust them until the plan fits your life.", label: "Your Architect Cycle", next: "What do I do each day?" },
  { title: "Take one useful step today.", text: "Today's Plan holds your priority and one to three realistic actions. Open it, see what matters now, and take the next step. Your saved Cycle helps you continue tomorrow.", label: "Today's Plan", next: "What if life gets in the way?" },
  { title: "Check in. Then adjust.", text: "Choose Got it done, Made progress, or Didn't happen. If an action slips, Kai helps you keep it, shrink it, reschedule it, or try another approach. A note is always optional.", label: "Accountability that helps", next: "How will I see progress?" },
  { title: "See your progress. Build again.", text: "Completed actions, Build Streaks, and Cycle reviews show the work you're doing. At the end of a Cycle, compare what you hoped for with what changed, then choose your next direction.", label: "Your next version", next: "Let's build my first Cycle" },
];

// An approved video can be supplied later without changing the walkthrough or autoplaying audio.
export function Orientation({ video }: { video?: { src: string; captions: string; poster?: string } }) {
  const router = useRouter();
  const [context, setContext] = useState<Experience | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [step, setStep] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const refresh = useCallback(async () => {
    setLoading(true); setMessage("");
    try { setContext(await loadExperience()); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Your Blueprint could not be loaded. Please try again."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => { if (!loading) heading.current?.focus(); }, [step, loading]);

  async function finish() {
    if (pending || !context) return;
    setPending(true); setMessage("");
    try {
      await changeExperience({ action: "orientation", timezone: Intl.DateTimeFormat().resolvedOptions().timeZone });
      router.push(context.cycle ? "/daily-focus" : "/architect-cycle"); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Your place could not be saved. Please try again."); setPending(false); }
  }

  if (loading) return <section className="orientation-guide"><p role="status">Loading your Blueprint…</p></section>;
  if (!context) return <section className="orientation-guide"><p role="alert">{message}</p><button className="button" onClick={() => void refresh()}>Try again</button></section>;
  if (!context.assessmentComplete) return <section className="orientation-guide"><KaiAvatar /><h2>First, let&apos;s build your Blueprint.</h2><p>Finish your Architect Assessment, then we&apos;ll turn what you learn into a practical first plan.</p><Link className="button" href="/architect-assessment">Continue my assessment</Link></section>;
  const current = orientationSteps[step];
  return <section className="orientation-guide" aria-busy={pending}>
    <div className="cycle-guide-kai"><KaiAvatar /><div><p className="eyebrow">Kai · Welcome, {context.name}</p><p>{context.orientationComplete ? "A quick refresher. Your saved work is ready when you are." : "Your Blueprint is ready. Here's how we put it to work."}</p></div></div>
    {video && <details className="cycle-guide-details"><summary>Watch the short introduction</summary><video controls playsInline preload="metadata" poster={video.poster}><source src={video.src} type="video/mp4" /><track kind="captions" src={video.captions} srcLang="en" label="English" default />Your browser does not support this video. The complete introduction is available in the steps below.</video></details>}
    <progress value={step + 1} max={orientationSteps.length} aria-label={`Orientation step ${step + 1} of ${orientationSteps.length}`} />
    <p className="eyebrow">{step + 1} / {orientationSteps.length} · {current.label}</p>
    <h2 ref={heading} tabIndex={-1}>{current.title}</h2><p>{current.text}</p>
    <div className="orientation-guide-visual">
      {step === 0 && <>{context.score !== null && <><span>Your starting Version Score</span><strong>{context.score} / 100</strong></>}{context.strengths[0] && <div className="orientation-guide-area"><span>Your strongest area</span><strong>{context.strengths[0].label}</strong></div>}{context.priorities[0] && <div className="orientation-guide-area"><span>Your biggest opportunity</span><strong>{context.priorities[0].label}</strong></div>}<span>A useful starting point. You decide what to do with it.</span></>}
      {step === 1 && <><span>You can start with</span><strong>{context.cycle?.focus || context.priorities[0]?.label || "The change that matters most to you"}</strong><span>{context.cycle ? "Your current Cycle is already saved. This walkthrough keeps it in place." : "Or choose another goal or area of your life. Your results guide the conversation; you choose the priority."}</span></>}
      {step === 2 && <><span>One direction · 14 days · small, concrete steps</span><strong>What would feel meaningfully different in two weeks?</strong><span>We&apos;ll build around your answer, with room to adjust.</span></>}
      {step === 3 && <><span>{context.daily?.priority ? "Your saved priority" : "Example of a useful first step"}</span><strong>{context.daily?.priority || "Clear the space I need to focus"}</strong><span>{context.daily?.action || "Spend 10 minutes preparing one surface for tomorrow's important task."}</span></>}
      {step === 4 && <><div className="orientation-guide-checks"><span>Got it done</span><span>Made progress</span><span>Didn&apos;t happen</span></div><strong>“What got in the way?”</strong><span>Then choose: keep the step, make it smaller, move it, or change the approach.</span></>}
      {step === 5 && <><strong>See → Choose → Build → Act</strong><strong>Check in → Adjust → Progress → Evolve</strong><span>You always have a next step, and you can see the work behind it.</span></>}
    </div>
    {message && <p className="cycle-guide-message" role="alert">{message}</p>}
    <div className="cycle-guide-actions"><button className="button" disabled={pending} onClick={() => step < orientationSteps.length - 1 ? setStep(step + 1) : void finish()}>{pending ? "Saving your place…" : step === orientationSteps.length - 1 ? context.cycle ? "Continue Today's Plan" : context.cycles.length ? "Build my next Cycle" : current.next : current.next}</button>{step > 0 && <button className="button secondary" disabled={pending} onClick={() => setStep(step - 1)}>Back</button>}</div>
    {context.orientationComplete && <Link href="/dashboard">Return to my dashboard</Link>}
  </section>;
}
