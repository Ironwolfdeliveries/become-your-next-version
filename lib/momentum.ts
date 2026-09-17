import { addDays, entryStatus, entrySteps, type Experience } from "./experience.ts";

export const recoveryReasons = ["Too much to do", "Forgot", "Low energy", "Avoided it", "Something changed", "Other"] as const;
export type ChangeReview = { changed: string; evidence: string; helped: string; remaining: string; carry: string };
export const emptyReview: ChangeReview = { changed: "", evidence: "", helped: "", remaining: "", carry: "" };
export const reviewQuestions = [
  ["changed", "What is different now than when you started?"],
  ["evidence", "What can you point to that shows what changed?"],
  ["helped", "What helped most?"],
  ["remaining", "What still needs work?"],
  ["carry", "What will you carry into your next plan?"],
] as const;
export function validReview(value: unknown): value is ChangeReview {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  return reviewQuestions.every(([key]) => typeof v[key] === "string" && (v[key] as string).length <= 600)
    && Boolean((v.changed as string).trim() && (v.evidence as string).trim());
}
// Match the database guard. Constructive choices are supported; harmful penalties are not.
export const harmfulCommitment = /punish|humiliat|starv|self.harm|hurt myself|cut myself|skip.{0,12}(meal|food|sleep)|no.{0,8}(food|sleep)|withhold.{0,12}(food|sleep)|excessive exercise|exercise.{0,12}(pain|collapse)|financial penalt|pay.{0,12}(fine|penalt)|depriv/i;
export function safePersonalChoice(value: string) { return value.length <= 240 && !harmfulCommitment.test(value); }
export function reviewSummary(review: ChangeReview) {
  return reviewQuestions.filter(([key]) => review[key].trim()).map(([key, question]) => `${question} ${review[key].trim()}`).join("\n");
}
export function momentumFacts(state: Experience) {
  const history = state.recent.filter(e => e.focus_date <= state.today);
  const week = history.filter(e => e.focus_date >= addDays(state.today, -6));
  const checkins = week.filter(e => entryStatus(e) !== null || e.recovery).length;
  const recoveries = history.filter(e => e.recovery);
  const comeback = recoveries.some(source => history.some(target => target.focus_date === source.recovery?.next_date && entrySteps(target).some(step => step.done && step.text === source.recovery?.next_action)));
  const completedActions = history.flatMap(entry => entrySteps(entry).filter(step => step.done).map(step => ({ ...step, date: entry.focus_date, priority: entry.priority })));
  const recoveryNeeded = history.filter(e => !e.recovery && entrySteps(e).some(s => !s.done) && (e.focus_date < state.today || e.check_in === "missed" || e.check_in === "progress"));
  const dueGoals = state.goals.filter(g => g.status === "active" && g.target_date && g.target_date <= addDays(state.today, 3));
  return { checkins, comeback, completedActions, recoveryNeeded, recoveries, dueGoals, progressDays: history.filter(e => entryStatus(e) === "progress") };
}
