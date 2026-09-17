import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

const dom = new JSDOM('<!doctype html><html><body><div id="app"></div></body></html>', { url: "https://bynv.test/daily-focus", pretendToBeVisual: true });
for (const name of ["window", "document", "navigator", "HTMLElement", "HTMLInputElement", "HTMLTextAreaElement", "MutationObserver", "Event", "CustomEvent", "getComputedStyle"]) Object.defineProperty(globalThis, name, { value: dom.window[name], configurable: true, writable: true });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { getByRole, getByLabelText, queryByRole, fireEvent } = await import("@testing-library/dom");
const { createElement, act, createRoot, DailyFocus, ArchitectCycle, Orientation, MemberCommandCenter, GoalsWorkspace, MomentumOverview } = await import("./components.mjs");

const today = "2026-09-15";
const makeEntry = (overrides = {}) => ({ id: "day-1", focus_date: today, priority: "Clear the workspace", action: "Clear one work surface", completed: false, reflection: "Existing User #1 note", steps: [{id:"step-1",text:"Clear one work surface",done:false}], check_in: null, recovery: null, cycle_id: null, updated_at: "2026-09-15T12:00:00Z", ...overrides });
const makeCycle = (overrides = {}) => ({ id: "cycle-1", focus: "Environment & Systems", starts_on: "2026-09-15", ends_on: "2026-09-28", status: "active", outcome: null, success_vision: "Find my tools easily each morning", plan_steps: ["Clear one work surface"], commitment_rule: "shrink", pillar_key: "environment", goal_id: null, completed_at: null, updated_at: "2026-09-15T12:00:00Z", ...overrides });
const makeState = (overrides = {}) => ({ today, timezone: "America/New_York", name: "Daniel", orientationComplete: true, assessmentComplete: true, score: 59, strengths: [{key:"clarity",label:"Clarity & Direction",score:76}], priorities: [{key:"environment",label:"Environment & Systems",score:39}], firstActions: [{key:"environment",action:"Clear one work surface"}], cycle:null,cycles:[],daily:null,recent:[],unresolved:[],goals:[], ...overrides });
let state = makeState(), calls = [], routes = [], root, qaGoals=[];
globalThis.__qaSupabase={from(table){assert.equal(table,"goals");let values=null,insert=false,id=null;const query={select(){return query},eq(key,value){if(key==="id")id=value;return query},neq(){return query},order(){return Promise.resolve({data:qaGoals,error:null})},update(v){values=v;return query},insert(v){values=v;insert=true;return query},single(){const saved=insert?{id:"goal-1",status:"active",advanced_at:null,updated_at:"2026-09-15T12:00:00Z",...values}:{...qaGoals.find(g=>g.id===id),...values};qaGoals=insert?[saved]:qaGoals.map(g=>g.id===id?saved:g);state.goals=qaGoals;return Promise.resolve({data:saved,error:null})}};return query;}};
globalThis.__qaRouter = { push: path => routes.push(path), refresh: () => {} };
globalThis.fetch = async (url, init) => {
  assert.equal(url, "/api/account/experience");
  if (init?.method !== "POST") return { ok:true,json:async()=>structuredClone(state) };
  const payload = JSON.parse(init.body); calls.push(payload);
  if (payload.action === "orientation") state.orientationComplete = true;
  if (payload.action === "start-cycle") {
    state.cycle = makeCycle(payload); state.cycles = [state.cycle];
    if (!state.daily) {
      state.daily = makeEntry({ priority:payload.focus,cycle_id:state.cycle.id,steps:payload.plan_steps.map((text,index)=>({id:`new-${index}`,text,done:false})),reflection:null });
      state.recent = [state.daily];
    }
  }
  if (payload.action === "save-day") {
    state.daily = makeEntry({ ...state.daily,priority:payload.priority,steps:payload.steps,action:payload.steps.map(step=>step.text).join("; "),check_in:payload.check_in,reflection:payload.reflection,completed:payload.check_in === "done",updated_at:"2026-09-15T13:00:00Z" });
    state.recent = [state.daily,...state.recent.filter(entry=>entry.id!==state.daily.id)];
  }
  if (payload.action === "recover") {
    const source = state.recent.find(entry=>entry.id===payload.entry_id);
    source.recovery = {reason:payload.reason,strategy:payload.strategy,next_date:payload.next_date,next_action:payload.next_action,resolved_at:"2026-09-15T14:00:00Z"};
    state.unresolved = state.unresolved.filter(entry=>entry.id!==source.id);
    state.recent.push(makeEntry({ id:"recovered-next",focus_date:payload.next_date,action:payload.next_action,steps:[{id:"next-step",text:payload.next_action,done:false}],reflection:null }));
  }
  if(payload.action === "complete-goal") {qaGoals=qaGoals.map(goal=>goal.id===payload.goal_id?{...goal,status:"completed",change_review:payload.change_review}:goal);state.goals=qaGoals;}
  if (payload.action === "review-cycle") {
    const completed = {...state.cycle,status:"completed",change_review:payload.change_review,outcome:payload.change_review.changed,completed_at:"2026-09-15T15:00:00Z"};
    state.cycles = [completed,...state.cycles.filter(cycle=>cycle.id!==completed.id)]; state.cycle=null;
  }
  return {ok:true,json:async()=>({ok:true})};
};
const container = document.getElementById("app");
async function mount(Component, props = {}) {
  if (root) await act(async()=>root.unmount());
  container.innerHTML = "";
  root = createRoot(container);
  await act(async()=>root.render(createElement(Component, props)));
}
async function click(name) { await act(async()=>fireEvent.click(getByRole(container,"button",{name}))); }
async function change(label, value) { await act(async()=>fireEvent.change(getByLabelText(container,label),{target:{value}})); }
function reset(next = makeState()) { state=next;calls=[];routes=[];qaGoals=next.goals; }
let passed=0;
async function check(name, fn) { try { await fn(); passed++; console.log(`PASS ${name}`); } catch(error) { console.error(`FAIL ${name}`); throw error; } }

