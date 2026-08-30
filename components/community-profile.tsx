"use client";

import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CommunityProfile } from "@/lib/community";

export function CommunityProfileEditor() {
  const [profile, setProfile] = useState<CommunityProfile | null>(null);
  const [userId, setUserId] = useState("");
  const [message, setMessage] = useState("Loading your community profile…");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data } = await supabase.from("community_profiles").select("user_id,display_name,bio,visibility").eq("user_id", user.id).maybeSingle();
      setProfile((data as CommunityProfile | null) ?? {
        user_id: user.id,
        display_name: String(user.user_metadata?.display_name || "Architect"),
        bio: "",
        visibility: "members",
      });
      setMessage("");
    }
    void load();
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile || !userId) return;
    setMessage("Saving…");
    const displayName = profile.display_name.trim();
    if (!displayName) return setMessage("Choose a display name.");
    const { error } = await createClient().from("community_profiles").upsert({
      user_id: userId,
      display_name: displayName,
      bio: profile.bio?.trim() || null,
      visibility: profile.visibility,
    });
    setMessage(error ? "Your community profile could not be saved." : "Community profile saved.");
  }

  if (!profile) return <p className="form-message" role="status">{message}</p>;
  return <form className="auth-form community-profile-form" onSubmit={save}>
    <label>Community display name<input value={profile.display_name} maxLength={60} onChange={(event) => setProfile({ ...profile, display_name: event.target.value })} required /></label>
    <label>Short bio<textarea value={profile.bio ?? ""} maxLength={500} onChange={(event) => setProfile({ ...profile, bio: event.target.value })} placeholder="What are you working toward, learning, or ready to contribute?" /></label>
    <label>Profile visibility<select value={profile.visibility} onChange={(event) => setProfile({ ...profile, visibility: event.target.value as CommunityProfile["visibility"] })}><option value="members">Visible to signed-in members</option><option value="private">Private display identity</option></select></label>
    <p className="field-help">Your Snapshot, Version Scores, assessment answers, Blueprint, journal, goals, and Kai activity are never added to your community profile. You choose what to share in a post.</p>
    <button className="button" type="submit">Save community profile</button>
    <div className="form-message" role="status" aria-live="polite">{message}</div>
  </form>;
}
