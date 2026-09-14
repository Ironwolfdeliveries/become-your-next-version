import assert from "node:assert/strict";
import { nextJourneyAction, cycleProgress } from "../lib/journey.ts";
import { canUseCoachingQA, canAdvanceCoachingQA, coachingSteps } from "../lib/coaching-qa.ts";

const states = [
  [{ signedIn: false, assessmentComplete: false, activeCycle: false }, "/assessment"],
  [{ signedIn: true, assessmentComplete: false, activeCycle: false }, "/architect-assessment"],
  [{ signedIn: true, assessmentComplete: true, activeCycle: false }, "/architect-cycle"],
  [{ signedIn: true, assessmentComplete: true, activeCycle: true }, "/daily-focus"],
  [{ signedIn: true, assessmentComplete: null, activeCycle: false }, "/dashboard"],
  [{ signedIn: false, assessmentComplete: true, activeCycle: true }, "/assessment"],
] as const;
for (const [state, href] of states) assert.equal(nextJourneyAction(state).href, href);
assert.deepEqual(cycleProgress("2026-09-14", "2026-09-27", "2026-09-14"), { total: 14, day: 1, percent: 7, reviewDue: false });
assert.equal(cycleProgress("2026-09-14", "2026-09-27", "2026-09-28").reviewDue, true);
for (const platform_role of ["owner", "admin"]) assert.equal(canUseCoachingQA({ platform_role, entitlement_tier: "architect_coaching", entitlement_status: "active" }), true);
for (const platform_role of ["member", "moderator"]) assert.equal(canUseCoachingQA({ platform_role, entitlement_tier: "architect_coaching", entitlement_status: "active" }), false);
assert.equal(canUseCoachingQA(null), false);
assert.equal(canUseCoachingQA({ platform_role: "owner", entitlement_tier: "architect_coaching", entitlement_status: "revoked" }), false);
assert.equal(canAdvanceCoachingQA(1, " ", "", ""), false);
assert.equal(canAdvanceCoachingQA(3, "request", "", ""), false);
assert.equal(canAdvanceCoachingQA(4, "request", "prep", ""), false);
for (let step = 0; step < coachingSteps.length - 1; step++) assert.equal(canAdvanceCoachingQA(step, "request", "prep", "commitment"), true);
assert.equal(canAdvanceCoachingQA(5, "request", "prep", "commitment"), false);
console.log("Journey checks passed: anonymous, incomplete, completed, active-cycle, unavailable, logout, progress and owner-only coaching rehearsal.");
