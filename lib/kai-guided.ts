import type { getKaiPageContext } from "./kai-context";

export type KaiMemberContext = {
  versionSnapshot: null | {
    score?: number | null;
    focus?: string | null;
    strongest_areas?: unknown;
    opportunity_areas?: unknown;
  };
  architectAssessment: null | { status?: string | null; version_score?: number | null; section_results?: unknown };
  blueprint: null | { priorities?: unknown; strengths?: unknown; first_actions?: unknown; status?: string | null };
  goals: Array<{ title?: string | null; pillar_key?: string | null; status?: string | null; target_date?: string | null }>;
  dailyFocus: null | { priority?: string | null; action?: string | null; completed?: boolean | null };
  architectCycles: Array<{ focus?: string | null; outcome?: string | null; status?: string | null; starts_on?: string | null; ends_on?: string | null }>;
  challenges: Array<{ challenge_key?: string | null; status?: string | null; progress?: unknown; started_at?: string | null }>;
  progress: { completedDailyFocusCount: number; completedGoalCount: number; completedCycleCount: number; snapshotCount: number };
};

export type GuidedKaiResult = {
  answer: string;
  nextAction: { href: string; label: string };
  aiHandoff?: { prompt: string; customize: string };
};

type PageContext = ReturnType<typeof getKaiPageContext>;

const EMPTY_CONTEXT: KaiMemberContext = {
  versionSnapshot: null,
  architectAssessment: null,
  blueprint: null,
  goals: [],
  dailyFocus: null,
  architectCycles: [],
  challenges: [],
  progress: { completedDailyFocusCount: 0, completedGoalCount: 0, completedCycleCount: 0, snapshotCount: 0 },
};

function recordLabels(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (typeof item === "string") return [item];
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const label = record.label ?? record.title ?? record.key ?? record.name;
    return typeof label === "string" && label.trim() ? [label.trim()] : [];
  });
}

function firstText(value: unknown) {
  if (typeof value === "string") return value.trim();
  return recordLabels(value)[0] ?? "";
}

function active<T extends { status?: string | null }>(items: T[]) {
  return items.find((item) => item.status === "active" || item.status === "in_progress") ?? null;
}

function assessmentSafeguard(page: PageContext): GuidedKaiResult {
  return {
    answer: `This section is ${page.title}. ${page.purpose}\n\nI can explain the wording, purpose, or the meaning of a concept here. I will not choose an answer, suggest a 1–5 response, or steer your Version Score. Read each prompt as a description of your current experience—not who you think you should be—and select the response yourself.`,
    nextAction: page.recommendation,
  };
}

function explainPage(page: PageContext): GuidedKaiResult {
  return {
    answer: `${page.title} is ${page.purpose.charAt(0).toLowerCase()}${page.purpose.slice(1)}\n\nWhy it matters: this section turns part of your BYNV information into a clearer decision or action. Use what is true now, keep the next step small, and return later to review what changed.\n\nRecommended next step: ${page.recommendation.label}.`,
    nextAction: page.recommendation,
  };
}

function nextStep(context: KaiMemberContext, page: PageContext): GuidedKaiResult {
  if (!context.architectAssessment || context.architectAssessment.status !== "completed") {
    return { answer: "Your most useful next step is to complete—or continue—the Architect Assessment. It establishes the fuller baseline used to build your Blueprint. Your responses save as you go.", nextAction: { href: "/architect-assessment", label: "Continue Architect Assessment" } };
  }
  if (!context.blueprint) {
    return { answer: "Your Architect Assessment is complete, so the next step is to open your Blueprint. BYNV will turn the completed assessment into deterministic priorities and first actions.", nextAction: { href: "/blueprint", label: "Generate my Blueprint" } };
  }
  if (context.dailyFocus?.action && !context.dailyFocus.completed) {
    return { answer: `Stay with today’s saved action: “${context.dailyFocus.action}” Complete the smallest useful version before adding another priority.`, nextAction: { href: "/daily-focus", label: "Open today’s focus" } };
  }
  const blueprintAction = firstText(context.blueprint.first_actions);
  if (blueprintAction && !context.dailyFocus?.action) {
    return { answer: `Turn this Blueprint action into today’s focus: “${blueprintAction}” Make it specific enough to complete or visibly advance today.`, nextAction: { href: "/daily-focus", label: "Set today’s focus" } };
  }
  const goal = active(context.goals);
  if (goal?.title) {
    return { answer: `Your active goal “${goal.title}” is the clearest anchor. Choose one concrete action that advances it today, then record that action in Daily Focus.`, nextAction: { href: "/daily-focus", label: "Choose today’s action" }, aiHandoff: buildPrompt("turn an active goal into a practical action plan", context, goal.title) };
  }
  const cycle = active(context.architectCycles);
  if (cycle?.focus) {
    return { answer: `Your active Architect Cycle is focused on “${cycle.focus}.” Review its intended outcome, choose today’s smallest supporting action, and use the cycle review to keep or adjust the approach.`, nextAction: { href: "/architect-cycle", label: "Review my Architect Cycle" } };
  }
  const challenge = active(context.challenges);
  if (challenge?.challenge_key) {
    return { answer: `Continue your active challenge, “${challenge.challenge_key}.” Open it, confirm the next required practice, and record only progress you actually complete.`, nextAction: { href: "/challenges", label: "Open my challenge" } };
  }
  const priority = firstText(context.blueprint.priorities);
  return { answer: priority ? `Your Blueprint priority “${priority}” is the best place to resume. Choose one small action that can create visible evidence of progress this week.` : `Use this page for its immediate purpose, then ${page.recommendation.label.toLowerCase()}.`, nextAction: priority ? { href: "/goals", label: "Build a goal from this priority" } : page.recommendation };
}

