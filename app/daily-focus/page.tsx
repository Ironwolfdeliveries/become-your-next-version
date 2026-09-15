import { DailyFocus } from "@/components/daily-focus";
import { MemberHeader as PageHero } from "@/components/ui";
import { requireUser } from "@/lib/supabase/require-user";

export const metadata = {
  title: "Today’s Plan",
  description: "Choose what matters today, take one or a few realistic actions, then check in on what happened.",
};
export const dynamic = "force-dynamic";

export default async function DailyFocusPage() {
  await requireUser("/daily-focus");
  return <><PageHero eyebrow="Your Daily Operating System" title="Today’s Plan" copy="Choose what matters today, take one or a few realistic actions, then check in on what happened." /><div className="container member-page"><DailyFocus /></div></>;
}
