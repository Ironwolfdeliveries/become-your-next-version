import { redirect } from "next/navigation";
import { CommunityProfileEditor } from "@/components/community-profile";
import { PageHero } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Community Profile", description: "Choose how you appear inside the private BYNV Architect Community." };
export const dynamic = "force-dynamic";

export default async function CommunityProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/community/profile");
  return <><PageHero eyebrow="Community identity" title="Show up as an Architect, on your terms." copy="Choose a member-facing display identity without exposing any of your private BYNV work." /><section className="container narrow-section"><div className="panel"><CommunityProfileEditor /></div></section></>;
}
