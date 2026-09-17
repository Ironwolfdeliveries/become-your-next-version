import { NextVersionReset } from "@/components/next-version-reset";
import { requireUser } from "@/lib/supabase/require-user";
import { getExperience } from "@/lib/experience-server";
export const metadata = { title: "Next Version Reset", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default async function ResetPage() {
  const user = await requireUser("/next-version-reset");
  return <NextVersionReset initial={await getExperience(user.id)} />;
}
