import { ArchitectCycle } from "@/components/architect-cycle";
import { MemberHeader as PageHero } from "@/components/ui";
import { requireUser } from "@/lib/supabase/require-user";

export const metadata = { title: "Architect Cycle", description: "Choose one meaningful direction with Kai and build a realistic 14-day plan." };
export const dynamic = "force-dynamic";

export default async function ArchitectCyclePage({ searchParams }: { searchParams: Promise<{ goal?: string; choose?: string }> }) {
  await requireUser("/architect-cycle");
  const { goal, choose } = await searchParams;
  return <><PageHero eyebrow="Architect Cycle" title="One direction. Real progress." copy="Choose what you want to improve. Kai helps you turn it into a realistic plan for the next 14 days." /><div className="container member-page"><ArchitectCycle initialGoalId={goal ?? ""} chooseAnother={choose === "1"} /></div></>;
}
