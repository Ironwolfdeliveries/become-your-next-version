import assert from "node:assert/strict";
import { test } from "node:test";
import { blankReset, resetDay, resetSummary, validateReset } from "../lib/next-version-reset.ts";
import type { Experience, DailyEntry } from "../lib/experience.ts";
import { entryGuides } from "../lib/entry-guides.ts";
const answers = { ...blankReset(), direction: "My chosen direction", action: "My chosen action" };
const day: DailyEntry = { id: "d", focus_date: "2026-09-17", priority: "Keep my priority", action: "Legacy action", completed: false, reflection: "Keep my private note", steps: null, check_in: null, recovery: null, cycle_id: "cycle", updated_at: "2026-09-17T12:00:00Z" };
const state = (daily: DailyEntry | null) => ({ today: "2026-09-17", daily } as Experience);
test("Reset preserves legacy action, note, priority, Cycle and optimistic version", () => {
 const result = resetDay(state(day), answers, "new")!;
 assert.deepEqual(result.steps, [{id:"legacy", text:"Legacy action", done:false}, {id:"new", text:answers.action, done:false}]);
 assert.equal(result.reflection, day.reflection); assert.equal(result.priority, day.priority); assert.equal(result.cycle_id, day.cycle_id); assert.equal(result.expected_updated_at, day.updated_at);
});
test("Reset refuses to reopen checked-in days or exceed three steps", () => {
 for (const check_in of ["done", "missed", "progress"] as const) assert.throws(() => resetDay(state({...day, check_in}), answers, "new"), /check-in/);
 assert.throws(() => resetDay(state({...day, steps:[1,2,3].map(n=>({id:String(n),text:String(n),done:false}))}),answers,"new"), /three steps/);
 assert.throws(() => resetDay(state({...day,recovery:{strategy:"keep",next_date:"2026-09-18",next_action:"x",resolved_at:"now"}}),answers,"new"),/check-in/);
});
test("Retries do not append a duplicate; new days do not silently attach to a Cycle",()=>{
 assert.equal(resetDay(state({...day,action:answers.action}),answers,"new"),null);
 assert.equal(resetDay(state(null),answers,"new")?.cycle_id,null);
});
test("Summary contains only provided answers and validation bounds them",()=>{
 assert.equal(resetSummary(answers).includes("fear"),false);
 assert.deepEqual(validateReset({...answers,unexpected:"ignored"}),answers);
 assert.throws(()=>validateReset(blankReset()));
 assert.throws(()=>validateReset({...answers,direction:"x".repeat(161)}));
 assert.throws(()=>validateReset({...answers,action:"x".repeat(601)}));
});
test("Published guides have distinct exercises and valid related destinations",()=>{
 assert.equal(new Set(entryGuides.map(g=>g.exercise)).size,entryGuides.length);
 for(const g of entryGuides) { assert.ok(entryGuides.some(other=>other.slug===g.next)); assert.ok(g.sections.length>=3); assert.ok(g.question && g.answer); }
});
