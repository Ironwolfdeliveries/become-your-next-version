import type { getKaiPageContext } from "./kai-context";

export type KaiDailyContext = {
  id?: string; focus_date?: string; priority?: string | null; action?: string | null; completed?: boolean | null;
  steps?: Array<{ id: string; text: string; done: boolean }> | null;
  check_in?: "done" | "progress" | "missed" | null;
  recovery?: { strategy?: string; next_date: string; next_action: string } | null;
  cycle_id?: string | null;
};
export type KaiMemberContext = {
  member?: { today: string; timezone: string; name?: string; orientationComplete?: boolean };
  versionSnapshot: null | {
    score?: number | null; focus?: string | null; strongest_areas?: unknown; opportunity_areas?: unknown;
  };
  architectAssessment: null | { status?: string | null; version_score?: number | null; section_results?: unknown };
  blueprint: null | { priorities?: unknown; strengths?: unknown; first_actions?: unknown; status?: string | null };
  goals: Array<{ title?: string | null; pillar_key?: string | null; status?: string | null; target_date?: string | null; success_vision?: string | null; commitment_rule?: string | null }>;
  dailyFocus: KaiDailyContext | null;
  unresolvedActions?: KaiDailyContext[];
  architectCycles: Array<{ id?: string; focus?: string | null; outcome?: string | null; status?: string | null; starts_on?: string | null; ends_on?: string | null; success_vision?: string | null; plan_steps?: string[] | null; remaining_steps?: string[]; commitment_rule?: string | null; day?: number; total_days?: number; review_due?: boolean }>;
  challenges: Array<{ challenge_key?: string | null; status?: string | null; progress?: unknown; started_at?: string | null }>;
  progress: { completedDailyFocusCount: number; completedGoalCount: number; completedCycleCount: number; snapshotCount: number; completedActionCount?: number; buildStreak?: number; actionsThisWeek?: number };
};

export type GuidedKaiResult = {
  answer: string;
  nextAction: { href: string; label: string };
  aiHandoff?: { prompt: string; customize: string };
};