function versionScore(context: KaiMemberContext): GuidedKaiResult {
  const snapshot = context.versionSnapshot;
  const fullScore = context.architectAssessment?.version_score;
  const score = typeof fullScore === "number" ? fullScore : snapshot?.score;
  if (typeof score !== "number") {
    return { answer: "You do not have a saved Version Score yet. The six-question Version Snapshot creates a preliminary signal; the Architect Assessment creates the fuller baseline. It is a reflection tool—not a diagnosis, clinical measure, or permanent label.", nextAction: { href: "/assessment", label: "Take the Version Snapshot" } };
  }
  const strengths = recordLabels(context.blueprint?.strengths).concat(recordLabels(snapshot?.strongest_areas));
  const opportunities = recordLabels(context.blueprint?.priorities).concat(recordLabels(snapshot?.opportunity_areas));
  const strengthText = strengths[0] ? ` Your strongest current signal is ${strengths[0]}.` : "";
  const opportunityText = opportunities[0] ? ` Your clearest opportunity area is ${opportunities[0]}.` : "";
  return {
    answer: `Your saved Version Score is ${score}/100.${strengthText}${opportunityText}\n\nThe number summarizes your own responses at one point in time. It can help you notice patterns and choose a focus. It does not diagnose you, predict your future, measure your worth, or claim scientific or clinical precision.\n\nNext, choose one opportunity area and turn it into a small action you can repeat and review.`,
    nextAction: context.blueprint ? { href: "/blueprint", label: "Review my Blueprint" } : { href: "/architect-assessment", label: "Build my fuller baseline" },
  };
}

function goalHelp(context: KaiMemberContext): GuidedKaiResult {
  const goal = active(context.goals);
  const priority = firstText(context.blueprint?.priorities);
  if (!goal?.title) {
    const anchor = priority ? ` Your Blueprint suggests starting with “${priority}.”` : "";
    return { answer: `You do not have an active saved goal yet.${anchor} Define an outcome you can recognize, connect it to one BYNV domain, and choose the first action small enough to begin this week.`, nextAction: { href: "/goals", label: "Create an Architect Goal" }, aiHandoff: buildPrompt("clarify a meaningful goal and turn it into milestones", context, priority) };
  }
  return { answer: `Start with your active goal: “${goal.title}.” Check that it names an observable outcome, then choose one milestone and one action you can complete next. Keep the goal yours; use AI only to organize possibilities, surface obstacles, or draft a plan for your review.`, nextAction: { href: "/goals", label: "Review my goal" }, aiHandoff: buildPrompt("turn my goal into milestones, obstacles, and next actions", context, goal.title) };
}

function dailyGuidance(context: KaiMemberContext): GuidedKaiResult {
  if (context.dailyFocus?.action) {
    const state = context.dailyFocus.completed ? "is marked complete" : "is still open";
    return { answer: `Today’s action ${state}: “${context.dailyFocus.action}” ${context.dailyFocus.completed ? "Record what worked and what you will adjust before choosing tomorrow’s focus." : "Protect enough time to complete the smallest useful version of it."}`, nextAction: { href: "/daily-focus", label: "Open Daily Focus" } };
  }
  return nextStep(context, { title: "Daily Focus", purpose: "your place for one priority and one deliberate action.", recommendation: { href: "/daily-focus", label: "Set today’s focus" } });
}

