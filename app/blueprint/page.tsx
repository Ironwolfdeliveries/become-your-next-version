import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button, MemberHeader as PageHero } from "@/components/ui";
import { getJourneyContext } from "@/lib/member-journey";
import { KaiPrompt } from "@/components/kai-prompt";
import { KaiAvatar } from "@/components/kai-avatar";

type SavedArea = { key: string; label: string; score: number };
type SavedAction = { key: string; action: string };
function savedAreas(value: unknown): SavedArea[] {
  return Array.isArray(value) ? value.filter((item): item is SavedArea => Boolean(item && typeof item.key === "string" && typeof item.label === "string" && typeof item.score === "number")) : [];
}
function savedActions(value: unknown): SavedAction[] {
  return Array.isArray(value) ? value.filter((item): item is SavedAction => Boolean(item && typeof item.key === "string" && typeof item.action === "string")) : [];
}

export const metadata = { title: "Architect Blueprint", description: "Your personal BYNV Blueprint and the next step you choose." };
export const dynamic = "force-dynamic";

export default async function BlueprintPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");
  const { data: assessment, error: assessmentError } = await supabase.from("architect_assessments")
    .select("id,version,version_score,section_results,completed_at").eq("user_id", user.id).eq("status", "completed")
    .order("version", { ascending: false }).limit(1).maybeSingle();
  if (assessmentError) throw new Error("Your saved assessment could not be loaded. Please try again.");
  if (!assessment) return <><PageHero eyebrow="Architect Blueprint" title="Let’s find your starting point." copy="Your assessment helps Kai understand what is working and where a little support could help most." /><div className="container content"><Button href="/architect-assessment">Continue my assessment</Button></div></>;

  // Completed results are historical records. Viewing this page never recalculates or writes them.
  const [{ data: blueprint, error: blueprintError }, journey] = await Promise.all([
    supabase.from("architect_blueprints").select("priorities,strengths,first_actions,friction_points")
      .eq("user_id", user.id).eq("assessment_id", assessment.id).maybeSingle(),
    getJourneyContext(user.id),
  ]);
  if (blueprintError) throw new Error("Your saved Blueprint could not be loaded. Please try again.");
  const strengths = savedAreas(blueprint?.strengths);
  const priorities = savedAreas(blueprint?.priorities);
  const firstActions = savedActions(blueprint?.first_actions);
  const sections = savedAreas(assessment.section_results);
  const opportunity = priorities[0];
  const strength = strengths[0];
  const nextHref = journey.cycle ? "/daily-focus" : "/architect-cycle";
  return <>
    <PageHero eyebrow={`Your Architect Blueprint · Assessment ${assessment.version}`} title="You know where you are. Choose what comes next." copy="Use this starting point to choose one meaningful change. Kai will help you turn it into a realistic plan." />
    <section className="container journey-suggestion" aria-labelledby="blueprint-kai-heading">
      <div className="kai-result-head"><KaiAvatar className="kai-result-mark" /><div><p className="eyebrow">Kai · Your next move</p><h2 id="blueprint-kai-heading">Your Blueprint is ready.</h2></div></div>
      {blueprint ? <p>{strength ? `${strength.label} is one of your strongest foundations. ` : ""}{opportunity ? `${opportunity.label} has the most room for focused support. Do you want to start there, or is something else more important right now?` : "What would you most like to improve over the next two weeks?"}</p> : <p>Your assessment and score are saved. The associated Blueprint details are unavailable right now. You can still choose a priority and build a plan with Kai.</p>}
      <div className="button-row">
        <Button href={nextHref}>{journey.cycle ? "Continue today’s plan" : opportunity ? `Start with ${opportunity.label}` : "Choose my first priority"}</Button>
        {!journey.cycle && <Button href="/architect-cycle?choose=1" secondary>Choose something else</Button>}
        <Button href="/orientation" secondary>Show me how this works</Button>
      </div>
    </section>
    <div className="container blueprint-layout">
      <section className="blueprint-score"><p className="eyebrow">Saved Version Score</p><strong>{assessment.version_score ?? "—"}<span>/100</span></strong><p>A starting point to compare over time. Your saved result stays intact when you take a new assessment.</p><Button href="/progress" secondary>See my progress</Button></section>
      <section className="blueprint-section"><p className="eyebrow">Your seven areas</p><h2>A clearer picture.</h2><div className="signal-list">{sections.map((item) => <article key={item.key}><strong>{item.label}</strong><span>{item.score}/100</span></article>)}</div></section>
      <section className="blueprint-section blueprint-actions">
        <p className="eyebrow">Put it to work</p><h2>One small step is enough to begin.</h2>
        {firstActions[0] && <p>{firstActions[0].action}</p>}
        <div className="button-row"><Button href={nextHref}>{journey.cycle ? "Open today’s plan" : "Build my 14-day plan with Kai"}</Button><KaiPrompt prompt="Explain my Blueprint briefly and help me choose the one area I most want to improve over the next 14 days.">Talk it through with Kai</KaiPrompt></div>
      </section>
      <section className="blueprint-section blueprint-actions">
        <details><summary>Explore my saved Blueprint</summary>
          <h2>Strengths to keep using.</h2><div className="signal-list">{strengths.map((item) => <article key={item.key}><strong>{item.label}</strong><span>{item.score}/100</span></article>)}</div>
          <h2>Areas to support.</h2><div className="signal-list">{priorities.map((item) => <article key={item.key}><strong>{item.label}</strong><span>{item.score}/100</span></article>)}</div>
          {firstActions.length > 0 && <ol className="steps">{firstActions.map((item, index) => <li key={item.key}><span>0{index + 1}</span>{item.action}</li>)}</ol>}
          <p>35 scored answers form your Version Score. Seven optional reflections give Kai more context. This is a self-reported starting point, and your choices matter as much as the numbers.</p>
        </details>
        <div className="button-row"><Button href={`/architect-assessment?version=${assessment.version}`} secondary>Review saved answers</Button><Button href="/architect-assessment?reassess=1" secondary>Take a new assessment</Button></div>
      </section>
    </div>
  </>;
}
