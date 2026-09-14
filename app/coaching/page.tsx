import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/require-user";
import { getAccountAccess } from "@/lib/admin";
import { canUseCoachingQA } from "@/lib/coaching-qa";
import { PageHero } from "@/components/ui";
import { CoachingQA } from "@/components/coaching-qa";
export const metadata = { title: "Architect Coaching · Owner QA", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default async function CoachingPage() {
  const user = await requireUser("/coaching");
  if (!canUseCoachingQA(await getAccountAccess(user.id))) redirect("/membership");
  return <><PageHero eyebrow="Owner / Full Product QA" title="Architect Coaching. Rehearse the whole experience." copy="An internal workflow preview, not an active coaching service. No payment, provider assignment, or appointment is created." /><CoachingQA /></>;
}
