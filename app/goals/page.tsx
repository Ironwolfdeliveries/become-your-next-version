import { GoalsWorkspace } from "@/components/goals-workspace";
import { MemberHeader as PageHero } from "@/components/ui";
import { requireUser } from "@/lib/supabase/require-user";
export const metadata = { title: "Your Goals", description: "Choose a meaningful change and turn it into a realistic plan with Kai." };
export const dynamic = "force-dynamic";
export default async function GoalsPage() {
  const user = await requireUser("/goals");
  return <><PageHero eyebrow="Your goals" title="What would you like to be different?" copy="Choose what you want to change. Kai helps you turn it into a few realistic steps." /><div className="container member-page"><GoalsWorkspace userId={user.id} /></div></>;
}