try {
  await check("orientation uses preserved 59 score, finishes once, and hands off to first Cycle", async()=>{
    reset(makeState({orientationComplete:false})); await mount(Orientation);
    assert.match(container.textContent,/59 \/ 100/);
    assert.equal(container.querySelector("audio, video"),null);
    for(const name of ["How do I choose a direction?","How does that become a plan?","What do I do each day?","What if life gets in the way?","How will I see progress?","Let's build my first Cycle"]) await click(name);
    assert.equal(calls.length,1);assert.equal(calls[0].action,"orientation");assert.equal(routes.at(-1),"/architect-cycle");assert.equal(state.score,59);
  });
  await check("Cycle conversation accepts Blueprint priority, proposed action, constructive rule, then opens saved Today’s Plan", async()=>{
    reset();await mount(ArchitectCycle);
    await act(async()=>fireEvent.click(container.querySelector("details summary")));
    for(const detail of container.querySelectorAll("details")) detail.open=true;
    await click(/Start with my Blueprint recommendation/);
    await change(/I'll know this is helping when/,"Find my tools easily each morning");
    await click("Help me choose my steps");
    assert.match(container.textContent,/Spend 10 minutes fixing one recurring source of friction/);
    await click("Use these steps");
    for(const detail of container.querySelectorAll("details")) detail.open=true;
    await change(/If you miss this commitment/,"shrink");
    await click("Begin my Cycle & open Today's Plan");
    assert.deepEqual(calls.map(call=>call.action),["start-cycle"]);
    assert.equal(calls[0].commitment_rule,"shrink");assert.equal(calls[0].focus,"Environment & Systems");assert.deepEqual(calls[0].plan_steps,["Spend 10 minutes fixing one recurring source of friction in your space or routine."]);assert.equal(routes.at(-1),"/daily-focus");
    await mount(DailyFocus);assert.match(container.textContent,/Spend 10 minutes fixing one recurring source of friction/);assert.match(container.textContent,/0 of 1 complete/);
  });
  await check("Got it done persists all three steps, updates reward count, and preserves an existing note", async()=>{
    const daily=makeEntry({steps:["Clear one work surface","Prepare tools","Work for ten minutes"].map((text,index)=>({id:`step-${index}`,text,done:false}))});
    reset(makeState({daily,recent:[daily]}));await mount(DailyFocus);await click("Got it done");
    assert.equal(calls[0].check_in,"done");assert.equal(calls[0].steps.filter(step=>step.done).length,3);assert.equal(calls[0].reflection,"Existing User #1 note");
    assert.match(container.textContent,/3 of 3 complete/);assert.match(container.textContent,/3 actions in the last seven days/);
    assert.equal(queryByRole(container,"button",{name:"Make it smaller"}),null);
  });
  await check("Made progress saves without required reflection and exposes a smaller next action", async()=>{
    const daily=makeEntry({reflection:null,steps:[{id:"one",text:"Clear one work surface",done:true},{id:"two",text:"Prepare tools",done:false}]});
    reset(makeState({daily,recent:[daily]}));await mount(DailyFocus);await click("Made progress");
    assert.equal(calls[0].check_in,"progress");assert.equal(calls[0].reflection,"");assert.equal(calls[0].steps.filter(step=>step.done).length,1);
    await click("Low energy"); await click("Make it smaller");
    assert.match(getByLabelText(container,"Next action").value,/Spend just 5 minutes starting: Prepare tools/);
    await click("Save my next step");
    assert.equal(calls[1].action,"recover");assert.equal(calls[1].strategy,"shrink");assert.equal(calls[1].next_date,"2026-09-16");assert.match(container.textContent,/Next step saved for Sep 16/);
  });
  await check("Didn’t happen offers keep, shrink, reschedule and replace without discarding the saved action", async()=>{
    const daily=makeEntry();reset(makeState({daily,recent:[daily]}));await mount(DailyFocus);await click("Didn’t happen");
    assert.equal(calls[0].check_in,"missed");
    await click("Forgot");
    for(const name of ["Keep the action","Make it smaller","Move it","Another approach"]) assert.ok(getByRole(container,"button",{name}));
    await click("Keep the action");await click("Save my next step");
    assert.equal(calls[1].next_action,"Clear one work surface");assert.equal(state.daily.action,"Clear one work surface");assert.equal(state.daily.reflection,"Existing User #1 note");
  });
  await check("returning command center continues saved legacy work without an active Cycle", async()=>{
    const daily=makeEntry({steps:null,action:"Review the outstanding deliveries"});reset(makeState({daily,recent:[daily]}));
    await mount(MemberCommandCenter,{initial:state,owner:true});
    const kai=container.querySelector(".command-kai");assert.match(kai.textContent,/Review the outstanding deliveries/);assert.doesNotMatch(kai.textContent,/Blueprint is ready/);
    assert.equal(getByRole(kai,"link",{name:/Continue Today/}).getAttribute("href"),"/daily-focus");assert.match(container.textContent,/Coaching · Owner QA/);
  });
  await check("a due Cycle saves its chosen review and offers the next Cycle with prior context",async()=>{
    const cycle=makeCycle({starts_on:"2026-09-01",ends_on:"2026-09-14"});reset(makeState({cycle,cycles:[cycle]}));await mount(ArchitectCycle);
    assert.match(container.textContent,/Ready to review/);await click("Review & finish this Cycle");
    await change(/What is different now/,"My tools are ready each morning");await click("Continue");
    await change(/What can you point to/,"I found everything I needed on three mornings");await click("Continue");await click("Skip");await click("Skip");await change(/What will you carry/,"Keep the five-minute evening reset");await click("Save review & complete");
    assert.equal(calls[0].action,"review-cycle");assert.equal(calls[0].expected_updated_at,cycle.updated_at);assert.equal(calls[0].change_review.changed,"My tools are ready each morning");assert.equal(calls[0].change_review.carry,"Keep the five-minute evening reset");
    assert.match(container.textContent,/You finished: Environment & Systems/);await click("Build on this Cycle");
    assert.match(container.textContent,/Find my tools easily each morning/);assert.match(container.textContent,/Keep the five-minute evening reset/);
  });

  for(const title of ["Finish my unfinished project","Improve a health habit I choose","Grow in my career","Organize my responsibilities","Explore my next version"]){
    await check(`Goals keeps the member’s chosen direction: ${title}`,async()=>{
      reset();await mount(GoalsWorkspace,{userId:"member"});
      assert.equal(getByRole(container,"textbox",{name:"What would you like to be different?"}).placeholder,"");
      await change("What would you like to be different?",title);await click("Continue");
      await change(/Why does this matter to you/,"This matters for my own reasons");await click("Continue");
      await change("What would success look like?","Notice a change that I can explain");await click("Continue");await click("Continue");
      for(const detail of container.querySelectorAll("details")) detail.open=true;
      await change(/If you follow through/,"Time for something I enjoy");
      await click("Save my goal");
      assert.equal(qaGoals[0].title,title);assert.equal(qaGoals[0].motivation,"This matters for my own reasons");assert.equal(qaGoals[0].personal_reward,"Time for something I enjoy");
      await click("Mark goal complete");assert.equal(qaGoals[0].status,"active");
      await click("No clear change yet");await click("Continue");
      await change(/What can you point to/,"I do not yet have evidence of a different result.");await click("Continue");await click("Skip");await click("Skip");await click("Save review & complete");
      assert.equal(qaGoals[0].status,"completed");assert.equal(qaGoals[0].change_review.changed,"No clear change yet.");
    });
  }
  await check("Momentum shows honest check-ins, unfinished recovery, and member evidence",async()=>{
    const missed=makeEntry({check_in:"missed"});
    reset(makeState({daily:missed,recent:[missed],goals:[{id:"goal",title:"My personal direction",status:"completed",change_review:{changed:"A difference I chose",evidence:"My own observation",helped:"",remaining:"",carry:""}}]}));
    await mount(MomentumOverview,{initial:state});
    assert.match(container.textContent,/1 commitment needs a next move/);
    assert.match(container.textContent,/1 check-in in the last seven days/);
    assert.match(container.textContent,/A difference I chose/);
    assert.equal(container.querySelector('[aria-label="Momentum totals"]').firstChild.textContent,"0actions completed");
  });
  console.log(`${passed} component integration scenarios passed. API persistence and Next routing were mocked; this does not replace database integration or browser verification.`);
} finally {
  if(root) await act(async()=>root.unmount());
  dom.window.close();
}
process.exit(0);
