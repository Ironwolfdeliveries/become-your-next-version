import { Challenges } from "@/components/challenges";
import { PageHero } from "@/components/ui";
import { requireUser } from "@/lib/supabase/require-user";
export const metadata = { title: "Architect Challenges", description: "Practice a focused BYNV behavior for a defined period." };
export const dynamic = "force-dynamic";
export default async function ChallengesPage() { await requireUser("/challenges"); return <><PageHero eyebrow="Architect Challenges" title="Practice creates progress." copy="Choose one focused challenge, record the days you follow through, and use what you learn to keep improving." /><div className="container member-page"><Challenges /></div></>; }
