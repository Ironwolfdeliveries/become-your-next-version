import { DailyFocus } from "@/components/daily-focus";
import { PageHero } from "@/components/ui";
import { requireUser } from "@/lib/supabase/require-user";
export const metadata = { title: "Daily Focus", description: "Turn your BYNV Blueprint into one meaningful action and identify work AI can help with." };
export const dynamic = "force-dynamic";
export default async function DailyFocusPage() { await requireUser("/daily-focus"); return <><PageHero eyebrow="Daily OS" title="One priority. One meaningful action." copy="Choose what matters today, complete the smallest useful action, and decide what AI can help with while you stay in control." /><div className="container member-page"><DailyFocus /></div></>; }
