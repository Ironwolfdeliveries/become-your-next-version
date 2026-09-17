import { redirect } from "next/navigation";
import { Community } from "@/components/community";
import { MemberHeader as PageHero } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Architect Community", description: "Private BYNV Rooms for connection, accountability, challenges, and intentional growth." };
export const dynamic = "force-dynamic";

export default async function CommunityPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/community");
  return <><PageHero eyebrow="The Architects" title="Grow with people doing the work." copy="Get encouragement from other members. Share only what you choose. Open a room to join a conversation." /><section className="container community-shell"><details className="panel first-circle-intro"><summary>About the First Circle</summary><h2>Founding members help shape what BYNV becomes.</h2><p>First Circle access recognizes early Architects who contribute useful feedback, uphold the Community standard, and participate in building the early culture. It opens a private founding-member Room; it is not an empty badge or a promise of unavailable rewards.</p></details><Community /></section></>;
}
