import { redirect } from "next/navigation";
import { architectScoredQuestionCount, type ArchitectAnswers } from "@/lib/architect-assessment";
import { createClient } from "@/lib/supabase/server";
import { Button, PageHero } from "@/components/ui";

export const metadata = { title: "Architect Dashboard", description: "Your secure BYNV member dashboard." };
export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");
  const [{ data: profile }, { data: snapshot }, { data: assessment }, { data: focus }] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
    supabase.from("version_snapshots").select("score,completed_at").eq("user_id", user.id).order("completed_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("architect_assessments").select("status,answers,version_score,updated_at").eq("user_id", user.id).eq("version", 1).maybeSingle(),
    supabase.from("daily_focus_entries").select("priority,action,completed").eq("user_id", user.id).eq("focus_date", new Date().toISOString().slice(0, 10)).maybeSingle(),
  ]);
  const answers = (assessment?.answers as ArchitectAnswers | null) ?? {};
  const answered = Object.values(answers).filter((value) => typeof value === "number").length;
  const assessmentComplete = assessment?.status === "completed";
  const name = String(profile?.display_name ?? user.user_metadata?.display_name ?? "Architect");
  return <><PageHero eyebrow={`Welcome, ${name}`} title="Your next step, visible." copy="Use your dashboard to continue the assessment, act on today’s priority, connect with other Architects, and review the evidence of change over time." /><section className="container member-dashboard"><article className="panel dashboard-primary"><p className="eyebrow">Architect Assessment</p><h2>{assessmentComplete ? "Your deeper baseline is ready." : answered ? "Continue where you left off." : "Build your deeper baseline."}</h2><p>{assessmentComplete ? `Full Version Score: ${assessment.version_score}/100. Your Blueprint is ready to guide the first focus.` : `${answered} of ${architectScoredQuestionCount} scored prompts answered. Progress saves to your account.`}</p><Button href={assessmentComplete ? "/blueprint" : "/architect-assessment"}>{assessmentComplete ? "Open my Blueprint" : answered ? "Resume assessment" : "Begin assessment"}</Button></article><article className="panel"><p className="eyebrow">Version Snapshot</p><h2>{snapshot ? `${snapshot.score}/100` : "Not saved"}</h2><p className="muted">{snapshot ? "Your preliminary six-question signal is preserved." : "Complete the public Snapshot to add an initial signal."}</p><Button href={snapshot ? "/version-score" : "/assessment"} secondary>{snapshot ? "Review Snapshot" : "Take Snapshot"}</Button></article><article className="panel"><p className="eyebrow">Today&apos;s focus</p><h2>{focus?.priority || "Choose one priority."}</h2><p className="muted">{focus?.action || "Turn the priority into one action you can complete today."}</p><Button href="/daily-focus" secondary>{focus ? "Open Daily Focus" : "Set Daily Focus"}</Button></article><article className="panel community-dashboard-card"><p className="eyebrow">The Architects</p><h2>Growth is personal. It does not have to be solitary.</h2><p>Join private member Rooms for useful accountability, shared challenges, milestones, and conversations across the seven domains.</p><Button href="/community" secondary>Enter Community</Button></article><article className="panel dashboard-tools"><p className="eyebrow">Your Architect system</p><div className="dashboard-links"><Button href="/journal" secondary>Journal</Button><Button href="/goals" secondary>Goals</Button><Button href="/challenges" secondary>Challenges</Button><Button href="/community" secondary>Community</Button><Button href="/architect-cycle" secondary>Architect Cycle</Button><Button href="/progress" secondary>Progress</Button></div></article></section></>;
}
