export type AssessmentAnswers = Record<string, number>;
export type ScoreResult = { score: number; focus: string; insight: string; nextSteps: string[] };

const assessmentKeys = ["clarity", "energy", "action", "resilience", "support", "reflection"] as const;

const wait = (ms = 350) => new Promise((resolve) => setTimeout(resolve, ms));

export function calculateScore(answers: AssessmentAnswers): ScoreResult {
  const values = assessmentKeys
    .map((key) => answers[key])
    .filter((value): value is number => Number.isInteger(value) && value >= 1 && value <= 5);
  const score = values.length ? Math.round((values.reduce((a, b) => a + b, 0) / (values.length * 5)) * 100) : 0;
  const focus = score < 50 ? "Clarity" : score < 75 ? "Consistency" : "Expansion";
  return {
    score, focus,
    insight: score < 50 ? "Create space to name what matters before adding more action." : score < 75 ? "Your direction is forming. A lighter, repeatable system can turn it into momentum." : "Your foundations feel strong. Choose one deliberate stretch without abandoning what sustains you.",
    nextSteps: ["Name one outcome that would make this month meaningful.", "Choose a ten-minute action you can repeat three times this week.", "Schedule a seven-day review: keep, change or remove one thing."]
  };
}

export function readAssessment(raw: string | null): AssessmentAnswers {
  if (!raw) return {};

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

    const answers: AssessmentAnswers = {};
    for (const key of assessmentKeys) {
      const value = (parsed as Record<string, unknown>)[key];
      if (Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 5) {
        answers[key] = Number(value);
      }
    }
    return answers;
  } catch {
    return {};
  }
}

export const mockServices = {
  async submitInterest(email: string) { await wait(); return { ok: Boolean(email), message: "Demo saved — no email was sent." }; },
  async sendContact() { await wait(); return { ok: true, message: "Demo received — connect an email provider to deliver it." }; },
  async askKai(prompt: string) { await wait(500); return { text: `Let’s make that concrete. When you say “${prompt.slice(0, 80)}”, what is the smallest change you could notice within seven days? Choose one action you control.` }; },
  async beginCheckout() { await wait(); return { ok: false, message: "Preview only — checkout is not enabled yet." }; }
};
