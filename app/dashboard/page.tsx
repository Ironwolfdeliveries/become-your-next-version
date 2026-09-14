import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getJourneyContext, getMemberJourney } from "@/lib/member-journey";
import { cycleProgress, nextJourneyAction } from "@/lib/journey";
import { getAccountAccess, isPlatformAdmin } from "@/lib/admin";
import { Button, PageHero } from "@/components/ui";
import { KaiPrompt } from "@/components/kai-prompt";
export const metadata = { title: "My BYNV", description: "Your cycle, today's action, and your next step." };
export const dynamic = "force-dynamic";
export default async function Dashboard() {
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user) redirect("/sign-in");
  const [state, context, access] = await Promise.all([getMemberJourney(), getJourneyContext(user.id), getAccountAccess(user.id)]);
  const next = nextJourneyAction(state); const progress = context.cycle ? cycleProgress(context.cycle.starts_on, context.cycle.ends_on) : null;
  return <><PageHero eyebrow="My BYNV" title={context.cycle ? "Your next version is in motion." : "Your next step, visible."} copy="One priority. One action you can take today. Space to learn and adjust." />
    <section className="container member-dashboard">
      <article className="panel dashboard-primary"><p className="eyebrow">{context.cycle ? "Current Architect Cycle" : state.assessmentComplete ? "Your Blueprint → Your first cycle" : "Architect Assessment"}</p><h2>{context.cycle?.focus || context.priority || next.title}</h2>
        {progress && <><p>Day {progress.day} of {progress.total}{progress.reviewDue ? " · Ready to reflect and review" : ""}</p><progress className="journey-progress" value={progress.day} max={progress.total} aria-label="Cycle progress" /></>}
        <p>{context.daily?.action || context.firstAction || next.copy}</p>
        {context.daily?.completed && <p className="journey-milestone">Today&apos;s action completed. Capture what you learned.</p>}
        <Button href={next.href}>{context.cycle ? "Continue today's work" : next.label}</Button>
        <p className="field-help">{context.cycle ? "Action → completion → reflection. Keep the next step yours." : state.assessmentComplete ? "Begin with a 14-day cycle. Your Blueprint provides a starting focus." : "Your answers save as you go."}</p>
      </article>
      <article className="panel"><p className="eyebrow">Your direction</p><h2>{state.assessmentComplete ? "Your Blueprint" : "Your assessment"}</h2><p>{context.priority || "Complete the full assessment to identify your priorities."}</p><Button href={state.assessmentComplete ? "/blueprint" : "/architect-assessment"} secondary>{state.assessmentComplete ? "Return to my Blueprint" : "Continue assessment"}</Button></article>
      <article className="panel"><p className="eyebrow">Kai · Keep advancing intentionally</p><h2>A useful next step, not more noise.</h2><p>Ask Kai to connect your saved priority, cycle, and action. Private journal content stays excluded.</p><KaiPrompt prompt="Based on my Blueprint, current cycle, and today's focus, what should I do next?">Ask Kai for today&apos;s guidance</KaiPrompt></article>
      <article className="panel dashboard-tools"><p className="eyebrow">Supporting tools</p><div className="dashboard-links">{[["/journal","Journal"],["/goals","Goals"],["/challenges","Challenges"],["/community","Community"],["/architect-cycle","My cycle"],["/resources","Resources"],["/progress","Progress & reassessment"]].map(([href,label])=><Button key={href} href={href} secondary>{label}</Button>)}{isPlatformAdmin(access) && <Button href="/coaching" secondary>Coaching · Owner QA</Button>}</div></article>
    </section></>;
}
