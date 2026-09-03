export type ArchitectQuestion = {
  id: string;
  prompt: string;
  type: "scale" | "text";
  help?: string;
  scaleLabels?: readonly [string, string, string, string, string];
};

export type ArchitectSection = {
  key: string;
  label: string;
  description: string;
  questions: ArchitectQuestion[];
};

const frequencyScale = ["Not true for me", "Rarely true", "Sometimes true", "Often true", "Consistently true"] as const;
const scale = (id: string, prompt: string, help?: string): ArchitectQuestion => ({ id, prompt, type: "scale", help, scaleLabels: frequencyScale });
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
      scale("clarity-priorities", "I can identify the two or three priorities that matter most in my life right now."),
      scale("clarity-direction", "I can describe the person I want to become over the next year in concrete terms."),
      scale("clarity-decisions", "When two demands compete, my priorities help me decide what to do."),
      scale("clarity-values", "In a typical week, the way I use my time reflects what I say matters to me."),
      scale("clarity-first-focus", "I know which part of my life needs focused attention first."),
      text("clarity-reflection", "What specific change would make the next 90 days feel meaningfully different?", "A few honest sentences are enough."),
    ],
  },
  {
    key: "energy",
    label: "Energy & Wellbeing",
    description: "The physical and mental capacity available for the life you want to build.",
    questions: [
      scale("energy-rest", "Most days, my sleep and rest leave me able to meet my responsibilities."),
      scale("energy-routines", "My usual routines help me maintain usable energy through the day."),
      scale("energy-awareness", "I can identify which habits and situations raise or drain my energy."),
      scale("energy-boundaries", "I limit demands before I reach the point of exhaustion."),
      scale("energy-recovery", "After a demanding day or week, I use reliable ways to recover."),
      text("energy-reflection", "What most consistently gives you energy, and what most consistently drains it?"),
    ],
  },
  {
    key: "action",
    label: "Action & Consistency",
    description: "How reliably your priorities become repeatable action.",
    questions: [
      scale("action-weekly", "In a typical week, I take action on the priorities I have named."),
      scale("action-start", "I begin important work even when the timing or conditions are not ideal."),
      scale("action-finish", "I complete the important commitments I make to myself or others."),
      scale("action-systems", "I use reminders, routines, or other simple systems to repeat useful actions."),
      scale("action-review", "When an approach is not working, I change it instead of repeating it unchanged."),
      text("action-reflection", "Which important action do you intend to take but struggle to repeat?"),
    ],
  },
  {
    key: "resilience",
    label: "Resilience & Adaptability",
    description: "Your ability to respond to change without abandoning your direction.",
    questions: [
      scale("resilience-reset", "After a setback, I return to useful action within a reasonable time."),
      scale("resilience-flexibility", "When circumstances change, I adapt my plan while keeping the intended outcome in view."),
      scale("resilience-learning", "After a mistake, I identify what to change the next time."),
      scale("resilience-pressure", "When I feel pressure, I can still choose a constructive next step."),
      scale("resilience-self-trust", "When the outcome is uncertain, I can make the next decision without needing complete certainty."),
      text("resilience-reflection", "What challenge or pattern is creating the most friction for you now?"),
    ],
  },
  {
    key: "relationships",
    label: "Relationships & Support",
    description: "The people, communication, and support structures around your growth.",
    questions: [
      scale("relationships-support", "I have at least one person I can ask for honest support when I need it."),
      scale("relationships-presence", "I give the relationships that matter to me regular, undistracted attention."),
      scale("relationships-communication", "I state my needs and limits clearly rather than expecting others to guess."),
      scale("relationships-community", "I participate in a group or community where mutual growth is supported."),
      scale("relationships-contribution", "I give support to others without routinely exceeding my own capacity."),
      text("relationships-reflection", "What kind of support would make your next step more realistic?"),
    ],
  },
  {
    key: "environment",
    label: "Environment & Systems",
    description: "The spaces, tools, and structures that shape what becomes easy or difficult.",
    questions: [
      scale("environment-space", "The spaces where I spend the most time make it easier to focus on important work."),
      scale("environment-tools", "I can find the tools and information I regularly need without unnecessary delay."),
      scale("environment-distraction", "I remove or limit distractions that repeatedly interrupt important tasks."),
      scale("environment-calendar", "My calendar includes protected time for my stated priorities."),
      scale("environment-support", "My current routines and systems make my intended actions easier to complete."),
      text("environment-reflection", "What single change to your space, schedule, or tools would remove the most friction?"),
    ],
  },
  {
    key: "growth",
    label: "Reflection & Growth",
    description: "How deliberately you learn, review progress, and evolve your approach.",
    questions: [
      scale("growth-review", "I set aside time to review which actions are working and which are not."),
      scale("growth-feedback", "I ask for specific feedback when another perspective would improve my decision."),
      scale("growth-progress", "I can name concrete evidence of progress from the past 90 days."),
      scale("growth-learning", "I make time to learn a skill that directly supports one of my current priorities."),
      scale("growth-next-version", "I stop habits or commitments when evidence shows they no longer support my direction."),
      text("growth-reflection", "What would you like to begin now that could matter to you a year from today?"),
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
