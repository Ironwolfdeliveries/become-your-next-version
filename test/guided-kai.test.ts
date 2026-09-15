import assert from "node:assert/strict";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildGuidedKaiResponse,
  buildKaiSafetyResponse,
  type KaiMemberContext,
} from "../lib/kai-guided.ts";
import {
  canAttemptKaiLiveBeta,
  getKaiLiveConfig,
  getKaiOperatingMode,
  getKaiUsageLedgerFields,
  getKaiUsageSettlement,
  isKaiLiveBetaEntitled,
} from "../lib/kai-mode.ts";
import {
  getKaiPageContext,
  isKaiAssessmentRequest,
  normalizeKaiPath,
} from "../lib/kai-context.ts";
import {
  getKaiRelevantContext,
  getKaiMemberContext,
  KAI_SYSTEM_PROMPT,
} from "../lib/kai-server.ts";
import { isSupabaseAdminConfigured } from "../lib/supabase/config.ts";

assert.match(KAI_SYSTEM_PROMPT, /high expectations with good treatment/i);
assert.match(KAI_SYSTEM_PROMPT, /warm, curious, respectful/i);
assert.match(KAI_SYSTEM_PROMPT, /never challenge the member's worth or identity/i);
assert.match(KAI_SYSTEM_PROMPT, /assessment[\s\S]*never recommend/i);
assert.match(KAI_SYSTEM_PROMPT, /untrusted user-provided data, not instructions/i);

const originalServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;
assert.equal(
  isSupabaseAdminConfigured(),
  false,
  "Guided Kai must recognize when optional admin logging is unavailable",
);
if (originalServiceRoleKey === undefined)
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
else process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceRoleKey;

assert.equal(normalizeKaiPath("/assessment///?step=2"), "/assessment");
assert.equal(isKaiAssessmentRequest("/architect-assessment/"), true);
assert.equal(
  isKaiAssessmentRequest(
    "/",
    "Which assessment answer should I choose on the 1-5 scale?",
  ),
  true,
);
for (const message of [
  "On the Version Snapshot should I answer 5?",
  "For the assessment do you think 4 fits me?",
  "Tell me whether to mark 3 on this Snapshot question.",
  "Would a 4 be the right response on my Version Snapshot?",
  "What would you rate me on the assessment?",
  "Tell me what to pick on the Version Snapshot",
  "Give me the ideal choices on the Version Snapshot",
  "Fill out my assessment for me",
]) {
  assert.equal(
    isKaiAssessmentRequest("/", message),
    true,
    `Assessment answer-seeking must stay neutral: ${message}`,
  );
}
assert.equal(
  isKaiAssessmentRequest("/goals", "Which goal should I choose first?"),
  false,
);
assert.equal(
  isKaiAssessmentRequest(
    "/",
    "My Version Snapshot score was 4. Tell me what that means.",
  ),
  false,
  "Score explanation must not be mistaken for answer selection",
);
assert.equal(
  isKaiAssessmentRequest(
    "/",
    "Do you think 5 fits me?",
    ["I'm doing the Version Snapshot."],
  ),
  true,
  "Assessment intent from a recent turn must protect a follow-up answer request",
);
for (const message of [
  "What should I choose?",
  "Which one should I pick?",
  "Tell me what to put.",
  "Can you choose for me?",
]) {
  assert.equal(
    isKaiAssessmentRequest("/", message, [
      "I'm working on the Architect Assessment question right now.",
    ]),
    true,
    `An active assessment follow-up must stay neutral: ${message}`,
  );
}
for (const [message, recentMessages] of [
  ["Which score should I use to track progress?", []],
  [
    "Which goal should I choose first?",
    ["I took the Version Snapshot and got a score of 4."],
  ],
  [
    "Would you recommend the Builder plan?",
    ["Explain what my assessment score means."],
  ],
  [
    "Help me choose an option for today’s focus.",
    ["I completed my assessment."],
  ],
  ["I completed my assessment and got a 4. Which goal should I choose first?", []],
  ["My assessment score is 4. Recommend a goal for me.", []],
] as const) {
  assert.equal(
    isKaiAssessmentRequest("/", message, [...recentMessages]),
    false,
    `Completed or unrelated context must not trigger assessment mode: ${message}`,
  );
}

const page = {
  title: "Architect Dashboard",
  purpose: "The member’s saved progress hub.",
  recommendation: { href: "/daily-focus", label: "Open Daily Focus" },
};

const urgentSafety = buildKaiSafetyResponse(
  "I am thinking about killing myself.",
);
assert.ok(urgentSafety);
assert.match(urgentSafety.answer, /call or text 988/i);
assert.equal(urgentSafety.nextAction.href, "https://988lifeline.org/");
assert.equal(urgentSafety.aiHandoff, undefined);
assert.ok(buildKaiSafetyResponse("I do not want to live anymore."));
assert.ok(buildKaiSafetyResponse("I am planning to harm someone."));
for (const message of [
  "I am going to shoot myself tonight.",
  "I have pills ready and am going to take them all.",
  "I am about to jump off a bridge.",
  "I plan to stab him.",
  "I am going to run him over.",
  "I have a gun and I am going to use it on them.",
  "I cannot keep myself safe tonight.",
  "I don’t want to live anymore.",
  "I wish I weren’t alive.",
  "I plan to kill my boss.",
  "I plan to shoot my boss.",
  "I will hurt Alex.",
  "I have a gun to my head.",
  "I plan to end it all tonight.",
  "I have a loaded gun next to me.",
  "I plan to kill my mother.",
  "I plan to stab my coworker.",
  "I intend to poison the baby.",
  "I am going to strangle my roommate.",
  "I am going to kill everyone.",
  "I am planning to shoot my teacher.",
]) {
  assert.ok(
    buildKaiSafetyResponse(message),
    `Imminent-danger language must leave ordinary Kai flow: ${message}`,
  );
}
for (const message of [
  "Help me kill a stuck computer process.",
  "I am planning to shoot a video.",
  "What are overdose warning signs?",
  "What are suicide warning signs?",
  "I hope to not wake up late tomorrow.",
  "I need help cutting myself some slack.",
  "I want to ask my doctor whether this medication is right for me.",
  "I am going to put the kitchen knife away.",
  "I plan to buy a rope for the garden.",
  "I want to learn safe firearm storage.",
  "I am ready to take my medication as prescribed.",
  "I want to hurt less.",
  "I plan to attack this problem tomorrow.",
  "I want to beat procrastination.",
  "I plan to beat my personal record.",
  "I want to murder this workout.",
  "I am going to hurt after physical therapy.",
]) {
  assert.equal(
    buildKaiSafetyResponse(message),
    null,
    `Benign language must remain in ordinary Kai flow: ${message}`,
  );
}
assert.equal(
  buildKaiSafetyResponse("My doctor prescribed medication yesterday.", [
    "I want to make progress.",
  ]),
  null,
  "Unrelated words across turns must not combine into a crisis signal",
);
assert.ok(
  buildKaiSafetyResponse(
    "I'm going to use it tonight.",
    ["I have a loaded gun next to me."],
  ),
  "Recent lethal-means context must protect a referential follow-up",
);
assert.ok(
  buildKaiSafetyResponse(
    "I have a loaded gun and I'm going to use it tonight.",
  ),
  "Intent plus lethal means must not require an explicit human target",
);
const context: KaiMemberContext = {
  versionSnapshot: {
    score: 68,
    strongest_areas: [{ label: "Clarity" }],
    opportunity_areas: [{ label: "Action" }],
  },
  architectAssessment: { status: "completed", version_score: 72 },
  blueprint: {
    status: "active",
    priorities: [{ label: "Energy" }],
    strengths: [{ label: "Clarity" }],
    first_actions: [{ action: "Take a ten-minute walk" }],
  },
  goals: [
    {
      title: "Build a steady morning routine",
      status: "active",
      pillar_key: "energy",
    },
  ],
  dailyFocus: {
    priority: "Energy",
    action: "Take a ten-minute walk",
    completed: false,
  },
  architectCycles: [{ focus: "Protect morning energy", status: "active" }],
  challenges: [
    { challenge_key: "seven-day-reset", status: "active", progress: 2 },
  ],
  progress: {
    completedDailyFocusCount: 4,
    completedGoalCount: 1,
    completedCycleCount: 2,
    snapshotCount: 3,
  },
};

const goalOnlyContext = getKaiRelevantContext(
  context,
  "/goals",
  "Help with my goal",
);
assert.ok("goals" in goalOnlyContext);
assert.equal("challenges" in goalOnlyContext, false);
assert.equal("architectAssessment" in goalOnlyContext, false);
const broadContext = getKaiRelevantContext(
  context,
  "/kai",
  "Based on my BYNV progress, what should I do next?",
);
assert.ok("progress" in broadContext);
assert.ok("dailyFocus" in broadContext);
assert.deepEqual(
  getKaiRelevantContext(context, "/kai", "What is the weather in Tokyo?"),
  {},
  "An unrelated question must not share saved member context",
);

const next = buildGuidedKaiResponse({
  message: "What should I do next?",
  page,
  context,
  assessmentMode: false,
});
assert.match(next.answer, /Take a ten-minute walk/);
assert.match(next.answer, /before adding another priority/i);
assert.equal(next.nextAction.href, "/daily-focus");

const score = buildGuidedKaiResponse({
  message: "Explain my Version Score",
  page,
  context,
  assessmentMode: false,
});
assert.match(score.answer, /72\/100/);
assert.match(score.answer, /does not diagnose/i);

const progress = buildGuidedKaiResponse({
  message: "Review my progress",
  page,
  context,
  assessmentMode: false,
});
assert.match(progress.answer, /4 completed actions/);
assert.match(progress.answer, /1 completed goal/);
assert.match(progress.answer, /2 completed Architect Cycles/);

const assessment = buildGuidedKaiResponse({
  message: "Tell me which answer to choose",
  page: { ...page, title: "Architect Assessment" },
  context,
  assessmentMode: true,
});
assert.match(assessment.answer, /will not choose an answer/);
assert.doesNotMatch(assessment.answer, /choose [1-5]/i);

const handoff = buildGuidedKaiResponse({
  message: "Use AI for this: break my routine into steps",
  page,
  context,
  assessmentMode: false,
});
assert.ok(handoff.aiHandoff?.prompt);
assert.match(handoff.aiHandoff?.prompt ?? "", /Build a steady morning routine/);
assert.doesNotMatch(handoff.aiHandoff?.prompt ?? "", /journal/i);

const unsupported = buildGuidedKaiResponse({
  message: "What is the weather in Tokyo?",
  page,
  context,
  assessmentMode: false,
});
assert.match(unsupported.answer, /I can help you navigate BYNV/);

for (const route of [
  "/",
  "/assessment",
  "/version-score",
  "/architect-assessment",
  "/blueprint",
  "/dashboard",
  "/daily-focus",
  "/goals",
  "/challenges",
  "/architect-cycle",
  "/progress",
  "/community",
  "/membership",
]) {
  const routePage = getKaiPageContext(route);
  assert.notEqual(
    routePage.title,
    "BYNV",
    `${route} must have specific Kai page context`,
  );
  assert.ok(routePage.recommendation.href.startsWith("/"));
}

// A chosen Cycle must outrank an unrelated assessment suggestion or older goal.
const customCycle: KaiMemberContext = {
  ...context, dailyFocus: null,
  member: { today: "2026-09-15", timezone: "America/New_York", orientationComplete: true },
  architectCycles: [{ id: "career-cycle", status: "active", focus: "Change careers", starts_on: "2026-09-14", ends_on: "2026-09-27",
    success_vision: "Submit two thoughtful applications", plan_steps: ["Update one paragraph of my résumé"], remaining_steps: ["Update one paragraph of my résumé"], day: 2, total_days: 14, commitment_rule: "shrink" }],
};
const guided = (saved: KaiMemberContext | null, message = "What should I do next?") =>
  buildGuidedKaiResponse({ message, page, context: saved, assessmentMode: false });
const freshBlueprint = guided({ ...customCycle, architectCycles: [], goals: [] });
assert.match(freshBlueprint.answer, /Take a ten-minute walk/, "Blueprint action objects must be interpreted as actions, not internal keys");
const careerNext = guided(customCycle);
assert.match(careerNext.answer, /Update one paragraph of my résumé/);
assert.doesNotMatch(careerNext.answer, /ten-minute walk|morning routine/);
assert.equal(careerNext.nextAction.href, "/daily-focus");

const stepAware: KaiMemberContext = { ...customCycle, dailyFocus: {
  action: "An old one-field action", completed: false,
  steps: [{ id: "a", text: "Prepare the résumé", done: true }, { id: "b", text: "Send the first application", done: false }],
} };
assert.match(guided(stepAware).answer, /Send the first application/);
assert.doesNotMatch(guided(stepAware).answer, /An old one-field action/);
const missed: KaiMemberContext = { ...customCycle, unresolvedActions: [{ id: "missed", focus_date: "2026-06-01", cycle_id: "career-cycle",
  steps: [{ id: "old", text: "Ask for the introduction", done: false }], check_in: "missed", recovery: null }] };
const recoveryGuidance = guided(missed);
assert.match(recoveryGuidance.answer, /2026-06-01/);
assert.match(recoveryGuidance.answer, /make the next action smaller/);
assert.match(recoveryGuidance.answer, /keep it, make it smaller, reschedule it, or choose another approach/);
assert.equal(recoveryGuidance.nextAction.href, "/daily-focus");
assert.match(guided({ ...missed, dailyFocus: { ...stepAware.dailyFocus, check_in: "progress" } }, "Made progress").answer, /unfinished step/);

const recovered = guided({ ...customCycle, dailyFocus: { ...stepAware.dailyFocus, check_in: "missed",
  recovery: { strategy: "shrink", next_date: "2026-09-16", next_action: "Find one useful contact" } } });
assert.match(recovered.answer, /already given this plan a next move/);
assert.match(recovered.answer, /2026-09-16/);
assert.doesNotMatch(recovered.answer, /still has an unfinished/);
const done = guided({ ...customCycle, dailyFocus: { completed: true, check_in: "done", steps: [{ id: "done", text: "Submit my application", done: true }] },
  progress: { ...context.progress, completedActionCount: 9, actionsThisWeek: 3 } }, "Daily guidance");
assert.match(done.answer, /call today done/);
assert.match(done.answer, /note is optional/);
assert.doesNotMatch(done.answer, /record what worked|write.*reflection/i);
assert.match(guided({ ...customCycle, progress: { ...context.progress, completedActionCount: 9 } }, "Review my progress").answer, /9 completed actions/);
const dueCycle = guided({ ...customCycle, architectCycles: [{ ...customCycle.architectCycles[0], review_due: true }] });
assert.equal(dueCycle.nextAction.href, "/architect-cycle");
assert.match(dueCycle.answer, /Submit two thoughtful applications/);
const orientation = guided({ ...customCycle, architectCycles: [], member: { ...customCycle.member!, orientationComplete: false } });
assert.equal(orientation.nextAction.href, "/orientation");
assert.match(guided(null).answer, /don’t have your saved journey available/);
assert.doesNotMatch(guided(null, "Review my progress").answer, /0 completed/);
assert.match(guided(missed, "I am planning to hurt myself").answer, /988/);

// Extra private fields must never hitchhike into the Live model context.
const privateContext = { ...missed,
  dailyFocus: { ...stepAware.dailyFocus, reflection: "PRIVATE_DAILY_NOTE", recovery: { strategy: "shrink", next_date: "2026-09-16", next_action: "Find a contact", blocker: "PRIVATE_BLOCKER" } },
  architectCycles: [{ ...customCycle.architectCycles[0], outcome: "PRIVATE_CYCLE_REVIEW" }],
  journal: "PRIVATE_JOURNAL",
};
const relevantPrivate = JSON.stringify(getKaiRelevantContext(privateContext, "/daily-focus", "Help with my next action"));
assert.doesNotMatch(relevantPrivate, /PRIVATE_/);
assert.match(relevantPrivate, /Find a contact/);
assert.match(relevantPrivate, /commitment_rule/);
const manyUnresolved = { ...missed, unresolvedActions: Array.from({ length: 8 }, (_, index) => ({ ...missed.unresolvedActions![0], id: String(index) })) };
const limitedContext = getKaiRelevantContext(manyUnresolved, "/daily-focus", "I missed a commitment");
assert.equal((limitedContext.unresolvedActions as unknown[]).length, 3);
assert.equal(limitedContext.unresolvedPlanCount, 8);
assert.deepEqual(getKaiRelevantContext(privateContext, "/daily-focus", "What is the weather in Tokyo?"), {});
assert.equal(getKaiPageContext("/daily-focus").title, "Today’s Plan");
assert.equal(getKaiPageContext("/resources").title, "Architect Library");
assert.notEqual(getKaiPageContext("/orientation").title, "BYNV");

// Exercise the DB reader at a real UTC/local-day boundary, with a newer draft,
// a later completed assessment, two actions in one day, and a paged older miss.
type FakeRow = Record<string, unknown>;
type FakeResult = { data: FakeRow | FakeRow[] | null; count: number | null; error: { message: string } | null };
const queries: Array<{ table: string; columns: string; filters: Array<[string, string, unknown]> }> = [];
const fixtures: Record<string, FakeRow[]> = {
  profiles: [{ id: "member", display_name: "Daniel Calderon", timezone: "America/New_York", onboarding_completed: true }],
  version_snapshots: [{ id: "s", user_id: "member", score: 63, completed_at: "2026-09-01" }],
  architect_assessments: [
    { user_id: "member", version: 1, status: "completed", version_score: 42, completed_at: "2026-01-01" },
    { user_id: "member", version: 2, status: "completed", version_score: 59, completed_at: "2026-09-10" },
    { user_id: "member", version: 3, status: "in_progress", version_score: 99, completed_at: "2026-09-15" },
  ],
  architect_blueprints: [{ user_id: "member", status: "active", priorities: [], strengths: [], first_actions: [], updated_at: "2026-09-10" }],
  goals: [], challenge_enrollments: [],
  architect_cycles: [{ user_id: "member", id: "career-cycle", status: "active", focus: "Change careers", starts_on: "2026-09-01", ends_on: "2026-09-14", success_vision: "A useful application", plan_steps: ["Email contact"], commitment_rule: "shrink", created_at: "2026-09-01" }],
  daily_focus_entries: [
    { user_id: "member", id: "local-day", focus_date: "2026-09-14", completed: false, check_in: "progress", action: "Legacy", steps: [{ id: "x", text: "Email contact", done: true }, { id: "y", text: "Read reply", done: false }], cycle_id: "career-cycle", reflection: "MUST_NOT_BE_READ" },
    { user_id: "member", id: "old-miss", focus_date: "2026-06-01", completed: false, action: "Call contact", steps: null, check_in: null, recovery: null },
    { user_id: "member", id: "tomorrow", focus_date: "2026-09-15", completed: true, action: "Future entry must not count", steps: null },
  ],
};
function fakeSupabase(failingTable?: string) {
  return { from(table: string) {
    const query = { table, columns: "", filters: [] as Array<[string, string, unknown]> }; queries.push(query);
    let head = false, single = false, cap = Infinity, from = 0, to = Infinity;
    const sorts: Array<[string, boolean]> = [];
    const builder = {
      select(columns: string, options?: { head?: boolean }) { query.columns = columns; head = Boolean(options?.head); return builder; },
      eq(key: string, value: unknown) { query.filters.push(["eq", key, value]); return builder; },
      in(key: string, value: unknown[]) { query.filters.push(["in", key, value]); return builder; },
      lte(key: string, value: unknown) { query.filters.push(["lte", key, value]); return builder; },
      order(key: string, options?: { ascending?: boolean }) { sorts.push([key, options?.ascending !== false]); return builder; },
      limit(value: number) { cap = value; return builder; },
      maybeSingle() { single = true; return builder; },
      range(first: number, last: number) { from = first; to = last; return builder; },
      then(resolve: (result: FakeResult) => unknown) {
        let rows = [...(fixtures[table] || [])].filter(row => query.filters.every(([operation, key, value]) => operation === "eq" ? row[key] === value : operation === "in" ? (value as unknown[]).includes(row[key]) : String(row[key]) <= String(value)));
        rows.sort((a, b) => { for (const [key, ascending] of sorts) { const difference = String(a[key] || "").localeCompare(String(b[key] || "")); if (difference) return ascending ? difference : -difference; } return 0; });
        const count = rows.length;
        rows = rows.slice(from, Math.min(to + 1, from + cap, table === "daily_focus_entries" ? from + 1 : Infinity));
        rows = rows.map(row => Object.fromEntries(query.columns.split(",").filter(key => key in row).map(key => [key, row[key]])));
        return Promise.resolve({ data: head ? null : single ? rows[0] || null : rows, count, error: table === failingTable ? { message: "read failed" } : null }).then(resolve);
      },
    };
    return builder;
  } } as unknown as SupabaseClient;
}
const loadedContext = await getKaiMemberContext(fakeSupabase(), "member", new Date("2026-09-15T03:30:00Z"));
assert.equal(loadedContext.member?.today, "2026-09-14", "Kai must use the member’s date before midnight in New Jersey");
assert.equal(loadedContext.dailyFocus?.id, "local-day");
assert.equal(loadedContext.architectAssessment?.version_score, 59, "A later draft must not erase the latest completed score");
assert.equal(loadedContext.progress.completedActionCount, 1, "Partial days must count real completed steps, while future entries must not count");
assert.equal(loadedContext.progress.completedDailyFocusCount, 0);
assert.equal(loadedContext.unresolvedActions?.[0]?.id, "old-miss", "Paging must not hide an old unresolved commitment");
assert.equal(loadedContext.architectCycles[0]?.review_due, true);
assert.deepEqual(loadedContext.architectCycles[0]?.remaining_steps, []);
assert.equal(queries.some(query => /reflection|journal|outcome/.test(query.columns)), false, "Private notes must not be read automatically for Kai");
assert.equal(queries.some(query => query.table === "architect_assessments" && query.filters.some(([, key]) => key === "version")), false);
await assert.rejects(getKaiMemberContext(fakeSupabase("architect_blueprints"), "member"), /could not be loaded/, "A failed read must not manufacture zero progress");

Object.assign(process.env, {
  OPENAI_API_KEY: "present-but-insufficient",
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
  KAI_LIVE_BETA_PER_MINUTE_ALLOWANCE: "4",
  KAI_LIVE_BETA_DAILY_ALLOWANCE: "50",
  KAI_LIVE_BETA_MONTHLY_ALLOWANCE: "1000",
  KAI_LIVE_BETA_MAX_INPUT_CHARS: "12000",
  KAI_LIVE_BETA_MAX_OUTPUT_TOKENS: "600",
  KAI_LIVE_BETA_MONTHLY_BUDGET_CENTS: "1500",
  KAI_LIVE_BETA_MAX_REQUEST_COST_MICRO_USD: "100000",
  KAI_LIVE_BETA_INPUT_MICRO_USD_PER_MILLION_TOKENS: "250000",
  KAI_LIVE_BETA_OUTPUT_MICRO_USD_PER_MILLION_TOKENS: "2000000",
});

delete process.env.KAI_MODE;
delete process.env.KAI_LIVE_BETA_ENABLED;
delete process.env.KAI_EMERGENCY_SHUTOFF;
assert.equal(getKaiOperatingMode(), "GUIDED");
assert.equal(
  getKaiLiveConfig(),
  null,
  "Omitted Live gates must remain fail-closed",
);

process.env.KAI_MODE = "unexpected";
process.env.KAI_LIVE_BETA_ENABLED = "true";
process.env.KAI_EMERGENCY_SHUTOFF = "false";
assert.equal(getKaiOperatingMode(), "GUIDED");
assert.equal(
  getKaiLiveConfig(),
  null,
  "An unknown operating mode must remain Guided",
);

process.env.KAI_MODE = "LIVE_BETA";
process.env.KAI_LIVE_BETA_ENABLED = "TRUE";
assert.equal(
  getKaiLiveConfig(),
  null,
  "Malformed boolean gates must remain closed",
);

process.env.KAI_LIVE_BETA_ENABLED = "true";
process.env.KAI_EMERGENCY_SHUTOFF = "false";
delete process.env.SUPABASE_SERVICE_ROLE_KEY;
assert.equal(
  getKaiLiveConfig(),
  null,
  "Live Kai must not configure without server-side budget authority",
);
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
delete process.env.OPENAI_MODEL;
const liveConfig = getKaiLiveConfig();
assert.ok(liveConfig);
assert.equal(liveConfig.model, "gpt-5-mini");
assert.deepEqual(
  getKaiUsageSettlement(liveConfig, {
    input_tokens: 1_000,
    output_tokens: 100,
  }),
  {
    inputTokens: 1_000,
    outputTokens: 100,
    estimatedCostMicroUsd: 450,
  },
);
assert.equal(
  getKaiUsageSettlement(liveConfig, undefined),
  null,
  "Missing provider usage must preserve the request reserve",
);
assert.deepEqual(
  getKaiUsageLedgerFields(null, false),
  {},
  "An unsettled post-dispatch request must retain its full reserve",
);
assert.deepEqual(
  getKaiUsageLedgerFields(null, true),
  { estimated_cost_micro_usd: 0 },
  "A proven pre-dispatch failure may release its reserve",
);
assert.deepEqual(
  getKaiUsageLedgerFields(
    {
      inputTokens: 1_000,
      outputTokens: 100,
      estimatedCostMicroUsd: 450,
    },
    false,
  ),
  {
    input_tokens: 1_000,
    output_tokens: 100,
    estimated_cost_micro_usd: 450,
  },
  "Reported usage must settle the reservation even when the response fails later",
);
assert.equal(
  isKaiLiveBetaEntitled({
    platform_role: "owner",
    entitlement_status: "active",
  }),
  true,
);
assert.equal(
  isKaiLiveBetaEntitled({
    platform_role: "member",
    entitlement_status: "active",
    kai_live_beta_enabled: true,
  }),
  true,
);
assert.equal(
  isKaiLiveBetaEntitled({
    platform_role: "member",
    entitlement_status: "active",
    kai_live_beta_enabled: false,
  }),
  false,
);
assert.equal(
  isKaiLiveBetaEntitled({
    platform_role: "owner",
    entitlement_status: "paused",
  }),
  false,
);
assert.equal(
  canAttemptKaiLiveBeta({
    config: liveConfig,
    access: { platform_role: "owner", entitlement_status: "active" },
    settings: { live_beta_enabled: true, emergency_shutoff: false },
  }),
  true,
);
assert.equal(
  canAttemptKaiLiveBeta({
    config: liveConfig,
    access: { platform_role: "owner", entitlement_status: "active" },
    settings: { live_beta_enabled: true, emergency_shutoff: true },
  }),
  false,
);
assert.equal(
  canAttemptKaiLiveBeta({
    config: liveConfig,
    access: { platform_role: "member", entitlement_status: "active" },
    settings: { live_beta_enabled: true, emergency_shutoff: false },
  }),
  false,
);

process.env.OPENAI_MODEL = "unpriced-model";
assert.equal(
  getKaiLiveConfig(),
  null,
  "Models without a reviewed price pair must remain disabled",
);
delete process.env.OPENAI_MODEL;

process.env.KAI_LIVE_BETA_MAX_REQUEST_COST_MICRO_USD = "1000";
assert.equal(
  getKaiLiveConfig(),
  null,
  "The request reserve must cover the conservative worst-case request cost",
);
process.env.KAI_LIVE_BETA_MAX_REQUEST_COST_MICRO_USD = "100000";

process.env.KAI_LIVE_BETA_OUTPUT_MICRO_USD_PER_MILLION_TOKENS = "1";
assert.equal(
  getKaiLiveConfig(),
  null,
  "Configured pricing must not undercut the reviewed model rate",
);
process.env.KAI_LIVE_BETA_OUTPUT_MICRO_USD_PER_MILLION_TOKENS = "2000000";

process.env.KAI_LIVE_BETA_DAILY_ALLOWANCE = "101";
assert.equal(
  getKaiLiveConfig(),
  null,
  "Operational values over the hard ceiling must fail closed",
);

console.log(
  "Kai checks passed: Guided context, safeguards, handoff privacy, explicit beta entitlement, conservative settlement, kill switch, and fail-closed gating.",
);
