import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  addDays, entryStatus, entrySteps, memberDate, momentum, needsRecovery,
  type Cycle, type DailyEntry, type Experience,
} from "../lib/experience.ts";
import { nextExperienceStep } from "../lib/experience-guidance.ts";
import { cycleProgress, nextJourneyAction } from "../lib/journey.ts";

const today = "2026-09-15";
function entry(overrides: Partial<DailyEntry> = {}): DailyEntry {
  return {
    id: "day-1", focus_date: today, priority: "Clear the workspace", action: "Clear one work surface",
    completed: false, reflection: null, steps: null, check_in: null, recovery: null,
    cycle_id: null, updated_at: "2026-09-15T12:00:00Z", ...overrides,
  };
}
function cycle(overrides: Partial<Cycle> = {}): Cycle {
  return {
    id: "cycle-1", focus: "Create a calmer workday", starts_on: "2026-09-14", ends_on: "2026-09-27",
    status: "active", outcome: null, success_vision: "Start important work without searching for things",
    plan_steps: ["Clear one work surface", "Put tomorrow’s tools in one place"],
    commitment_rule: "shrink", pillar_key: "environment", goal_id: null,
    completed_at: null, updated_at: "2026-09-14T12:00:00Z", ...overrides,
  };
}
function experience(overrides: Partial<Experience> = {}): Experience {
  return {
    today, timezone: "America/New_York", name: "Daniel Calderon", orientationComplete: true,
    assessmentComplete: true, score: 59,
    strengths: [{ key: "clarity", label: "Clarity & Direction", score: 76 }],
    priorities: [{ key: "environment", label: "Environment & Systems", score: 39 }],
    firstActions: [{ key: "environment", action: "Clear one work surface" }],
    cycle: null, cycles: [], daily: null, recent: [], unresolved: [], goals: [], ...overrides,
  };
}
const completedSteps = ["Clear the desk", "Set out the tools", "Start ten minutes of work"].map((text, index) => ({ id: `step-${index}`, text, done: true }));

describe("existing Daily Focus entries remain meaningful", () => {
  it("interprets a completed legacy action without changing its saved note or score", () => {
    const saved = entry({ completed: true, reflection: "I was tired, but I did the small step." });
    const original = structuredClone(saved);
    const state = experience({ daily: saved, recent: [saved] });
    assert.deepEqual(entrySteps(saved), [{ id: "legacy", text: saved.action, done: true }]);
    assert.equal(entryStatus(saved), "done");
    assert.equal(nextExperienceStep(state).href, "/progress");
    assert.deepEqual(saved, original);
    assert.equal(state.score, 59);
  });
  it("keeps an unfinished legacy action even when a reflection already exists", () => {
    const saved = entry({ focus_date: "2026-09-14", reflection: "Ran out of time at work." });
    assert.equal(entryStatus(saved), null);
    assert.equal(entrySteps(saved)[0].done, false);
    assert.equal(needsRecovery(saved, today), true);
    assert.equal(saved.reflection, "Ran out of time at work.");
  });
  it("does not invent an action from a priority-only or reflection-only saved row", () => {
    for (const action of [null, "", "   "]) {
      const saved = entry({ action, focus_date: "2026-09-14", reflection: "A useful thought to keep." });
      assert.deepEqual(entrySteps(saved), []);
      assert.equal(needsRecovery(saved, today), false);
    }
    assert.deepEqual(entrySteps(null), []);
    assert.equal(entryStatus(null), null);
  });
  it("uses structured steps once present and never double-counts the legacy summary", () => {
    const saved = entry({ steps: completedSteps, completed: true, check_in: "done", action: "Legacy combined summary" });
    assert.deepEqual(entrySteps(saved), completedSteps);
    assert.equal(momentum([saved], today).actions, 3);
  });
  it("falls back to the original action if structured steps are empty", () => {
    assert.equal(entrySteps(entry({ steps: [] }))[0].text, "Clear one work surface");
  });
  it("keeps an explicit check-in authoritative over the legacy completion flag", () => {
    assert.equal(entryStatus(entry({ completed: true, check_in: "progress" })), "progress");
    assert.equal(entryStatus(entry({ check_in: "missed" })), "missed");
  });
});

describe("accountability notices unfinished commitments without inventing missed work", () => {
  it("includes both a missed day and a partially completed day after date rollover", () => {
    for (const check_in of ["missed", "progress"] as const) {
      assert.equal(needsRecovery(entry({ focus_date: "2026-09-14", check_in, steps: [completedSteps[0], { id: "pending", text: "Put the tools away", done: false }] }), today), true);
    }
  });
  it("does not treat today, a future plan, completed work, or resolved recovery as overdue", () => {
    const resolved = { strategy: "shrink", next_date: today, next_action: "Clear one small corner", resolved_at: "2026-09-15T13:00:00Z" } as const;
    for (const saved of [
      entry(),
      entry({ focus_date: "2026-09-16" }),
      entry({ focus_date: "2026-09-14", completed: true }),
      entry({ focus_date: "2026-09-14", steps: completedSteps }),
      entry({ focus_date: "2026-09-14", recovery: resolved }),
    ]) assert.equal(needsRecovery(saved, today), false);
  });
});

