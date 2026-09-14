import { redirect } from "next/navigation";
import {
  calculateArchitectResults,
  type ArchitectAnswers,
} from "@/lib/architect-assessment";
import { createBlueprint } from "@/lib/blueprint";
import { createClient } from "@/lib/supabase/server";
import { Button, PageHero } from "@/components/ui";
import { getJourneyContext } from "@/lib/member-journey";
import { KaiPrompt } from "@/components/kai-prompt";
import { KaiAvatar } from "@/components/kai-avatar";

export const metadata = {
  title: "Architect Blueprint",
  description: "Your personal BYNV starting Blueprint.",
};
export const dynamic = "force-dynamic";

export default async function BlueprintPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");
  const { data: assessment } = await supabase
    .from("architect_assessments")
    .select("id,answers,status,completed_at")
    .eq("user_id", user.id)
    .eq("version", 1)
    .maybeSingle();
  if (!assessment || assessment.status !== "completed")
    return (
      <>
        <PageHero
          eyebrow="Architect Blueprint"
          title="Complete your assessment first."
          copy="Complete the Architect Assessment to generate a Blueprint from your actual responses."
        />
        <div className="container content">
          <Button href="/architect-assessment">Continue my assessment</Button>
        </div>
      </>
    );
  const results = calculateArchitectResults(
    (assessment.answers as ArchitectAnswers) ?? {},
  );
  const blueprint = createBlueprint(results);
  const journey = await getJourneyContext(user.id);
  return (
    <>
      <PageHero
        eyebrow="Your Architect Blueprint"
        title="A focused starting plan—built from your answers."
        copy={`Your assessment produced a ${results.score}/100 Version Score across seven areas of life. It reflects where you are now—not who you will always be.`}
      />
      <section className="container journey-strip" aria-label="Your next step"><span>Blueprint → Priority → Cycle → Today’s action</span><strong>{blueprint.priorities[0]?.label}</strong><p>{blueprint.firstActions[0]?.action}</p><Button href={journey.cycle ? "/daily-focus" : "/architect-cycle"}>{journey.cycle ? "Continue today's work" : "Start my first Architect Cycle"}</Button></section>
      <div className="container blueprint-layout">
        <section className="blueprint-score">
          <p className="eyebrow">Full Version Score</p>
          <strong>
            {results.score}
            <span>/100</span>
          </strong>
          <p>
            Calculated from 35 scored answers. Written reflections provide
            context but do not alter the score.
          </p>
        </section>
        <section className="blueprint-section">
          <p className="eyebrow">Current strengths</p>
          <h2>Foundations to keep using.</h2>
          <div className="signal-list">
            {blueprint.strengths.map((item) => (
              <article key={item.key}>
                <strong>{item.label}</strong>
                <span>{item.score}/100</span>
              </article>
            ))}
          </div>
        </section>
        <section className="blueprint-section">
          <p className="eyebrow">Priority areas</p>
          <h2>Where focused attention can help most.</h2>
          <div className="signal-list">
            {blueprint.priorities.map((item) => (
              <article key={item.key}>
                <strong>{item.label}</strong>
                <span>{item.score}/100</span>
              </article>
            ))}
          </div>
        </section>
        <section className="blueprint-section blueprint-actions">
          <p className="eyebrow">First actions</p>
          <h2>Start small enough to repeat.</h2>
          <ol className="steps">
            {blueprint.firstActions.map((item, index) => (
              <li key={item.key}>
                <span>0{index + 1}</span>
                {item.action}
              </li>
            ))}
          </ol>
          <div className="button-row">
            <Button href={journey.cycle ? "/daily-focus" : "/architect-cycle"}>{journey.cycle ? "Continue today's work" : "Start my first Architect Cycle"}</Button>
            <KaiPrompt prompt="Explain my Blueprint and help me choose my first Architect Cycle.">Ask Kai about my Blueprint</KaiPrompt>
            <Button href="/architect-assessment" secondary>
              Review my responses
            </Button>
          </div>
        </section>
        <section className="kai-result">
          <div className="kai-result-head">
            <KaiAvatar className="kai-result-mark" />
            <div>
              <p className="eyebrow">Kai context</p>
              <h2>Your Blueprint is ready for practical guidance.</h2>
            </div>
          </div>
          <p>
            These scores, priorities, and first actions stay in your private
            account. Kai can use them to help you understand your Blueprint,
            choose a next step, and stay connected to what matters most.
          </p>
        </section>
      </div>
    </>
  );
}
