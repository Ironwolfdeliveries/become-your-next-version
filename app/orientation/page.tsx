import { Orientation } from "@/components/orientation";
import { MemberHeader as PageHero } from "@/components/ui";
import { requireUser } from "@/lib/supabase/require-user";

export const metadata = { title: "Your Blueprint, put to work", description: "A short introduction to your Blueprint, Kai, Today's Plan, and your next Architect Cycle." };
export const dynamic = "force-dynamic";

export default async function OrientationPage() {
  await requireUser("/orientation");
  return <><PageHero eyebrow="Welcome to your next version" title="Your Blueprint, put to work." copy="Six small steps to understand how BYNV helps you move forward. About a minute, at your own pace." /><div className="container member-page"><Orientation /></div></>;
}