describe("member dates and Cycle dates follow local calendar days", () => {
  it("keeps a late evening in New Jersey on the prior day after UTC midnight", () => {
    assert.equal(memberDate("America/New_York", new Date("2026-09-15T03:59:59Z")), "2026-09-14");
    assert.equal(memberDate("America/New_York", new Date("2026-09-15T04:00:00Z")), "2026-09-15");
  });
  it("uses the winter midnight boundary rather than a fixed four-hour offset", () => {
    assert.equal(memberDate("America/New_York", new Date("2026-12-15T04:59:59Z")), "2026-12-14");
    assert.equal(memberDate("America/New_York", new Date("2026-12-15T05:00:00Z")), "2026-12-15");
  });
  it("handles both skipped and repeated daylight-saving hours without moving the day", () => {
    for (const timestamp of ["2026-03-08T06:59:59Z", "2026-03-08T07:00:00Z"]) assert.equal(memberDate("America/New_York", new Date(timestamp)), "2026-03-08");
    for (const timestamp of ["2026-11-01T05:30:00Z", "2026-11-01T06:30:00Z"]) assert.equal(memberDate("America/New_York", new Date(timestamp)), "2026-11-01");
    assert.equal(addDays("2026-03-07", 1), "2026-03-08");
    assert.equal(addDays("2026-03-08", 1), "2026-03-09");
    assert.equal(addDays("2026-10-31", 1), "2026-11-01");
    assert.equal(addDays("2026-11-01", 1), "2026-11-02");
  });
  it("advances the calendar across year and leap-year boundaries", () => {
    assert.equal(addDays("2026-12-31", 1), "2027-01-01");
    assert.equal(addDays("2028-02-28", 1), "2028-02-29");
    assert.equal(addDays("2026-03-01", -1), "2026-02-28");
  });
  it("keeps the full 14-day Cycle inclusive and requests review after its final day", () => {
    assert.deepEqual(cycleProgress("2026-03-01", "2026-03-14", "2026-03-01"), { total: 14, day: 1, percent: 7, reviewDue: false });
    assert.deepEqual(cycleProgress("2026-03-01", "2026-03-14", "2026-03-14"), { total: 14, day: 14, percent: 100, reviewDue: false });
    assert.deepEqual(cycleProgress("2026-03-01", "2026-03-14", "2026-03-15"), { total: 14, day: 14, percent: 100, reviewDue: true });
  });
});

describe("momentum counts actual actions and contiguous member days", () => {
  it("counts three checked actions as three actions and one streak day", () => {
    assert.deepEqual(momentum([entry({ steps: completedSteps, check_in: "done" })], today), { streak: 1, actions: 3, thisWeek: 3, progressDays: 0 });
  });
  it("counts partial action completion separately from check-ins reporting progress", () => {
    const partial = entry({ steps: [completedSteps[0], { id: "pending", text: "Another useful action", done: false }], check_in: "progress" });
    const reported = entry({ id: "previous", focus_date: "2026-09-14", check_in: "progress" });
    assert.deepEqual(momentum([partial, reported], today), { streak: 1, actions: 1, thisWeek: 1, progressDays: 2 });
  });
  it("continues a streak through yesterday while today is still open", () => {
    const history = ["2026-09-14", "2026-09-13", "2026-09-12"].map(focus_date => entry({ focus_date, completed: true }));
    assert.equal(momentum([entry(), ...history], today).streak, 3);
  });
  it("extends yesterday’s streak once an action is completed today", () => {
    const history = [today, "2026-09-14", "2026-09-13"].map(focus_date => entry({ focus_date, completed: true }));
    assert.equal(momentum(history, today).streak, 3);
  });
  it("ends the streak at a gap instead of joining older isolated work", () => {
    const history = [today, "2026-09-13", "2026-09-12"].map(focus_date => entry({ focus_date, completed: true }));
    assert.equal(momentum(history, today).streak, 1);
    assert.equal(momentum(history.slice(1), today).streak, 0);
  });
  it("excludes future actions and check-ins from every momentum measure", () => {
    const future = entry({ focus_date: "2026-09-16", steps: completedSteps, check_in: "progress" });
    assert.deepEqual(momentum([future], today), { streak: 0, actions: 0, thisWeek: 0, progressDays: 0 });
  });
  it("uses the inclusive last seven days for recent actions and preserves lifetime totals", () => {
    const dates = ["2026-09-08", "2026-09-09", "2026-09-15"];
    assert.deepEqual(momentum(dates.map(focus_date => entry({ focus_date, completed: true })), today), { streak: 1, actions: 3, thisWeek: 2, progressDays: 0 });
    assert.deepEqual(momentum([], today), { streak: 0, actions: 0, thisWeek: 0, progressDays: 0 });
  });
});

