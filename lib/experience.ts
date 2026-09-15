export const commitmentRules = [
  { key: "recommit", label: "Recommit within 24 hours" },
  { key: "blocker", label: "Tell Kai what blocked me" },
  { key: "shrink", label: "Make the next action smaller" },
  { key: "reset", label: "Take a 10-minute reset" },
  { key: "partner", label: "Check in with my accountability partner" },
] as const;
export type CommitmentRule = typeof commitmentRules[number]["key"];
export type CheckIn = "done" | "progress" | "missed";
export type PlanStep = { id: string; text: string; done: boolean };
export type Recovery = { strategy: "keep" | "shrink" | "reschedule" | "replace"; next_date: string; next_action: string; resolved_at: string; blocker?: string };
export type DailyEntry = { id: string; focus_date: string; priority: string | null; action: string | null; completed: boolean; reflection: string | null; steps: PlanStep[] | null; check_in: CheckIn | null; recovery: Recovery | null; cycle_id: string | null; updated_at: string };
export type Cycle = { id: string; focus: string; starts_on: string; ends_on: string; status: string; outcome: string | null; success_vision: string | null; plan_steps: string[]; commitment_rule: CommitmentRule | null; pillar_key: string | null; goal_id: string | null; completed_at: string | null; updated_at: string };
export type Goal = { id: string; title: string; pillar_key: string | null; status: string; target_date: string | null; success_vision: string | null; commitment_rule: CommitmentRule | null; advanced_at: string | null };
export type BlueprintArea = { key: string; label: string; score: number };
export type Experience = {
  today: string; timezone: string; name: string; orientationComplete: boolean;
  assessmentComplete: boolean; score: number | null;
  strengths: BlueprintArea[]; priorities: BlueprintArea[]; firstActions: { key: string; action: string }[];
  cycle: Cycle | null; cycles: Cycle[]; daily: DailyEntry | null; recent: DailyEntry[]; unresolved: DailyEntry[]; goals: Goal[];
};
export function memberDate(timezone = "America/New_York", now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
export function addDays(date: string, days: number) { const d = new Date(`${date}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10); }
export function entrySteps(entry: Pick<DailyEntry, "steps" | "action" | "completed"> | null): PlanStep[] {
  if (!entry) return [];
  if (Array.isArray(entry.steps) && entry.steps.length) return entry.steps;
  return entry.action?.trim() ? [{ id: "legacy", text: entry.action, done: entry.completed }] : [];
}
export function entryStatus(entry: DailyEntry | null): CheckIn | null { return entry?.check_in ?? (entry?.completed ? "done" : null); }
export function needsRecovery(entry: DailyEntry, today: string) {
  return entry.focus_date < today && entrySteps(entry).some(s => !s.done) && !entry.recovery && entryStatus(entry) !== "done";
}
export function momentum(entries: DailyEntry[], today: string) {
  const throughToday = entries.filter(e => e.focus_date <= today);
  const days = new Set(throughToday.filter(e => entrySteps(e).some(s => s.done)).map(e => e.focus_date));
  let cursor = days.has(today) ? today : addDays(today, -1), streak = 0;
  while (days.has(cursor)) { streak++; cursor = addDays(cursor, -1); }
  return { streak, actions: throughToday.reduce((n,e) => n + entrySteps(e).filter(s=>s.done).length, 0), thisWeek: throughToday.filter(e=>e.focus_date>=addDays(today,-6)).reduce((n,e)=>n+entrySteps(e).filter(s=>s.done).length,0), progressDays: throughToday.filter(e=>entryStatus(e)==="progress").length };
}
export async function loadExperience(): Promise<Experience> {
  const response = await fetch("/api/account/experience", { cache: "no-store" }); const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Your plan could not be loaded. Please try again."); return data;
}
export async function changeExperience(payload: Record<string, unknown>): Promise<void> {
  const response = await fetch("/api/account/experience", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(payload) });
  const data = await response.json(); if (!response.ok) throw new Error(data.error || "That change could not be saved. Your work is still here.");
  window.dispatchEvent(new Event("bynv:journey-changed"));
}
