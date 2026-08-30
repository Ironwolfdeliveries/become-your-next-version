import { redirect } from "next/navigation";
import { Community } from "@/components/community";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CommunityRoomPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/sign-in?next=/community/rooms/${encodeURIComponent(slug)}`);
  return <main className="container community-shell room-page"><Community roomSlug={slug} /></main>;
}
