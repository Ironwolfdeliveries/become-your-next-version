import { ArchitectAssessment } from "@/components/architect-assessment";
import { PageHero } from "@/components/ui";
import { requireUser } from "@/lib/supabase/require-user";
export const metadata = { title: "Architect Assessment", description: "Build a fuller picture of where you are across seven areas of life." };
export const dynamic = "force-dynamic";
export default async function ArchitectAssessmentPage() { await requireUser("/architect-assessment"); return <><PageHero eyebrow="Understand where you are" title="Architect Assessment." copy="Move through seven focused sections. Your answers save automatically, and you can leave and return at any time." /><div className="container"><ArchitectAssessment /></div></>; }
