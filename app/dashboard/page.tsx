import { requireUser } from "@/lib/supabase/require-user";
import { getExperience } from "@/lib/experience-server";
import { getAccountAccess, isPlatformAdmin } from "@/lib/admin";
import { MemberCommandCenter } from "@/components/member-command-center";
export const metadata = { title: "My BYNV", description: "Your guide, your plan, and your next useful move." };
export const dynamic = "force-dynamic";
export default async function Dashboard() {
  const user = await requireUser("/dashboard");
  const [state, access] = await Promise.all([getExperience(user.id), getAccountAccess(user.id)]);
  return <MemberCommandCenter initial={state} owner={isPlatformAdmin(access)} />;
}
