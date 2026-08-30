"use client";

import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Entry = { id: string; title: string | null; content: string; created_at: string };

export function JournalWorkspace() {
  const [userId, setUserId] = useState("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [message, setMessage] = useState("Loading your journal…");
  async function load() { const supabase = createClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user) return; setUserId(user.id); const { data } = await supabase.from("journal_entries").select("id,title,content,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20); setEntries(data ?? []); setMessage(""); }
  useEffect(() => { void load(); }, []);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); const title = String(data.get("title") ?? "").trim(); const content = String(data.get("content") ?? "").trim(); if (!content || !userId) return setMessage("Write a reflection before saving."); setMessage("Saving…"); const { error } = await createClient().from("journal_entries").insert({ user_id: userId, title: title || null, content }); if (error) return setMessage("Your reflection could not be saved."); form.reset(); await load(); setMessage("Reflection saved privately to your account."); }
  return <div className="journal-layout"><form className="member-form" onSubmit={submit}><p className="eyebrow">New reflection</p><label>Title (optional)<input name="title" maxLength={140} /></label><label>What are you noticing?<textarea name="content" rows={9} maxLength={20000} required placeholder="What worked? What created friction? What deserves attention next?" /></label><button className="button">Save reflection</button><p className="form-message" role="status">{message}</p></form><section className="journal-history" aria-labelledby="journal-history-heading"><p className="eyebrow">Recent entries</p><h2 id="journal-history-heading">Evidence of change.</h2>{entries.length ? entries.map((entry) => <article key={entry.id}><time dateTime={entry.created_at}>{new Date(entry.created_at).toLocaleDateString()}</time><h3>{entry.title || "Untitled reflection"}</h3><p>{entry.content}</p></article>) : <p className="muted">Your saved reflections will appear here.</p>}</section></div>;
}
