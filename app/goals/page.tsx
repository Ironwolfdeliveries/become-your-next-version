import { GoalsWorkspace } from "@/components/goals-workspace";
import { PageHero } from "@/components/ui";
import { requireUser } from "@/lib/supabase/require-user";
export const metadata = { title: "Architect Goals", description: "Set and track deliberate BYNV goals." };
export const dynamic = "force-dynamic";
export default async function GoalsPage() { await requireUser("/goals"); return <><PageHero eyebrow="Goals" title="Choose outcomes worth building." copy="Connect each goal to a life domain, give it a direction, and track completion without empty points or badges." /><div className="container member-page"><GoalsWorkspace /></div></>; }
