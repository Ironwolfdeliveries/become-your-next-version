"use client";

import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { trackAnalyticsEvent } from "@/lib/analytics-client";

const ratings = [
  ["signup_easy", "Signup was easy"], ["understood_bynv", "I understood what BYNV is"], ["assessment_clear", "The Architect Assessment made sense"],
  ["blueprint_useful", "My Blueprint felt personal and useful"], ["daily_direction_clear", "I knew what to do each day"], ["kai_helpful", "Kai was helpful"],
] as const;

export function FirstCircleFeedback() {
  const [userId, setUserId] = useState("");
  const [message, setMessage] = useState("Use BYNV first; then share the moments that genuinely stood out.");
  const [pending, setPending] = useState(false);
  useEffect(() => { void createClient().auth.getUser().then(({ data }) => setUserId(data.user?.id ?? "")); }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!userId) return setMessage("Please sign in again before submitting feedback.");
    setPending(true); const form = new FormData(event.currentTarget);
    const record: Record<string, unknown> = { user_id: userId };
    for (const [key] of ratings) { const value = Number(form.get(key)); record[key] = value >= 1 && value <= 5 ? value : null; }
    for (const key of ["confused_by","unnecessary","return_tomorrow","additional_feedback"]) record[key] = String(form.get(key) ?? "").trim() || null;
    const pay = form.get("would_pay"); record.would_pay = pay === "yes" ? true : pay === "no" ? false : null;
    const { error } = await createClient().from("first_circle_feedback").upsert(record, { onConflict: "user_id" });
    if (error) setMessage("Your feedback could not be saved yet. Please try again."); else { setMessage("Thank you. Your feedback is saved privately for the BYNV owner."); trackAnalyticsEvent("feedback_submit"); }
    setPending(false);
  }
  return <form className="feedback-form member-form" onSubmit={submit}><fieldset><legend>After you have used BYNV, rate each statement from 1 (not at all) to 5 (completely).</legend>{ratings.map(([key,label]) => <label key={key}>{label}<select name={key} defaultValue=""><option value="">Choose 1–5</option>{[1,2,3,4,5].map(value => <option key={value} value={value}>{value}</option>)}</select></label>)}</fieldset><label>What confused you?<textarea name="confused_by" rows={4} maxLength={3000} /></label><label>What felt unnecessary?<textarea name="unnecessary" rows={4} maxLength={3000} /></label><label>What would make you return tomorrow?<textarea name="return_tomorrow" rows={4} maxLength={3000} /></label><fieldset><legend>Would you pay for BYNV after the introductory period?</legend><label className="check-row"><input type="radio" name="would_pay" value="yes" /> Yes</label><label className="check-row"><input type="radio" name="would_pay" value="no" /> No</label><label className="check-row"><input type="radio" name="would_pay" value="unsure" /> Not sure yet</label></fieldset><label>Anything else we should know?<textarea name="additional_feedback" rows={5} maxLength={5000} /></label><button className="button" disabled={pending}>{pending ? "Saving…" : "Share private feedback"}</button><p className="form-message" role="status">{message}</p></form>;
}
