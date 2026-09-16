import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { areaGuidance, getAreaGuidance, resolveAreaKey } from "../lib/area-guidance.ts";
import { architectSections } from "../lib/architect-assessment.ts";
import { priorityAreaKey, recommendPlan } from "../lib/plan-recommendation.ts";
import type { Cycle, Experience } from "../lib/experience.ts";

const base: Experience = { today: "2026-09-16", timezone: "America/New_York", name: "Test member", orientationComplete: true, assessmentComplete: true, score: 59, strengths: [], priorities: [], firstActions: [], cycle: null, cycles: [], daily: null, recent: [], unresolved: [], goals: [] };
const legacyCycle: Cycle = { id: "cycle", focus: "Environment & Systems", starts_on: "2026-09-15", ends_on: "2026-09-28", status: "active", outcome: null, success_vision: null, plan_steps: [], commitment_rule: null, pillar_key: null, goal_id: null, completed_at: null, updated_at: "2026-09-15T12:00:00Z" };

describe("plain-language guidance for all seven areas", () => {
  it("covers exactly the assessment's seven unchanged keys and names", () => {
    assert.deepEqual(Object.keys(areaGuidance), architectSections.map(area => area.key));
    for (const section of architectSections) assert.equal(getAreaGuidance(section.key)?.label, section.label);
  });
  for (const [key, area] of Object.entries(areaGuidance)) {
    it(`${key}: short meaning, everyday examples, brief Kai help and concrete suggestions`, () => {
      assert.ok(area.name.length > 10);
      assert.ok(area.meaning.split(/\s+/).length <= 30);
      assert.ok(area.tip.split(/\s+/).length <= 30);
      assert.ok(area.kai.split(/\s+/).length <= 50);
      assert.ok(area.examples.length >= 3);
      assert.equal(area.actions.length, 3);
      assert.doesNotMatch([area.name, area.meaning, area.tip, area.kai, ...area.actions].join(" "), /\bdomain\b|\bDaily OS\b/i);
      assert.equal(resolveAreaKey(null, ` ${area.label.toUpperCase()} `), key);
      assert.equal(resolveAreaKey(null, area.name), key);
      const state = { ...base, priorities: [{ key, label: area.label, score: 40 }] };
      assert.deepEqual(recommendPlan(state, "").actions, [area.actions[0]]);
      assert.equal(recommendPlan(state, "").areaKey, key);
    });
  }
  it("explains surroundings/routines separately from people and support", () => {
    assert.equal(areaGuidance.environment.meaning, "The spaces, tools, routines, and everyday setups around you that either make life easier or create friction.");
    assert.match(areaGuidance.environment.kai, /not mainly the people/);
    assert.match(areaGuidance.relationships.kai, /area about people/);
  });
  it("handles unknown keys without guessing from custom text or object properties", () => {
    for (const value of [null, "", "unknown", "__proto__", "constructor"]) assert.equal(getAreaGuidance(value), null);
    assert.equal(resolveAreaKey(null, "My environment at work is stressful"), null);
    assert.equal(priorityAreaKey({ ...base, cycle: legacyCycle }, "Apply for a new job"), null);
  });
});

describe("useful new suggestions without altering saved work", () => {
  it("fixes the legacy Cycle fallback even when no area key or steps were saved", () => {
    const state = structuredClone({ ...base, cycle: legacyCycle });
    const before = structuredClone(state);
    const result = recommendPlan(state, "");
    assert.equal(result.areaKey, "environment");
    assert.deepEqual(result.actions, ["Spend 10 minutes fixing one recurring source of friction in your space or routine."]);
    assert.deepEqual(state, before);
  });
  it("keeps custom Cycle steps and caps recommendations at three", () => {
    const state = { ...base, cycle: { ...legacyCycle, plan_steps: ["Pay the water bill", "File the receipt", "Set a reminder", "Extra task"] } };
    assert.deepEqual(recommendPlan(state, "").actions, state.cycle.plan_steps.slice(0, 3));
    assert.equal(state.cycle.plan_steps.length, 4);
  });
  it("does not restart completed Cycle actions", () => {
    const state: Experience = { ...base, cycle: { ...legacyCycle, plan_steps: ["File a receipt"] }, recent: [{ id: "day", focus_date: base.today, priority: legacyCycle.focus, action: "File a receipt", completed: true, reflection: "Saved note", steps: null, check_in: "done", recovery: null, cycle_id: legacyCycle.id, updated_at: legacyCycle.updated_at }] };
    assert.match(recommendPlan(state, "").actions[0], /Review what changed/);
    assert.equal(state.recent[0].reflection, "Saved note");
  });
  it("uses a saved goal's area for help without assigning unrelated custom priorities", () => {
    const state: Experience = { ...base, goals: [{ id: "goal", title: "Talk with my brother", pillar_key: "relationships", status: "active", target_date: null, success_vision: null, commitment_rule: null, advanced_at: null }] };
    assert.equal(priorityAreaKey(state, "Talk with my brother"), "relationships");
    assert.equal(priorityAreaKey(state, "Sort the paperwork"), null);
  });
});
