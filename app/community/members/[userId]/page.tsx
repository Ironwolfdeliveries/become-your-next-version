import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Architect Profile", description: "A member-controlled profile inside the private BYNV Architect Community." };

export default async function CommunityMemberPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/sign-in?next=/community/members/${encodeURIComponent(userId)}`);
  const { data: profile } = await supabase.from("community_profiles").select("user_id,display_name,bio,visibility,created_at").eq("user_id", userId).maybeSingle();
  if (!profile) notFound();
  return <main className="container narrow-section"><article className="panel community-member-profile"><p className="eyebrow">Architect Community member</p><h1>{profile.display_name}</h1>{profile.bio ? <p className="lede-small">{profile.bio}</p> : <p className="muted">This Architect has not added a member bio.</p>}<p className="field-help">Community member since {new Date(profile.created_at).toLocaleDateString(undefined, { month: "long", year: "numeric" })}. Private BYNV data is never shown here.</p><div className="button-row"><Link className="button secondary" href="/community">Return to Community</Link>{profile.user_id === user.id && <Link className="button" href="/community/profile">Edit my profile</Link>}</div></article></main>;
}
