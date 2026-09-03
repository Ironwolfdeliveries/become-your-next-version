import { ArchitectCycle } from "@/components/architect-cycle";
import { PageHero } from "@/components/ui";
import { requireUser } from "@/lib/supabase/require-user";
export const metadata = { title: "Architect Cycle", description: "Run and review a focused BYNV Architect Cycle." };
export const dynamic = "force-dynamic";
export default async function ArchitectCyclePage() { await requireUser("/architect-cycle"); return <><PageHero eyebrow="Architect Cycle" title="Build. Review. Evolve." copy="Choose one focus for a defined period, use your Daily OS to act on it, then record what changes before beginning again." /><div className="container member-page"><ArchitectCycle /></div></>; }
