import { redirect } from "next/navigation";
import { CommunityAdmin } from "@/components/community-admin";
import { PageHero } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Community Moderation", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function CommunityAdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");
  const { data } = await supabase.from("community_entitlements").select("community_role").eq("user_id", user.id).maybeSingle();
  if (data?.community_role !== "moderator" && data?.community_role !== "admin") redirect("/community");
  return <><PageHero eyebrow="Secured Community operations" title="Moderation with a record." copy="Review member reports, protect Room standards, and manage access without exposing private BYNV data." /><section className="container member-page"><CommunityAdmin role={data.community_role} moderatorId={user.id} /></section></>;
}
