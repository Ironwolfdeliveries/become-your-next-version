import { entrySteps, entryStatus, type Experience } from "./experience.ts";
export const resetQuestions = [
  { key: "direction", label: "What would you genuinely like to be different?", optional: false },
  { key: "pattern", label: "What keeps happening that leaves you feeling stuck?", optional: true },
  { key: "avoidance", label: "Is there something you keep putting off facing?", optional: true },
  { key: "identity", label: "Is there an old expectation of yourself that no longer fits?", optional: true },
  { key: "fear", label: "What worry, if any, makes choosing harder?", optional: true },
  { key: "change", label: "What change would matter most—and how would you notice it?", optional: true },
  { key: "action", label: "What is one realistic next action you choose?", optional: false },
] as const;
export type ResetKey = typeof resetQuestions[number]["key"];
export type ResetAnswers = Record<ResetKey, string>;
export const blankReset = (): ResetAnswers => ({ direction: "", pattern: "", avoidance: "", identity: "", fear: "", change: "", action: "" });
export function validateReset(value: unknown): ResetAnswers {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Please review your Reset.");
  const input = value as Record<string, unknown>, answers = blankReset();
  for (const q of resetQuestions) {
    const v = input[q.key];
    if (typeof v !== "string" || v.length > (q.key === "direction" ? 160 : 600) || (!q.optional && !v.trim())) throw new Error("Keep your direction and next action short, and review any missing answers.");
    answers[q.key] = v.trim();
  }
  return answers;
}
export function resetSummary(answers: ResetAnswers) {
  return resetQuestions.filter(q => answers[q.key]).map(q => `${q.label}\n${answers[q.key]}`).join("\n\n");
}
export function resetDay(state: Experience, answers: ResetAnswers, id: string) {
  const day = state.daily, steps = entrySteps(day);
  if (day?.recovery || entryStatus(day)) throw new Error("Today already has a check-in. Open Today’s Plan to review it, or save this direction as a goal.");
  if (steps.some(s => s.text.trim().toLowerCase() === answers.action.trim().toLowerCase())) return null;
  if (steps.length >= 3) throw new Error("You already have three steps today. Open Today’s Plan to choose what fits before adding more.");
  return { action: "save-day", date: state.today, priority: day?.priority ?? answers.direction, steps: [...steps, { id, text: answers.action, done: false }], reflection: day?.reflection ?? "", check_in: null, cycle_id: day?.cycle_id ?? null, expected_updated_at: day?.updated_at ?? null };
}
