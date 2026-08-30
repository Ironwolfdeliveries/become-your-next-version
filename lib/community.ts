export type CommunityRoom = {
  id: string;
  slug: string;
  name: string;
  description: string;
  access_level: "community" | "priority" | "mastermind" | "first_circle";
  pillar_key: string | null;
  challenge_key: string | null;
};

export type CommunityProfile = {
  user_id: string;
  display_name: string;
  bio: string | null;
  visibility: "members" | "private";
};

export type CommunityPost = {
  id: string;
  room_id: string;
  user_id: string;
  title: string;
  body: string;
  created_at: string;
};

export type CommunityComment = {
  id: string;
  post_id: string;
  user_id: string;
  parent_comment_id: string | null;
  body: string;
  created_at: string;
};

export type CommunityReaction = {
  post_id: string;
  user_id: string;
  reaction: "encourage" | "celebrate" | "support";
};

export const communityReactions = [
  { key: "encourage", label: "Encourage" },
  { key: "celebrate", label: "Celebrate" },
  { key: "support", label: "Support" },
] as const;

export function architectName(profile: CommunityProfile | undefined, ownUserId: string) {
  if (!profile) return "Architect";
  if (profile.visibility === "private" && profile.user_id !== ownUserId) return "Private Architect";
  return profile.display_name;
}