const URGENT_SAFETY_PATTERNS = [
  /\b(?:kill(?:ing)?|hurt(?:ing)?|harm(?:ing)?)\s+(?:myself|someone|somebody|another person|him|her|them)\b/i,
  /\bcut(?:ting)?\s+myself\b(?!\s+some\s+slack)/i,
  /\b(?:shoot(?:ing)?|stab(?:bing)?|poison(?:ing)?|drown(?:ing)?|hang(?:ing)?|strangl(?:e|ing)|attack(?:ing)?)\s+(?:myself|someone|somebody|another person|him|her|them)\b/i,
  /\b(?:end|take)\s+my\s+(?:life|own life)\b/i,
  /\bend\s+it\s+all\b/i,
  /\b(?:do not|don['’]?t|dont)\s+want\s+to\s+(?:live|be alive|wake up)\b/i,
  /\b(?:want|wish|hope)\s+(?:to\s+)?(?:die|be dead|not wake up(?!\s+(?:late|early|on\s+time)))\b/i,
  /\bwish\s+i\s+(?:wasn['’]?t|weren['’]?t|were\s+not)\s+alive\b/i,
  /\bbetter\s+off\s+dead\b/i,
  /\b(?:plan|planning|intend|intending|going|about|thinking)\s+(?:about|of|to)?\s*(?:commit(?:ting)?\s+)?suicide\b/i,
  /\b(?:about|going|planning)\s+to\s+jump\s+(?:off|in front of)\b/i,
  /\b(?:jump|jumping|throwing myself)\s+(?:off|in front of)\s+(?:a|the|this)?\s*(?:bridge|building|roof|train|traffic)\b/i,
  /\b(?:pills|medication|tablets)\b[\s\S]{0,80}\b(?:take|swallow)(?:ing)?\s+(?:them\s+)?all\b/i,
  /\b(?:take|swallow)(?:ing)?\s+(?:all|too many)\b[\s\S]{0,50}\b(?:pills|medication|tablets)\b/i,
  /\b(?:gun|firearm|weapon)\s+(?:against|to|at)\s+(?:my|the)\s+(?:head|chest)\b/i,
];

function hasUrgentSafetySignal(message: string, recentMessages: string[]) {
  const text = message.toLowerCase();
  const personalSuicideSignal =
    /\b(?:i\s+am|i['’]?m|im|feel|feeling|been)\s+(?:actively\s+)?(?:suicidal|thinking\s+about\s+suicide)\b/.test(
      text,
    ) || /\bmy\s+(?:suicidal\s+thoughts|thoughts\s+of\s+suicide)\b/.test(text);
  if (personalSuicideSignal) return true;
  if (URGENT_SAFETY_PATTERNS.some((pattern) => pattern.test(message)))
    return true;
  if (
    /\b(?:cannot|can['’]?t|cant|do not think i can|don['’]?t think i can)\s+keep\s+myself\s+safe\b/.test(
      text,
    ) || /\bnot\s+safe\s+(?:from|with)\s+myself\b/.test(text)
  )
    return true;

  const educationalContext =
    /\b(?:warning signs?|symptoms?|definition|define|meaning|statistics?|research|article|essay|school|class|presentation|prevention|awareness|how (?:can|do) i help someone)\b/.test(
      text,
    );
  const threatMatch = text.match(
    /\bi\s+(?:(?:(?:am|['’]m)\s+)?(?:planning|going|about|ready|intending)\s+(?:to\s+)?|(?:plan|intend|want|will|might|threaten)\s+(?:to\s+)?)(?:kill|hurt|harm|stab|attack|poison|strangle|choke|murder|shoot|hit|beat(?:\s+up)?)\s+([^.!?]{1,60})/,
  );
  const threatTarget = threatMatch?.[1]?.trim() ?? "";
  const threatTargetHead =
    threatTarget
      .split(
        /\b(?:after|before|during|from|because|when|while|if|with|using|through)\b/,
        1,
      )[0]
      ?.trim() ?? "";
  const benignThreatTarget =
    /\b(?:less|problem|problems|computer|process|program|server|task|time|video|photo|movie|game|fiction|story|character|song|recipe|garden|weed|weeds|business|sales|career|reputation|procrastination|record|appetite|habit|habits|deadline|deadlines|project|projects|backlog|debt|debts|engine|engines|bug|bugs|workout|workouts|exercise|exercises|routine)\b/.test(
      threatTargetHead,
    );
  if (
    threatTargetHead &&
    !benignThreatTarget &&
    !educationalContext
  )
    return true;
  const runOverThreat =
    /\bi\s+(?:(?:(?:am|['’]m)\s+)?(?:planning|going|about|ready|intending)\s+(?:to\s+)?|(?:plan|intend|want|will|might)\s+(?:to\s+)?)run\s+([^.!?]{1,40})\s+over\b/.exec(
      text,
    );
  if (
    runOverThreat?.[1] &&
    !/\b(?:test|tests|program|simulation|drill)\b/.test(runOverThreat[1])
  )
    return true;

  const namesFirearm = /\b(?:loaded\s+)?(?:gun|firearm|weapon)\b/.test(text);
  const dangerousWeaponUse =
    /\b(?:plan|planning|intend|intending|going|about|ready|want)\s+to\s+(?:use|fire|shoot|pull)\b/.test(
      text,
    ) ||
    /\b(?:use|fire|shoot)\s+(?:it|this|the\s+(?:gun|firearm|weapon))\s+(?:on|at)\s+(?:myself|someone|somebody|him|her|them|people)\b/.test(
      text,
    );
  const safeWeaponContext = /\b(?:safe storage|store safely|lock(?:ing)? it|gun range|shooting range|target practice|clean(?:ing)? it|unload(?:ing)? it)\b/.test(
    text,
  );
  const dangerousWeaponProximity =
    /\bloaded\s+(?:gun|firearm|weapon)\b[\s\S]{0,40}\b(?:next to me|beside me|with me|in my hand)\b/.test(
      text,
    );
  if (dangerousWeaponProximity && !safeWeaponContext) return true;
  if (
    namesFirearm &&
    dangerousWeaponUse &&
    !safeWeaponContext &&
    !educationalContext
  )
    return true;

  const priorText = recentMessages.slice(-2).join("\n").toLowerCase();
  const priorNamesFirearm = /\b(?:loaded\s+)?(?:gun|firearm|weapon)\b/.test(
    priorText,
  );
  const referentialWeaponIntent = /\b(?:going|about|planning|intend|ready)\s+to\s+(?:use|fire|shoot)\s+(?:it|this)\b/.test(
    text,
  );
  if (priorNamesFirearm && referentialWeaponIntent && !safeWeaponContext)
    return true;

  const priorNamesMedication = /\b(?:pills|medication|tablets)\b/.test(
    priorText,
  );
  const referentialOverdoseIntent = /\b(?:take|swallow)(?:ing)?\s+(?:them|it)?\s*(?:all|too many)\b|\boverdose\b/.test(
    text,
  );
  return priorNamesMedication && referentialOverdoseIntent;
}

export function buildKaiSafetyResponse(
  message: string,
  recentMessages: string[] = [],
): GuidedKaiResult | null {
  if (!hasUrgentSafetySignal(message, recentMessages)) return null;
  return {
    answer:
      "I'm sorry you're dealing with this. Kai is not crisis support. If you or someone else may be in immediate danger, call your local emergency number now (911 in the United States). In the United States and its territories, call or text 988, or use the 988 Lifeline chat. If you can, tell a trusted person nearby and ask them to stay with you while you connect with immediate help.",
    nextAction: {
      href: "https://988lifeline.org/",
      label: "Call, text, or chat with 988",
    },
  };
}

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
    const label = record.label ?? record.title ?? record.action ?? record.key ?? record.name;
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

function savedSteps(entry: KaiDailyContext | null | undefined) {
  if (entry?.steps?.length) return entry.steps;
  return entry?.action ? [{ id: "legacy", text: entry.action, done: Boolean(entry.completed) }] : [];
}

function commitmentText(rule: string | null | undefined) {
  const labels: Record<string, string> = {
    recommit: "recommit within 24 hours", blocker: "tell Kai what blocked you", shrink: "make the next action smaller",
    reset: "take a 10-minute reset", partner: "check in with your accountability partner",
  };
  return rule && labels[rule] ? ` Your chosen commitment rule is to ${labels[rule]}.` : "";
}

function recoveryStep(context: KaiMemberContext): GuidedKaiResult | null {
  const today = context.dailyFocus;
  const incompleteToday = today && !today.recovery && (today.check_in === "missed" || today.check_in === "progress") && savedSteps(today).some(step => !step.done) ? today : null;
  const earlier = [...(context.unresolvedActions || [])].filter(entry => !entry.recovery && savedSteps(entry).some(step => !step.done))
    .sort((a, b) => (a.focus_date || "").localeCompare(b.focus_date || ""))[0];
  const entry = incompleteToday || earlier;
  if (!entry) return null;
  const step = savedSteps(entry).find(item => !item.done);
  const cycle = context.architectCycles.find(item => item.id && item.id === entry.cycle_id);
  const when = entry === incompleteToday ? "Today’s" : `Your ${entry.focus_date || "earlier"}`;
  return { answer: `${when} plan still has an unfinished step: “${step?.text}”${commitmentText(cycle?.commitment_rule)} We can keep it, make it smaller, reschedule it, or choose another approach. Pick one next move for the unfinished plan; your original steps stay in your history. What would make the next attempt more doable?`, nextAction: { href: "/daily-focus", label: "Adjust my next step" } };
}

function nextStep(context: KaiMemberContext): GuidedKaiResult {
  if (!context.architectAssessment || context.architectAssessment.status !== "completed") {
    return { answer: "Your most useful next step is to complete—or continue—the Architect Assessment. Your answers will shape your Blueprint, and they save as you go.", nextAction: { href: "/architect-assessment", label: "Continue Architect Assessment" } };
  }
  if (!context.blueprint) {
    return { answer: "Your Architect Assessment is complete, so the next step is to open your Blueprint. BYNV will turn your answers into clear priorities and first actions.", nextAction: { href: "/blueprint", label: "Generate my Blueprint" } };
  }
  const recovery = recoveryStep(context);
  if (recovery) return recovery;
  const cycle = active(context.architectCycles);
  if (cycle?.review_due) {
    return { answer: `Your Architect Cycle “${cycle.focus}” is ready to review.${cycle.success_vision ? ` You wanted to see: “${cycle.success_vision}”.` : ""} Compare where you started with what actually changed, then choose what to carry into your next 14 days. A brief review is enough.`, nextAction: { href: "/architect-cycle", label: "Review my Cycle and choose what’s next" } };
  }
  const todaySteps = savedSteps(context.dailyFocus);
  const openStep = todaySteps.find(step => !step.done);
  if (context.dailyFocus?.recovery) {
    return { answer: `You’ve already given this plan a next move: “${context.dailyFocus.recovery.next_action}”, saved for ${context.dailyFocus.recovery.next_date}. Your original steps remain in your history. You can continue with that plan when the day comes.`, nextAction: { href: "/daily-focus", label: "View my saved next step" } };
  }
  if (openStep && !context.dailyFocus?.completed && context.dailyFocus?.check_in !== "done") {
    return { answer: `Stay with today’s saved action: “${openStep.text}” Complete the smallest useful version before adding another priority. Check it off in Today’s Plan when it’s done; your progress will be saved.`, nextAction: { href: "/daily-focus", label: "Open Today’s Plan" } };
  }
  if (context.dailyFocus?.completed || context.dailyFocus?.check_in === "done" || (todaySteps.length && !openStep)) {
    const count = context.progress.actionsThisWeek;
    return { answer: `Today’s plan is complete.${typeof count === "number" ? ` That’s ${count} completed ${count === 1 ? "action" : "actions"} in the last seven days.` : ""} You can call today done. A note is optional. When you return, we’ll continue from your saved Cycle and progress.`, nextAction: { href: "/momentum", label: "See my momentum" } };
  }
  if (cycle?.focus) {
    const action = (cycle.remaining_steps ?? cycle.plan_steps)?.find(step => step.trim());
    return { answer: `Your current Architect Cycle is “${cycle.focus}”.${cycle.day && cycle.total_days ? ` You’re on Day ${cycle.day} of ${cycle.total_days}.` : ""}${action ? ` Start with “${action}”.` : ` Choose one small action that directly supports that focus.`}${cycle.success_vision ? ` You’re working toward: “${cycle.success_vision}”.` : ""} Today’s Plan will help you keep it to one to three realistic steps.`, nextAction: { href: "/daily-focus", label: "Build Today’s Plan from my Cycle" } };
  }
  if (context.member?.orientationComplete === false) {
    return { answer: "Your Blueprint is ready. Take the short BYNV walkthrough, then choose what you want to improve. I’ll help you turn that choice into a realistic first 14-day Cycle.", nextAction: { href: "/orientation", label: "See how BYNV works" } };
  }
  const goal = active(context.goals);
  if (goal?.title) {
    return { answer: `Your active goal “${goal.title}” is a useful anchor.${goal.success_vision ? ` Success would look like: “${goal.success_vision}”.` : ""} Let’s build a short Cycle around it, then choose one concrete step for today.`, nextAction: { href: "/architect-cycle", label: "Build my 14-day Cycle" }, aiHandoff: buildPrompt("turn an active goal into a practical action plan", context, goal.title) };
  }
  return { answer: "What would you genuinely like to be different? Choose your own direction first. Your Blueprint can help if you want ideas; it does not choose for you.", nextAction: { href: "/architect-cycle", label: "Choose my first Cycle" } };
}

function versionScore(context: KaiMemberContext): GuidedKaiResult {
  const snapshot = context.versionSnapshot;
  const fullScore = context.architectAssessment?.version_score;
  const score = typeof fullScore === "number" ? fullScore : snapshot?.score;
  if (typeof score !== "number") {
    return { answer: "You do not have a saved Version Score yet. The six-question Version Snapshot gives you a quick starting point, while the Architect Assessment gives you a fuller view. It is a reflection tool—not a diagnosis, clinical measure, or permanent label.", nextAction: { href: "/assessment", label: "Take the Version Snapshot" } };
  }
  const strengths = recordLabels(context.blueprint?.strengths).concat(recordLabels(snapshot?.strongest_areas));
  const opportunities = recordLabels(context.blueprint?.priorities).concat(recordLabels(snapshot?.opportunity_areas));
  const strengthText = strengths[0] ? ` Your strongest area right now is ${strengths[0]}.` : "";
  const opportunityText = opportunities[0] ? ` Your clearest opportunity area is ${opportunities[0]}.` : "";
  return {
    answer: `Your saved Version Score is ${score}/100.${strengthText}${opportunityText}\n\nThe number summarizes your own responses at one point in time. It can help you notice patterns and choose a focus. It does not diagnose you, predict your future, measure your worth, or claim scientific or clinical precision.\n\nNext, choose one opportunity area and turn it into a small action you can repeat and review.`,
    nextAction: context.blueprint ? { href: "/blueprint", label: "Review my Blueprint" } : { href: "/architect-assessment", label: "Complete my full assessment" },
  };
}

function goalHelp(context: KaiMemberContext): GuidedKaiResult {
  const goal = active(context.goals);
  if (!goal?.title) {
    return { answer: "What would you genuinely like to be different? Start with what matters to you. We can work out how to recognize progress and choose a manageable first step together.", nextAction: { href: "/goals", label: "Choose my own goal" } };
  }
  return { answer: `Start with your active goal: “${goal.title}.” Check that it names an observable outcome, then choose one milestone and one action you can complete next. Keep the goal yours; use AI only to organize possibilities, surface obstacles, or draft a plan for your review.`, nextAction: { href: "/goals", label: "Review my goal" }, aiHandoff: buildPrompt("turn my goal into milestones, obstacles, and next actions", context, goal.title) };
}

function dailyGuidance(context: KaiMemberContext): GuidedKaiResult {
  return nextStep(context);
}

function progress(context: KaiMemberContext): GuidedKaiResult {
  const facts = [
    `${context.progress.snapshotCount} saved Snapshot${context.progress.snapshotCount === 1 ? "" : "s"}`,
    `${context.progress.completedActionCount ?? context.progress.completedDailyFocusCount} completed action${(context.progress.completedActionCount ?? context.progress.completedDailyFocusCount) === 1 ? "" : "s"}`,
    `${context.progress.completedGoalCount} completed goal${context.progress.completedGoalCount === 1 ? "" : "s"}`,
    `${context.progress.completedCycleCount} completed Architect Cycle${context.progress.completedCycleCount === 1 ? "" : "s"}`,
  ];
  if (context.architectAssessment?.status === "completed") facts.splice(1, 0, "a completed Architect Assessment");
  return { answer: `Here is the progress BYNV can confirm from your saved records: ${facts.join(", ")}.\n\nThis is a factual activity summary, not proof that every part of life improved. Use Momentum to compare saved evidence over time and decide what to keep, change, or stop.`, nextAction: { href: "/momentum", label: "Review my progress" } };
}

function buildPrompt(task: string, context: KaiMemberContext, focus = ""): GuidedKaiResult["aiHandoff"] {
  const allowed: string[] = [];
  const cycle = active(context.architectCycles);
  const goal = active(context.goals);
  if (focus) allowed.push(`Current focus: ${focus}`);
  else if (context.dailyFocus?.priority) allowed.push(`Current priority: ${context.dailyFocus.priority}`);
  else if (cycle?.focus) allowed.push(`Current Cycle: ${cycle.focus}`);
  const taskWords = new Set(task.toLowerCase().match(/\b[a-z]{4,}\b/g) || []);
  const namesGoal = goal?.title?.toLowerCase().split(/\W+/).some(word => taskWords.has(word));
  if (goal?.title && goal.title !== focus && (!cycle || namesGoal)) allowed.push(`Active goal: ${goal.title}`);
  if (cycle?.focus && cycle.focus !== focus && !allowed.some(item => item.startsWith("Current Cycle:"))) allowed.push(`Current Cycle: ${cycle.focus}`);
  const blueprintPriority = firstText(context.blueprint?.priorities);
  if (!cycle && !goal && !focus && blueprintPriority) allowed.push(`Blueprint starting point: ${blueprintPriority}`);
  const contextBlock = allowed.length ? allowed.slice(0, 3).join("\n") : "Relevant context: [Add only what this task requires.]";
  return {
    prompt: `Act as a practical thinking partner. Help me ${task}.\n\n${contextBlock}\n\nBefore answering, ask up to three short questions only if essential information is missing. Then provide:\n1. A clear outcome or decision to aim for.\n2. The smallest useful next steps in order.\n3. Likely obstacles and simple responses.\n4. What I should verify or decide myself.\n\nDo not make purchases, send messages, publish anything, or make high-stakes decisions for me. State assumptions clearly and distinguish facts from suggestions.`,
    customize: "Review the prompt, replace bracketed text, and add only task-relevant context. Do not include passwords, credentials, journal entries, or information you are not allowed to share.",
  };
}

function aiPrompt(message: string, context: KaiMemberContext): GuidedKaiResult {
  const task = message.replace(/use ai for this|build (?:me )?(?:an )?ai prompt|create (?:me )?(?:an )?ai prompt|ai handoff/gi, "").trim() || "turn my current priority into a clear action plan";
  return { answer: "I built a portable prompt using only the BYNV context needed for this task. Review it before copying, customize anything in brackets, and keep sensitive information out.", nextAction: { href: "/daily-focus", label: "Open Today’s Plan and AI help" }, aiHandoff: buildPrompt(task, context) };
}

export function buildGuidedKaiResponse(args: { message: string; intent?: string; page: PageContext; context?: KaiMemberContext | null; assessmentMode: boolean }): GuidedKaiResult {
  const context = args.context ?? EMPTY_CONTEXT;
  const text = `${args.intent ?? ""} ${args.message}`.toLowerCase();
  const urgent = buildKaiSafetyResponse(args.message);
  if (urgent) return urgent;
  if (args.assessmentMode) return assessmentSafeguard(args.page);
  if (args.context === null && /next|today|daily|goal|progress|my (?:version )?score|my blueprint|missed|commitment/.test(text)) {
    return { answer: "I don’t have your saved journey available right now. Open your dashboard to sign in or retry loading it. I can still explain how this page works, but I won’t guess what you’ve completed.", nextAction: { href: "/dashboard", label: "Open my dashboard" } };
  }
  if (/examples|ideas|i.?m stuck|not sure what (to choose|i want)/.test(text)) return { answer: "This could involve health, work, relationships, organization, money habits, confidence, finishing something you delayed, or something completely different. What matters to you?", nextAction: {href:"/goals",label:"Choose my own direction"} };
  if (/explain this|this page|what is this section/.test(text)) return explainPage(args.page);
  if (/version score|my score|strongest|opportunity area/.test(text)) return versionScore(context);
  if (/what should i do next|next action|next step/.test(text)) return nextStep(context);
  if (/daily guidance|today|daily focus|made progress|got it done|missed|didn[’']?t happen|make it smaller|reschedule|recommit|got in the way|commitment rule/.test(text)) return dailyGuidance(context);
  if (/show the change|evidence|finish (my )?(cycle|goal)|complete (my )?(cycle|goal)/.test(text)) return { answer: "What is different now, and what can you point to that shows it? A short answer is enough, including no clear change yet. Open your saved plan for its starting intention and the brief review.", nextAction: {href: /goal/.test(text) ? "/goals" : "/architect-cycle", label: "Show the change"} };
  if (/momentum|progress|history|how am i doing/.test(text)) return progress(context);
  if (/goal/.test(text) && !/page/.test(text)) return goalHelp(context);
  if (/use ai|ai prompt|copy prompt|handoff|brainstorm|research|draft|learn a skill|break .* into steps|analy[sz]e options|routine/.test(text)) return aiPrompt(args.message, context);
  return {
    answer: "I can help you navigate BYNV, understand your Blueprint or Version Score, choose a next action, review saved progress, work with a goal, or build a prompt you can use with your own AI assistant. Choose one of those directions and I’ll guide you with the BYNV context available here.",
    nextAction: args.page.recommendation,
    aiHandoff: buildPrompt("work through this question using a clear, responsible process", context, args.message),
  };
}
