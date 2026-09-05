import assert from "node:assert/strict";
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
assert.match(progress.answer, /4 completed Daily Focus/);
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
