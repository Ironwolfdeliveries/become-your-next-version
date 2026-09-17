import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
const dom = new JSDOM('<!doctype html><html><body><div id="app"></div></body></html>', { url: "https://bynv.test", pretendToBeVisual: true });
for (const name of ["window", "document", "navigator", "HTMLElement", "HTMLInputElement", "Event", "CustomEvent"]) Object.defineProperty(globalThis, name, { value: dom.window[name], configurable: true });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { createElement, act, createRoot, DailyFocus, ArchitectCycle, AreaHelp, areaGuidance } = await import("./components.mjs");
const { getByRole, fireEvent } = await import("@testing-library/dom");
let state, writes = 0, root;
globalThis.__qaRouter = { push() {}, refresh() {} };
globalThis.fetch = async (url, init) => {
  assert.equal(url, "/api/account/experience");
  if (init?.method === "POST") { writes++; throw new Error("Help must not save anything"); }
  return {ok:true,json:async()=>structuredClone(state)};
};
const container = document.getElementById("app");
async function mount(Component, props = {}) {
  if (root) await act(async()=>root.unmount());
  root=createRoot(container); await act(async()=>root.render(createElement(Component,props)));
}
try {
  for (const [key, area] of Object.entries(areaGuidance)) {
    state={today:"2026-09-16",timezone:"America/New_York",name:"Test member",orientationComplete:true,assessmentComplete:true,score:59,strengths:[],priorities:[{key,label:area.label,score:40}],firstActions:[],cycle:null,cycles:[],daily:null,recent:[],unresolved:[],goals:[]};
    const before=structuredClone(state);
    await mount(DailyFocus);
    assert.ok(container.textContent.includes(area.meaning));
    assert.ok(container.textContent.includes(area.tip));
    assert.ok(container.textContent.includes(area.actions[0]));
    const summary=container.querySelector(".area-help-kai summary");
    assert.match(summary.textContent,/What does this mean\? Ask Kai/);
    assert.equal(summary.parentElement.open,false);
    await act(async()=>fireEvent.click(summary));
    assert.equal(summary.parentElement.open,true);
    assert.ok(summary.parentElement.textContent.includes(area.kai));
    for(const example of area.examples) assert.ok(summary.parentElement.textContent.includes(example));
    assert.deepEqual(state,before);assert.equal(writes,0);
    await mount(ArchitectCycle);
    for(const detail of container.querySelectorAll("details")) detail.open=true;
    await act(async()=>fireEvent.click(getByRole(container,"button",{name:/Start with my Blueprint recommendation/})));
    assert.ok(container.textContent.includes(area.tip));
    assert.ok(container.textContent.includes(area.meaning));
    assert.deepEqual(state,before);assert.equal(writes,0);
    console.log(`PASS ${key}: daily help, native inline Kai, examples, Cycle guidance, no writes`);
  }
  state.cycle={id:"legacy",focus:"Environment & Systems",starts_on:"2026-09-15",ends_on:"2026-09-28",status:"active",outcome:null,success_vision:null,plan_steps:[],commitment_rule:null,pillar_key:null,goal_id:null,completed_at:null,updated_at:"2026-09-15T12:00:00Z"};
  await mount(ArchitectCycle);
  assert.ok(container.textContent.includes(areaGuidance.environment.meaning));
  await mount(DailyFocus);
  assert.ok(container.textContent.includes(areaGuidance.environment.actions[0]));
  assert.equal(state.score,59);assert.equal(writes,0);
  await mount(AreaHelp,{areaKey:"unknown"});assert.equal(container.textContent,"");
  console.log("PASS legacy Cycle help and useful fallback, preserved score, unknown-area safety");
} finally { if(root)await act(async()=>root.unmount());dom.window.close(); }
process.exit(0);
