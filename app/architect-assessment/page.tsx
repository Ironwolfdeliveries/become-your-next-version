import { ArchitectAssessment } from "@/components/architect-assessment";
import { MemberHeader as PageHero } from "@/components/ui";
import { requireUser } from "@/lib/supabase/require-user";

export const metadata = { title: "Architect Assessment", description: "Build a fuller picture of where you are across seven areas of life." };
export const dynamic = "force-dynamic";

export default async function ArchitectAssessmentPage({ searchParams }: { searchParams: Promise<{ reassess?: string; version?: string }> }) {
  await requireUser("/architect-assessment");
  const params = await searchParams;
  const version = Number(params.version);
  const reviewVersion = Number.isSafeInteger(version) && version > 0 ? version : undefined;
  return <><PageHero eyebrow="Understand where you are" title="Your starting point. Your next version." copy="Seven areas of life, one clearer picture. Your work saves as you go, and completed assessments stay available for comparison." /><div className="container"><ArchitectAssessment key={reviewVersion ?? params.reassess ?? "current"} reassess={params.reassess === "1"} reviewVersion={reviewVersion} /></div></>;
}
