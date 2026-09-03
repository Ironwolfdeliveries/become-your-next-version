import { redirect } from "next/navigation";
import { calculateArchitectResults, type ArchitectAnswers } from "@/lib/architect-assessment";
import { createBlueprint } from "@/lib/blueprint";
import { createClient } from "@/lib/supabase/server";
import { Button, PageHero } from "@/components/ui";
import { KaiAvatar } from "@/components/kai-avatar";

export const metadata = { title: "Architect Blueprint", description: "Your deterministic BYNV starting Blueprint." };
export const dynamic = "force-dynamic";

export default async function BlueprintPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");
  const { data: assessment } = await supabase.from("architect_assessments").select("id,answers,status,completed_at").eq("user_id", user.id).eq("version", 1).maybeSingle();
  if (!assessment || assessment.status !== "completed") return <><PageHero eyebrow="Architect Blueprint" title="Your deeper baseline comes first." copy="Complete the Architect Assessment to generate a Blueprint from your actual responses." /><div className="container content"><Button href="/architect-assessment">Continue my assessment</Button></div></>;
  const results = calculateArchitectResults((assessment.answers as ArchitectAnswers) ?? {});
  const blueprint = createBlueprint(results);
  await supabase.from("architect_blueprints").upsert({
    user_id: user.id,
    assessment_id: assessment.id,
    priorities: blueprint.priorities,
    strengths: blueprint.strengths,
    friction_points: blueprint.frictionPoints,
    first_actions: blueprint.firstActions,
  }, { onConflict: "user_id,assessment_id" });
  return <><PageHero eyebrow="Your Architect Blueprint" title="A focused starting plan—built from your answers." copy={`Your deeper assessment produced a ${results.score}/100 baseline across seven domains. This is a current-state signal, not a permanent label.`} /><div className="container blueprint-layout"><section className="blueprint-score"><p className="eyebrow">Full Version Score</p><strong>{results.score}<span>/100</span></strong><p>Calculated from 35 scored responses. Written reflections provide context but do not alter the score.</p></section><section className="blueprint-section"><p className="eyebrow">Current strengths</p><h2>Foundations to keep using.</h2><div className="signal-list">{blueprint.strengths.map((item) => <article key={item.key}><strong>{item.label}</strong><span>{item.score}/100</span></article>)}</div></section><section className="blueprint-section"><p className="eyebrow">Priority areas</p><h2>Where focused attention can help most.</h2><div className="signal-list">{blueprint.priorities.map((item) => <article key={item.key}><strong>{item.label}</strong><span>{item.score}/100</span></article>)}</div></section><section className="blueprint-section blueprint-actions"><p className="eyebrow">First actions</p><h2>Start small enough to repeat.</h2><ol className="steps">{blueprint.firstActions.map((item, index) => <li key={item.key}><span>0{index + 1}</span>{item.action}</li>)}</ol><div className="button-row"><Button href="/dashboard">Open my dashboard</Button><Button href="/architect-assessment" secondary>Review my responses</Button></div></section><section className="kai-result"><div className="kai-result-head"><KaiAvatar className="kai-result-mark" /><div><p className="eyebrow">Kai-ready context</p><h2>Your Blueprint is structured for coaching.</h2></div></div><p>These scores, priorities, and reflections are stored as your private starting context. Kai uses only permitted private context when the secure model service is active.</p></section></div></>;
}
