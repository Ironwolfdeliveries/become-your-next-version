import { redirect } from "next/navigation";
import { Community } from "@/components/community";
import { PageHero } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Architect Community", description: "Private BYNV Rooms for connection, accountability, challenges, and intentional growth." };
export const dynamic = "force-dynamic";

export default async function CommunityPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/community");
  return <><PageHero eyebrow="The Architects" title="Grow with people doing the work." copy="The Architect Community is a private member space for honest progress, useful accountability, shared challenges, and mutual encouragement." /><section className="container community-shell"><aside className="panel first-circle-intro"><p className="eyebrow">The First Circle</p><h2>Founding members help shape what BYNV becomes.</h2><p>First Circle access recognizes early Architects who contribute useful feedback, uphold the Community standard, and participate in building the early culture. It opens a private founding-member Room; it is not an empty badge or a promise of unavailable rewards.</p></aside><Community /></section></>;
}
