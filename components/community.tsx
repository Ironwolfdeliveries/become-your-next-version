"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { architectName, communityReactions, type CommunityComment, type CommunityPost, type CommunityProfile, type CommunityReaction, type CommunityRoom } from "@/lib/community";

type CommentDrafts = Record<string, string>;

export function Community({ roomSlug = "general" }: { roomSlug?: string }) {
  const [userId, setUserId] = useState("");
  const [rooms, setRooms] = useState<CommunityRoom[]>([]);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [profiles, setProfiles] = useState<Record<string, CommunityProfile>>({});
  const [reactions, setReactions] = useState<CommunityReaction[]>([]);
  const [commentDrafts, setCommentDrafts] = useState<CommentDrafts>({});
  const [replyTo, setReplyTo] = useState<Record<string, string | null>>({});
  const [reporting, setReporting] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [message, setMessage] = useState("Loading the Architect Community…");
  const currentRoom = rooms.find((room) => room.slug === roomSlug);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);
    const { data: roomData, error: roomError } = await supabase.from("community_rooms").select("id,slug,name,description,access_level,pillar_key,challenge_key").order("sort_order");
    if (roomError) return setMessage("The Community could not be loaded.");
    const visibleRooms = (roomData ?? []) as CommunityRoom[];
    setRooms(visibleRooms);
    const room = visibleRooms.find((item) => item.slug === roomSlug);
    if (!room) return setMessage("This Room is private or unavailable for your current Community access.");
    const { data: postData, error: postError } = await supabase.from("community_posts").select("id,room_id,user_id,title,body,created_at").eq("room_id", room.id).eq("status", "published").order("created_at", { ascending: false }).limit(40);
    if (postError) return setMessage("Posts could not be loaded.");
    const nextPosts = (postData ?? []) as CommunityPost[];
    setPosts(nextPosts);
    const postIds = nextPosts.map((post) => post.id);
    if (!postIds.length) {
      setComments([]); setReactions([]); setProfiles({}); setMessage(""); return;
    }
    const [{ data: commentData }, { data: reactionData }] = await Promise.all([
      supabase.from("community_comments").select("id,post_id,user_id,parent_comment_id,body,created_at").in("post_id", postIds).eq("status", "published").order("created_at"),
      supabase.from("community_post_reactions").select("post_id,user_id,reaction").in("post_id", postIds),
    ]);
    const nextComments = (commentData ?? []) as CommunityComment[];
    setComments(nextComments);
    setReactions((reactionData ?? []) as CommunityReaction[]);
    const memberIds = Array.from(new Set([...nextPosts.map((post) => post.user_id), ...nextComments.map((comment) => comment.user_id)]));
    const { data: profileData } = await supabase.from("community_profiles").select("user_id,display_name,bio,visibility").in("user_id", memberIds);
    setProfiles(Object.fromEntries(((profileData ?? []) as CommunityProfile[]).map((profile) => [profile.user_id, profile])));
    setMessage("");
  }, [roomSlug]);

  useEffect(() => { void load(); }, [load]);

  const commentsByPost = useMemo(() => Object.groupBy(comments, (comment) => comment.post_id), [comments]);

  async function createPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!currentRoom || !userId) return;
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") ?? "").trim();
    const body = String(form.get("body") ?? "").trim();
    if (!title || !body) return setMessage("Add both a title and a message.");
    setMessage("Publishing…");
    const { error } = await createClient().from("community_posts").insert({ room_id: currentRoom.id, user_id: userId, title, body });
    if (error) return setMessage("Your post could not be published.");
    event.currentTarget.reset();
    await load();
    setMessage("Post published.");
  }

  async function addComment(postId: string) {
    const body = (commentDrafts[postId] ?? "").trim();
    if (!body || !userId) return;
    setMessage("Saving your reply…");
    const { error } = await createClient().from("community_comments").insert({ post_id: postId, user_id: userId, body, parent_comment_id: replyTo[postId] ?? null });
    if (error) return setMessage("Your reply could not be saved.");
    setCommentDrafts({ ...commentDrafts, [postId]: "" });
    setReplyTo({ ...replyTo, [postId]: null });
    await load();
  }

  async function toggleReaction(postId: string, reaction: CommunityReaction["reaction"]) {
    if (!userId) return;
    const existing = reactions.some((item) => item.post_id === postId && item.user_id === userId && item.reaction === reaction);
    const query = createClient().from("community_post_reactions");
    const { error } = existing
      ? await query.delete().eq("post_id", postId).eq("user_id", userId).eq("reaction", reaction)
      : await query.insert({ post_id: postId, user_id: userId, reaction });
    if (error) return setMessage("That reaction could not be saved.");
    await load();
  }

  async function submitReport(postId: string) {
    if (!userId || reportReason.trim().length < 3) return setMessage("Briefly explain what should be reviewed.");
    const { error } = await createClient().from("community_reports").insert({ reporter_user_id: userId, target_type: "post", target_id: postId, reason: reportReason.trim() });
    setReporting(null); setReportReason("");
    setMessage(error ? "The report could not be submitted." : "Report submitted privately for moderation review.");
  }

  return <div className="community-layout">
    <aside className="community-rooms" aria-label="Community Rooms">
      <div className="community-room-heading"><p className="eyebrow">Architect Rooms</p><Link href="/community/profile">My community profile</Link></div>
      <nav>{rooms.map((room) => <Link className={room.slug === roomSlug ? "active" : ""} key={room.id} href={`/community/rooms/${room.slug}`}><strong>{room.name}</strong><span>{room.description}</span></Link>)}</nav>
      <p className="field-help">Priority, First Circle, and Mastermind Rooms appear only when that access is assigned to your account.</p>
    </aside>
    <section className="community-feed" aria-busy={message.startsWith("Loading")}>
      {currentRoom ? <><div className="panel community-room-intro"><p className="eyebrow">{currentRoom.access_level === "community" ? "Architect Community" : currentRoom.access_level.replace("_", " ")}</p><h1>{currentRoom.name}</h1><p>{currentRoom.description}</p>{currentRoom.challenge_key && <Link className="text-link" href="/challenges">Open my BYNV Challenges →</Link>}</div>
      <form className="panel community-compose" onSubmit={createPost}><h2>Start a conversation</h2><label>Title<input name="title" maxLength={140} required placeholder="What would be useful to share?" /></label><label>Message<textarea name="body" maxLength={5000} required placeholder="Share a question, commitment, lesson, check-in, or milestone." /></label><p className="field-help">Only share what you deliberately want other signed-in members in this Room to see.</p><button className="button" type="submit">Publish to this Room</button></form>
      <div className="community-posts">{posts.length ? posts.map((post) => {
        const postComments = commentsByPost[post.id] ?? [];
        return <article className="panel community-post" key={post.id}><header><div><p className="eyebrow"><Link href={`/community/members/${post.user_id}`}>{architectName(profiles[post.user_id], userId)}</Link></p><h2>{post.title}</h2></div><time dateTime={post.created_at}>{new Date(post.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</time></header><p className="community-post-body">{post.body}</p><div className="community-reactions" aria-label="React to this post">{communityReactions.map(({ key, label }) => { const count = reactions.filter((item) => item.post_id === post.id && item.reaction === key).length; const mine = reactions.some((item) => item.post_id === post.id && item.reaction === key && item.user_id === userId); return <button className={mine ? "active" : ""} type="button" key={key} aria-pressed={mine} onClick={() => void toggleReaction(post.id, key)}>{label}{count ? ` · ${count}` : ""}</button>; })}<button type="button" onClick={() => setReporting(reporting === post.id ? null : post.id)}>Report</button></div>
        {reporting === post.id && <div className="community-report"><label>Reason for private review<textarea value={reportReason} maxLength={1000} onChange={(event) => setReportReason(event.target.value)} /></label><button className="button secondary" type="button" onClick={() => void submitReport(post.id)}>Submit report</button></div>}
        <div className="community-comments"><h3>{postComments.length ? `${postComments.length} ${postComments.length === 1 ? "reply" : "replies"}` : "Be the first to reply"}</h3>{postComments.map((comment) => <div className={comment.parent_comment_id ? "community-comment nested" : "community-comment"} key={comment.id}><strong><Link href={`/community/members/${comment.user_id}`}>{architectName(profiles[comment.user_id], userId)}</Link></strong><p>{comment.body}</p><button type="button" onClick={() => setReplyTo({ ...replyTo, [post.id]: comment.id })}>Reply</button></div>)}<label>{replyTo[post.id] ? "Write a nested reply" : "Add a reply"}<textarea value={commentDrafts[post.id] ?? ""} maxLength={2000} onChange={(event) => setCommentDrafts({ ...commentDrafts, [post.id]: event.target.value })} /></label>{replyTo[post.id] && <button className="text-button" type="button" onClick={() => setReplyTo({ ...replyTo, [post.id]: null })}>Cancel nested reply</button>}<button className="button secondary" type="button" onClick={() => void addComment(post.id)}>Reply</button></div></article>;
      }) : <article className="panel empty-community"><h2>This Room is ready for its first useful conversation.</h2><p>Start with a question, a meaningful win, or one commitment you want other Architects to help you keep.</p></article>}</div></> : <article className="panel"><h1>Room unavailable</h1><p>{message}</p><Link className="button" href="/community">Return to Community</Link></article>}
      <p className="form-message" role="status" aria-live="polite">{currentRoom ? message : ""}</p>
    </section>
  </div>;
}