function progress(context: KaiMemberContext): GuidedKaiResult {
  const facts = [
    `${context.progress.snapshotCount} saved Snapshot${context.progress.snapshotCount === 1 ? "" : "s"}`,
    `${context.progress.completedDailyFocusCount} completed Daily Focus action${context.progress.completedDailyFocusCount === 1 ? "" : "s"}`,
    `${context.progress.completedGoalCount} completed goal${context.progress.completedGoalCount === 1 ? "" : "s"}`,
    `${context.progress.completedCycleCount} completed Architect Cycle${context.progress.completedCycleCount === 1 ? "" : "s"}`,
  ];
  if (context.architectAssessment?.status === "completed") facts.splice(1, 0, "a completed Architect Assessment");
  return { answer: `Here is the progress BYNV can confirm from your saved records: ${facts.join(", ")}.\n\nThis is a factual activity summary, not proof that every part of life improved. Use Progress to compare saved evidence over time and decide what to keep, change, or stop.`, nextAction: { href: "/progress", label: "Review my progress" } };
}

function buildPrompt(task: string, context: KaiMemberContext, focus = ""): GuidedKaiResult["aiHandoff"] {
  const allowed: string[] = [];
  if (focus) allowed.push(`Current focus: ${focus}`);
  else if (context.dailyFocus?.priority) allowed.push(`Current priority: ${context.dailyFocus.priority}`);
  const goal = active(context.goals);
  if (goal?.title && goal.title !== focus) allowed.push(`Active goal: ${goal.title}`);
  const blueprintPriority = firstText(context.blueprint?.priorities);
  if (blueprintPriority && blueprintPriority !== focus) allowed.push(`Blueprint priority: ${blueprintPriority}`);
  const contextBlock = allowed.length ? allowed.slice(0, 3).join("\n") : "Relevant context: [Add only what this task requires.]";
  return {
    prompt: `Act as a practical thinking partner. Help me ${task}.\n\n${contextBlock}\n\nBefore answering, ask up to three short questions only if essential information is missing. Then provide:\n1. A clear outcome or decision to aim for.\n2. The smallest useful next steps in order.\n3. Likely obstacles and simple responses.\n4. What I should verify or decide myself.\n\nDo not make purchases, send messages, publish anything, or make high-stakes decisions for me. State assumptions clearly and distinguish facts from suggestions.`,
    customize: "Review the prompt, replace bracketed text, and add only task-relevant context. Do not include passwords, credentials, journal entries, or information you are not allowed to share.",
  };
}

function aiPrompt(message: string, context: KaiMemberContext): GuidedKaiResult {
  const task = message.replace(/use ai for this|build (?:me )?(?:an )?ai prompt|create (?:me )?(?:an )?ai prompt|ai handoff/gi, "").trim() || "turn my current priority into a clear action plan";
  return { answer: "I built a portable prompt using only the BYNV context needed for this task. Review it before copying, customize anything in brackets, and keep sensitive information out.", nextAction: { href: "/daily-focus", label: "Open AI Leverage" }, aiHandoff: buildPrompt(task, context) };
}

export function buildGuidedKaiResponse(args: { message: string; intent?: string; page: PageContext; context?: KaiMemberContext | null; assessmentMode: boolean }): GuidedKaiResult {
  const context = args.context ?? EMPTY_CONTEXT;
  const text = `${args.intent ?? ""} ${args.message}`.toLowerCase();
  if (args.assessmentMode) return assessmentSafeguard(args.page);
  if (/explain this|this page|what is this section/.test(text)) return explainPage(args.page);
  if (/version score|my score|strongest|opportunity area/.test(text)) return versionScore(context);
  if (/what should i do next|next action|next step/.test(text)) return nextStep(context, args.page);
  if (/daily guidance|today|daily focus/.test(text)) return dailyGuidance(context);
  if (/progress|history|how am i doing/.test(text)) return progress(context);
  if (/goal/.test(text) && !/page/.test(text)) return goalHelp(context);
  if (/use ai|ai prompt|copy prompt|handoff|brainstorm|research|draft|learn a skill|break .* into steps|analy[sz]e options|routine/.test(text)) return aiPrompt(args.message, context);
  return {
    answer: "I can help you navigate BYNV, understand your Blueprint or Version Score, choose a next action, review saved progress, work with a goal, or build a prompt you can use with your own AI assistant. Choose one of those directions and I’ll guide you with the BYNV context available here.",
    nextAction: args.page.recommendation,
    aiHandoff: buildPrompt("work through this question using a clear, responsible process", context, args.message),
  };
}
