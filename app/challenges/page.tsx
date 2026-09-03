import { Challenges } from "@/components/challenges";
import { PageHero } from "@/components/ui";
import { requireUser } from "@/lib/supabase/require-user";
export const metadata = { title: "Architect Challenges", description: "Practice a focused BYNV behavior for a defined period." };
export const dynamic = "force-dynamic";
export default async function ChallengesPage() { await requireUser("/challenges"); return <><PageHero eyebrow="Architect Challenges" title="Practice creates evidence." copy="Choose a focused challenge, record each deliberate day, and complete it without artificial points or performative streaks." /><div className="container member-page"><Challenges /></div></>; }
