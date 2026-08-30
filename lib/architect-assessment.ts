export type ArchitectQuestion = {
  id: string;
  prompt: string;
  type: "scale" | "text";
  help?: string;
};

export type ArchitectSection = {
  key: string;
  label: string;
  description: string;
  questions: ArchitectQuestion[];
};

const scale = (id: string, prompt: string, help?: string): ArchitectQuestion => ({ id, prompt, type: "scale", help });
const text = (id: string, prompt: string, help?: string): ArchitectQuestion => ({ id, prompt, type: "text", help });

/**
 * Configurable V1 question bank. Product copy can be reviewed independently of
 * the assessment UI and persistence layer. Scale responses are 1–5; reflection
 * responses add context but are intentionally excluded from score calculations.
 */
export const architectSections: ArchitectSection[] = [
  {
    key: "clarity",
    label: "Clarity & Direction",
    description: "What matters, where you are headed, and why it deserves your attention.",
    questions: [
      scale("clarity-priorities", "I can name the priorities that matter most to me right now."),
      scale("clarity-direction", "I have a clear picture of the next version of myself I want to build."),
      scale("clarity-decisions", "My priorities make everyday decisions easier."),
      scale("clarity-values", "The way I spend my time reflects what I say I value."),
      scale("clarity-first-focus", "I know which area of my life deserves focused attention first."),
      text("clarity-reflection", "What would meaningful progress look like over the next 90 days?", "A few honest sentences are enough."),
    ],
  },
  {
    key: "energy",
    label: "Energy & Wellbeing",
    description: "The physical and mental capacity available for the life you want to build.",
    questions: [
      scale("energy-rest", "My sleep and rest usually support the demands of my life."),
      scale("energy-routines", "My daily routines protect rather than drain my energy."),
      scale("energy-awareness", "I notice the habits and situations that change my energy."),
      scale("energy-boundaries", "I set reasonable boundaries before I become depleted."),
      scale("energy-recovery", "I have reliable ways to reset after a demanding day or week."),
      text("energy-reflection", "What most consistently gives you energy, and what most consistently drains it?"),
    ],
  },
  {
    key: "action",
    label: "Action & Consistency",
    description: "How reliably your priorities become repeatable action.",
    questions: [
      scale("action-weekly", "My weekly actions reflect my stated priorities."),
      scale("action-start", "I can begin important work without waiting for ideal conditions."),
      scale("action-finish", "I finish the commitments that matter most."),
      scale("action-systems", "I use simple systems to make useful actions easier to repeat."),
      scale("action-review", "I adjust my approach when an action is not producing the result I need."),
      text("action-reflection", "Which important action is currently hardest for you to repeat?"),
    ],
  },
  {
    key: "resilience",
    label: "Resilience & Adaptability",
    description: "Your ability to respond to change without abandoning your direction.",
    questions: [
      scale("resilience-reset", "I can recover my footing after a setback."),
      scale("resilience-flexibility", "I can change the plan without losing sight of the outcome."),
      scale("resilience-learning", "I treat mistakes as information I can use."),
      scale("resilience-pressure", "Under pressure, I can still choose a constructive next step."),
      scale("resilience-self-trust", "I trust myself to handle uncertainty one decision at a time."),
      text("resilience-reflection", "What challenge or pattern is creating the most friction for you now?"),
    ],
  },
  {
    key: "relationships",
    label: "Relationships & Support",
    description: "The people, communication, and support structures around your growth.",
    questions: [
      scale("relationships-support", "I have people I can turn to for honest support."),
      scale("relationships-presence", "I give important relationships meaningful attention."),
      scale("relationships-communication", "I communicate my needs and boundaries clearly."),
      scale("relationships-community", "I feel connected to a community or circle that helps me grow."),
      scale("relationships-contribution", "I contribute to my relationships in ways that feel aligned and sustainable."),
      text("relationships-reflection", "What relationship or support system would make your next step easier?"),
    ],
  },
  {
    key: "environment",
    label: "Environment & Systems",
    description: "The spaces, tools, and structures that shape what becomes easy or difficult.",
    questions: [
      scale("environment-space", "My primary spaces help me focus on what matters."),
      scale("environment-tools", "The tools and information I rely on are organized and easy to use."),
      scale("environment-distraction", "I actively reduce avoidable distractions."),
      scale("environment-calendar", "My calendar protects time for important priorities."),
      scale("environment-support", "My current systems support the person I am becoming."),
      text("environment-reflection", "What one change to your environment would remove the most friction?"),
    ],
  },
  {
    key: "growth",
    label: "Reflection & Growth",
    description: "How deliberately you learn, review progress, and evolve your approach.",
    questions: [
      scale("growth-review", "I regularly review what is and is not working."),
      scale("growth-feedback", "I seek useful feedback instead of relying only on assumptions."),
      scale("growth-progress", "I can point to evidence of progress over the past 90 days."),
      scale("growth-learning", "I make time to learn skills that support my priorities."),
      scale("growth-next-version", "I am willing to release habits or identities that no longer fit where I am going."),
      text("growth-reflection", "What do you most want your future self to thank you for beginning now?"),
    ],
  },
];

export const architectQuestionCount = architectSections.reduce((total, section) => total + section.questions.length, 0);
export const architectScoredQuestionCount = architectSections.reduce(
  (total, section) => total + section.questions.filter((question) => question.type === "scale").length,
  0,
);

export type ArchitectAnswers = Record<string, number | string>;

export function calculateArchitectResults(answers: ArchitectAnswers) {
  const sections = architectSections.map((section) => {
    const values = section.questions
      .filter((question) => question.type === "scale")
      .map((question) => answers[question.id])
      .filter((value): value is number => typeof value === "number" && value >= 1 && value <= 5);
    const percent = values.length
      ? Math.round((values.reduce((sum, value) => sum + value, 0) / (values.length * 5)) * 100)
      : 0;
    return { key: section.key, label: section.label, score: percent, answered: values.length };
  });
  const allValues = architectSections.flatMap((section) => section.questions)
    .filter((question) => question.type === "scale")
    .map((question) => answers[question.id])
    .filter((value): value is number => typeof value === "number" && value >= 1 && value <= 5);
  const score = allValues.length
    ? Math.round((allValues.reduce((sum, value) => sum + value, 0) / (allValues.length * 5)) * 100)
    : 0;
  return { score, sections, scoredAnswers: allValues.length };
}
