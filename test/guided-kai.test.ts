import assert from "node:assert/strict";
import { buildGuidedKaiResponse, type KaiMemberContext } from "../lib/kai-guided.ts";
import { getKaiLiveConfig, getKaiOperatingMode } from "../lib/kai-mode.ts";
import { getKaiPageContext } from "../lib/kai-context.ts";

const page = { title: "Architect Dashboard", purpose: "The member’s saved progress hub.", recommendation: { href: "/daily-focus", label: "Open Daily Focus" } };
const context: KaiMemberContext = {
  versionSnapshot: { score: 68, strongest_areas: [{ label: "Clarity" }], opportunity_areas: [{ label: "Action" }] },
  architectAssessment: { status: "completed", version_score: 72 },
  blueprint: { status: "active", priorities: [{ label: "Energy" }], strengths: [{ label: "Clarity" }], first_actions: [{ action: "Take a ten-minute walk" }] },
  goals: [{ title: "Build a steady morning routine", status: "active", pillar_key: "energy" }],
  dailyFocus: { priority: "Energy", action: "Take a ten-minute walk", completed: false },
  architectCycles: [{ focus: "Protect morning energy", status: "active" }],
  challenges: [{ challenge_key: "seven-day-reset", status: "active", progress: 2 }],
  progress: { completedDailyFocusCount: 4, completedGoalCount: 1, completedCycleCount: 2, snapshotCount: 3 },
};

const next = buildGuidedKaiResponse({ message: "What should I do next?", page, context, assessmentMode: false });
assert.match(next.answer, /Take a ten-minute walk/);
assert.equal(next.nextAction.href, "/daily-focus");

const score = buildGuidedKaiResponse({ message: "Explain my Version Score", page, context, assessmentMode: false });
assert.match(score.answer, /72\/100/);
assert.match(score.answer, /does not diagnose/i);

const progress = buildGuidedKaiResponse({ message: "Review my progress", page, context, assessmentMode: false });
assert.match(progress.answer, /4 completed Daily Focus/);
assert.match(progress.answer, /1 completed goal/);
assert.match(progress.answer, /2 completed Architect Cycles/);

const assessment = buildGuidedKaiResponse({ message: "Tell me which answer to choose", page: { ...page, title: "Architect Assessment" }, context, assessmentMode: true });
assert.match(assessment.answer, /will not choose an answer/);
assert.doesNotMatch(assessment.answer, /choose [1-5]/i);

const handoff = buildGuidedKaiResponse({ message: "Use AI for this: break my routine into steps", page, context, assessmentMode: false });
assert.ok(handoff.aiHandoff?.prompt);
assert.match(handoff.aiHandoff?.prompt ?? "", /Build a steady morning routine/);
assert.doesNotMatch(handoff.aiHandoff?.prompt ?? "", /journal/i);

const unsupported = buildGuidedKaiResponse({ message: "What is the weather in Tokyo?", page, context, assessmentMode: false });
assert.match(unsupported.answer, /I can help you navigate BYNV/);

for (const route of ["/", "/assessment", "/version-score", "/architect-assessment", "/blueprint", "/dashboard", "/daily-focus", "/goals", "/challenges", "/architect-cycle", "/progress", "/community", "/membership"]) {
  const routePage = getKaiPageContext(route);
  assert.notEqual(routePage.title, "BYNV", `${route} must have specific Kai page context`);
  assert.ok(routePage.recommendation.href.startsWith("/"));
}

delete process.env.KAI_MODE;
process.env.OPENAI_API_KEY = "present-but-insufficient";
assert.equal(getKaiOperatingMode(), "GUIDED");
assert.equal(getKaiLiveConfig(), null, "An API key alone must never activate LIVE mode");

console.log("Guided Kai checks passed: context, safeguards, handoff privacy, unsupported questions, and LIVE fail-closed gating.");
