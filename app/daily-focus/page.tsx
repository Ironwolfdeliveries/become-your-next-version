import { DailyFocus } from "@/components/daily-focus";
import { PageHero } from "@/components/ui";
import { requireUser } from "@/lib/supabase/require-user";
export const metadata = { title: "Daily Focus", description: "Turn your BYNV Blueprint into one deliberate action and identify work AI can help carry." };
export const dynamic = "force-dynamic";
export default async function DailyFocusPage() { await requireUser("/daily-focus"); return <><PageHero eyebrow="Daily OS" title="One priority. One deliberate action." copy="Choose what matters today, complete the smallest useful action, and decide what AI can help carry without giving away your judgment." /><div className="container member-page"><DailyFocus kaiLive={Boolean(process.env.OPENAI_API_KEY)} /></div></>; }