describe("Kai connects the next step to what the member has actually saved", () => {
  it("orients a newly completed member and reuses their Blueprint areas", () => {
    const next = nextExperienceStep(experience({ orientationComplete: false }));
    assert.equal(next.href, "/orientation");
    assert.match(next.message, /Clarity & Direction/);
    assert.match(next.message, /Environment & Systems/);
  });
  it("invites a first priority after orientation when there is no existing work", () => {
    assert.equal(nextExperienceStep(experience()).href, "/architect-cycle");
  });
  it("continues an incomplete assessment before proposing assessed priorities", () => {
    assert.equal(nextExperienceStep(experience({ assessmentComplete: false, orientationComplete: false })).href, "/architect-assessment");
  });
  it("returns to a saved action even when the member has no active Cycle", () => {
    const saved = entry({ action: "Review the three outstanding deliveries" });
    const next = nextExperienceStep(experience({ daily: saved, recent: [saved] }));
    assert.equal(next.href, "/daily-focus");
    assert.match(next.message, /Review the three outstanding deliveries/);
    assert.doesNotMatch(next.greeting, /Blueprint is ready/);
  });
  it("recommends the first unfinished step instead of repeating a completed one", () => {
    const saved = entry({ steps: [completedSteps[0], { id: "pending", text: "Prepare tomorrow’s materials", done: false }] });
    const next = nextExperienceStep(experience({ cycle: cycle(), daily: saved, recent: [saved] }));
    assert.equal(next.href, "/daily-focus");
    assert.match(next.message, /Prepare tomorrow’s materials/);
    assert.doesNotMatch(next.message, /Clear the desk/);
  });
  it("uses an active Cycle’s plan when no daily action has been chosen", () => {
    const next = nextExperienceStep(experience({ cycle: cycle() }));
    assert.equal(next.href, "/daily-focus");
    assert.match(next.message, /Clear one work surface/);
    assert.doesNotMatch(next.greeting, /Blueprint is ready/);
  });
  it("responds constructively to today’s missed or partial check-in", () => {
    for (const check_in of ["missed", "progress"] as const) {
      const saved = entry({ check_in });
      const next = nextExperienceStep(experience({ daily: saved, recent: [saved] }));
      assert.equal(next.href, "/daily-focus#recovery");
      assert.doesNotMatch(next.greeting, /Blueprint is ready/);
      assert.doesNotMatch(next.message, /punish|shame|failed/i);
    }
  });
  it("celebrates action count when today is complete", () => {
    const saved = entry({ steps: completedSteps, check_in: "done", completed: true });
    const next = nextExperienceStep(experience({ daily: saved, recent: [saved] }));
    assert.equal(next.href, "/progress");
    assert.match(next.message, /3 actions completed/);
  });
  it("reopens a missed commitment with its actual action and recovery choices", () => {
    const missed = entry({ focus_date: "2026-09-14", check_in: "missed", action: "Prepare two lunch options" });
    const next = nextExperienceStep(experience({ unresolved: [missed], recent: [missed] }));
    assert.equal(next.href, "/daily-focus#recovery");
    assert.match(next.message, /Prepare two lunch options/);
    assert.match(next.message, /2026-09-14/);
    assert.match(next.message, /smaller/);
  });
  it("welcomes an inactive returning member without restarting their Blueprint", () => {
    const missed = entry({ focus_date: "2026-09-10" });
    const next = nextExperienceStep(experience({ unresolved: [missed], recent: [missed] }));
    assert.match(next.greeting, /Welcome back, Daniel/);
    assert.equal(next.href, "/daily-focus#recovery");
  });
  it("reviews a due Cycle even when an older action also needs attention", () => {
    const missed = entry({ focus_date: "2026-09-10" });
    const next = nextExperienceStep(experience({ cycle: cycle({ ends_on: "2026-09-14" }), unresolved: [missed] }));
    assert.equal(next.href, "/architect-cycle");
    assert.match(next.label, /Review/);
    assert.match(next.message, /Create a calmer workday/);
  });
  it("builds on a completed Cycle instead of suggesting first-time onboarding again", () => {
    const completed = cycle({ status: "completed", outcome: "The desk is clear and ready each morning", completed_at: "2026-09-15T12:00:00Z" });
    const next = nextExperienceStep(experience({ cycles: [completed], orientationComplete: false }));
    assert.equal(next.href, "/architect-cycle");
    assert.match(next.label, /next Cycle/);
    assert.doesNotMatch(next.greeting, /Blueprint is ready/);
  });
});

describe("public journey continuation agrees with orientation and Cycle review", () => {
  it("routes completed members through orientation only before their first Cycle", () => {
    assert.equal(nextJourneyAction({ signedIn: true, assessmentComplete: true, activeCycle: false, orientationComplete: false }).href, "/orientation");
    assert.equal(nextJourneyAction({ signedIn: true, assessmentComplete: true, activeCycle: true, orientationComplete: false }).href, "/daily-focus");
  });
  it("prioritizes the due Cycle review over normal daily navigation", () => {
    const next = nextJourneyAction({ signedIn: true, assessmentComplete: true, activeCycle: true, orientationComplete: true, cycleReviewDue: true });
    assert.equal(next.href, "/architect-cycle");
    assert.match(next.label, /Review/);
  });
});
