export type AssessmentAnswers = Record<string, number>;
export const assessmentAreas = [
  { key: "clarity", label: "Clarity", description: "Knowing what matters most in your life right now." },
  { key: "energy", label: "Energy", description: "Protecting enough energy for what matters." },
  { key: "action", label: "Action", description: "Aligning your weekly actions with your priorities." },
  { key: "resilience", label: "Resilience", description: "Adapting without losing your direction." },
  { key: "support", label: "Support", description: "Having people or systems that support your growth." },
  { key: "reflection", label: "Reflection", description: "Reviewing what is and is not working." },
] as const;

export type AssessmentAreaKey = (typeof assessmentAreas)[number]["key"];
export type AssessmentAreaResult = {
  key: AssessmentAreaKey;
  label: string;
  description: string;
  value: number;
  percent: number;
};
export type KaiInterpretationResult = {
  headline: string;
  summary: string;
  focus: string;
};
export type ScoreResult = {
  score: number;
  focus: string;
  insight: string;
  nextSteps: string[];
  areas: AssessmentAreaResult[];
  strongestAreas: AssessmentAreaResult[];
  opportunityAreas: AssessmentAreaResult[];
  kaiInterpretation: KaiInterpretationResult;
};

const assessmentKeys = assessmentAreas.map((area) => area.key);

const wait = (ms = 350) => new Promise((resolve) => setTimeout(resolve, ms));

export function calculateScore(answers: AssessmentAnswers): ScoreResult {
  const areas = assessmentAreas.flatMap((area): AssessmentAreaResult[] => {
    const value = answers[area.key];
    if (!Number.isInteger(value) || value < 1 || value > 5) return [];
    return [{ ...area, value, percent: value * 20 }];
  });
  const values = areas.map((area) => area.value);
  const score = values.length ? Math.round((values.reduce((a, b) => a + b, 0) / (values.length * 5)) * 100) : 0;
  const focus = score < 50 ? "Clarity" : score < 75 ? "Consistency" : "Expansion";
  const highestValue = values.length ? Math.max(...values) : 0;
  const lowestValue = values.length ? Math.min(...values) : 0;
  const strongestAreas = areas.filter((area) => area.value === highestValue);
  const opportunityAreas = areas.filter((area) => area.value === lowestValue);
  const isBalanced = strongestAreas.length === assessmentAreas.length;
  const strongestLabel = formatAreaNames(strongestAreas, "your current foundations");
  const opportunityLabel = formatAreaNames(opportunityAreas, "one area you choose");
  const opportunityFocus = isBalanced
    ? "Choose the area that matters most to strengthen now, then support it with one small, repeatable action."
    : opportunityAreas[0]
      ? opportunityGuidance[opportunityAreas[0].key]
      : "Choose one small, repeatable action that supports what matters most.";

  return {
    score, focus,
    insight: score < 50 ? "Create space to name what matters before adding more action." : score < 75 ? "Your direction is forming. A lighter, repeatable system can turn it into momentum." : "Your foundations feel strong. Choose one deliberate stretch without abandoning what sustains you.",
    nextSteps: ["Name one outcome that would make this month meaningful.", "Choose a ten-minute action you can repeat three times this week.", "Schedule a seven-day review: keep, change or remove one thing."],
    areas,
    strongestAreas,
    opportunityAreas,
    kaiInterpretation: {
      headline: "This is your starting point—not your ceiling.",
      summary: isBalanced
        ? "Your answers form a balanced pattern across all six areas. There is no single lowest area, so your priorities—not the score—should decide where you focus first."
        : `Your answers show ${strongestLabel} as your strongest current signal. ${opportunityLabel} offers the clearest place to focus first.`,
      focus: opportunityFocus,
    },
  };
}

function formatAreaNames(areas: AssessmentAreaResult[], fallback: string) {
  if (!areas.length) return fallback;
  if (areas.length === assessmentAreas.length) return "a balanced pattern across all six areas";
  if (areas.length === 1) return areas[0].label;
  if (areas.length === 2) return `${areas[0].label} and ${areas[1].label}`;
  return `${areas.slice(0, -1).map((area) => area.label).join(", ")}, and ${areas.at(-1)?.label}`;
}

const opportunityGuidance: Record<AssessmentAreaKey, string> = {
  clarity: "Start by naming one priority that deserves your attention before you add more activity.",
  energy: "Protect one small source of energy so the work that matters has somewhere to begin.",
  action: "Turn one stated priority into a ten-minute action you can repeat this week.",
  resilience: "Choose a simple reset you can return to when the week changes direction.",
  support: "Identify one person, tool, or system that can make the next step easier to sustain.",
  reflection: "Schedule a short weekly review so progress can guide what you keep, change, or remove.",
};

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
