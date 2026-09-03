export type AILeverageTask = {
  id: string;
  title: string;
  signal: string;
  aiRole: string;
  humanCheck: string;
};

export const aiLeverageTasks: AILeverageTask[] = [
  {
    id: "triage",
    title: "Sort information",
    signal: "You repeatedly review messages, notes, documents, or updates to decide what matters.",
    aiRole: "Summarize, group, identify decisions, and produce a short action list.",
    humanCheck: "Confirm priorities, privacy, missing context, and anything that affects another person.",
  },
  {
    id: "communication",
    title: "Draft routine communication",
    signal: "You write similar emails, follow-ups, descriptions, or status updates more than once.",
    aiRole: "Create a first draft from your facts, audience, tone, and desired outcome.",
    humanCheck: "Verify every fact, promise, recipient, tone, and attachment before sending.",
  },
  {
    id: "research",
    title: "Research and compare",
    signal: "You gather options, specifications, sources, or tradeoffs before making a decision.",
    aiRole: "Build a comparison, surface unknowns, and organize source-backed findings.",
    humanCheck: "Open the sources, check dates, challenge assumptions, and make the final decision.",
  },
  {
    id: "planning",
    title: "Plan and track work",
    signal: "A goal keeps turning into scattered notes instead of a clear sequence of actions.",
    aiRole: "Turn an outcome into milestones, next actions, dependencies, and a review rhythm.",
    humanCheck: "Set realistic constraints and decide what deserves your time now.",
  },
  {
    id: "repetition",
    title: "Document a repeatable process",
    signal: "You complete the same administrative or operational steps again and again.",
    aiRole: "Convert the work into a checklist, template, standard procedure, or automation brief.",
    humanCheck: "Test the process on a real example and protect credentials or customer information.",
  },
  {
    id: "learning",
    title: "Learn and prepare",
    signal: "You need to understand a topic, practice a skill, or prepare for a conversation.",
    aiRole: "Explain at your level, quiz understanding, simulate practice, and identify knowledge gaps.",
    humanCheck: "Verify high-stakes information with qualified or primary sources.",
  },
];

export function buildPortableAIHandoff(task: AILeverageTask, priority: string, action: string) {
  const currentContext = [priority.trim() && `Current priority: ${priority.trim()}`, action.trim() && `Current next action: ${action.trim()}`].filter(Boolean).join("\n");
  return `I want your help with: ${task.title}.\n\n${currentContext ? `${currentContext}\n\n` : ""}Outcome I want:\n[Describe the result you need.]\n\nContext you should know:\n[Add only the relevant facts. Do not include passwords, private account credentials, or information you are not allowed to share.]\n\nWhat I want you to do:\n${task.aiRole}\n\nBefore starting:\n- Ask up to three short questions if essential information is missing.\n- State important assumptions instead of hiding them.\n- Do not send, publish, purchase, delete, or make commitments for me.\n\nReturn:\n1. A concise first draft or action plan.\n2. The facts or sources I should verify.\n3. The decisions that still require my judgment.\n\nMy verification responsibility:\n${task.humanCheck}`;
}

export function buildKaiAILeveragePrompt(task: AILeverageTask, priority: string, action: string) {
  const focus = priority.trim() || action.trim();
  return `Help me decide how to delegate “${task.title}” to AI${focus ? ` in support of my current focus: ${focus}` : ""}. Define the smallest useful workflow, what context I should provide, what must stay under human judgment, and how I should verify the result. Do not claim time savings you cannot calculate.`;
}
