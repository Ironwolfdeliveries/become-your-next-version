"use client";
import type { ReviewRecord } from "@/lib/experience";
import { useState } from "react";
import { emptyReview, reviewQuestions, validReview, type ChangeReview } from "@/lib/momentum";
import "./momentum.css";

export function ChangeReviewForm({ starting, evidence = [], reward, pending, onSave, onCancel }: { starting: string; evidence?: string[]; reward?: string | null; pending: boolean; onSave: (review: ChangeReview) => Promise<void>; onCancel: () => void }) {
  const [review, setReview] = useState<ChangeReview>({ ...emptyReview });
  const [step, setStep] = useState(0);
  const [key, question] = reviewQuestions[step];
  return <section className="change-review" aria-label="Show the change">
    <p className="eyebrow">Kai · Show the change</p><h3>A small, honest review.</h3>
    <p><strong>Your starting intention:</strong> {starting}</p>
    <p>One to three sentences across this review is enough. No clear change yet is a useful answer. You can use your keyboard’s dictation if available.</p>
    <p className="field-help">{step + 1} of 5 · {step < 2 ? "Your change and evidence" : "Optional — skip if nothing to add"}</p>
    <label className="cycle-guide-field">{question}<textarea key={key} value={review[key]} onChange={event => setReview(current => ({ ...current, [key]: event.target.value }))} rows={2} maxLength={600} disabled={pending} /></label>
    {step === 0 && <button type="button" className="button secondary" disabled={pending} onClick={() => setReview(current => ({ ...current, changed: "No clear change yet." }))}>No clear change yet</button>}
    {step === 1 && <details><summary>Use my saved activity as evidence</summary><p>Activity shows effort; you decide whether the result changed.</p>{evidence.length ? <ul>{evidence.slice(0,5).map((item,i) => <li key={i}>{item}</li>)}</ul> : <p>You can point to something you can now do differently, or say that you do not yet have evidence of change.</p>}</details>}
    {step === 4 && reward && <p>Your way to recognize the win: <strong>{reward}</strong>. You decide whether your follow-through earned it.</p>}
    <div className="button-row">
      {step > 0 && <button type="button" className="button secondary" disabled={pending} onClick={() => setStep(step - 1)}>Back</button>}
      {step < 4 ? <button type="button" className="button" disabled={pending || (step < 2 && !review[key].trim())} onClick={() => setStep(step + 1)}>{step < 2 ? "Continue" : review[key].trim() ? "Continue" : "Skip"}</button> : <button type="button" className="button" disabled={pending || !validReview(review)} onClick={() => void onSave(review)}>{pending ? "Saving…" : "Save review & complete"}</button>}
      <button type="button" className="button secondary" disabled={pending} onClick={onCancel}>Keep working on it</button>
    </div>
  </section>;
}

export function ChangeEvidence({ review }: { review?: ChangeReview | null }) {
  if (!review) return null;
  return <div className="change-evidence"><p className="eyebrow">Your reported change</p>{reviewQuestions.filter(([key]) => review[key]).map(([key, question]) => <p key={key}><strong>{question}</strong><br />{review[key]}</p>)}</div>;
}

export function ReviewHistory({history, current}: {history?: ReviewRecord[] | null; current: boolean}) {
 const earlier = current ? history?.slice(0,-1) : history;
 return earlier?.length ? <details><summary>Earlier reviews · {earlier.length}</summary>{earlier.map((record,i)=><div key={i}><p>{record.recorded_at.slice(0,10)}</p><ChangeEvidence review={record.review}/></div>)}</details> : null;
}
