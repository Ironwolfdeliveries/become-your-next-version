import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
const dom=new JSDOM('<html><body><div id="app"></div></body></html>',{url:"https://bynv.test/next-version-reset"});
for(const name of ["window","document","navigator","HTMLElement","HTMLInputElement","HTMLTextAreaElement","MutationObserver","Event","CustomEvent","getComputedStyle"]) Object.defineProperty(globalThis,name,{value:dom.window[name],configurable:true,writable:true});
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const {getByRole,getByLabelText,fireEvent}=await import("@testing-library/dom");
const {createElement,act,createRoot,NextVersionReset,resetPOST}=await import("./components.mjs");
const state={today:"2026-09-17",timezone:"UTC",name:"Synthetic",orientationComplete:true,assessmentComplete:true,score:59,strengths:[],priorities:[],firstActions:[],cycle:null,cycles:[],daily:null,recent:[],unresolved:[],goals:[]};
let root,calls=[],fail=false;
const container=document.getElementById("app");
globalThis.fetch=async(url,init)=>{if(!init?.method)return {ok:true,json:async()=>state};const payload=JSON.parse(init.body);calls.push({url,payload});return {ok:!fail,json:async()=>fail?{error:"Try again safely."}:{ok:true,id:payload.id}};};
async function click(name){await act(async()=>fireEvent.click(getByRole(container,"button",{name,exact:true})));}
async function answer(value){await act(async()=>fireEvent.change(getByRole(container,"textbox"),{target:{value}}));}
async function mount(){calls=[];await act(async()=>{root=createRoot(container);root.render(createElement(NextVersionReset,{initial:state}));});}
async function unmount(){await act(async()=>root.unmount());}
for(const direction of ["Finish something I chose","Build a health routine that fits me","Explore my work direction","Organize my responsibilities","Make space for something worthwhile"]){
 await mount(); await answer(direction); await click("Continue"); await click("Skip this question"); await answer("Take my own first step"); await click("Review my summary");
 assert.equal(calls.length,0,"No answers sent before explicit save");assert.ok(container.textContent.includes(direction));
 await click("Save direction as a new goal");assert.equal(calls[0].payload.answers.direction,direction);assert.equal(calls[0].payload.kind,"goal");await unmount();
}
await mount();await answer("My own direction");await act(async()=>fireEvent.click(getByLabelText(container,/explore patterns/)));await click("Continue");await answer("I put other things first");await click("Continue");await click("Skip this question");await click("Skip this question");await answer("I worry it will take too much time");await click("Continue");assert.ok(container.textContent.includes("I put other things first"));await answer("I can point to one finished part");await click("Continue");assert.ok(container.textContent.includes("Given the worry you named"));await answer("Choose a small part");await click("Review my summary");
fail=true;await click("Save summary privately to Journal");assert.ok(getByRole(container,"alert").textContent.includes("Try again"));const retryId=calls[0].payload.id;fail=false;await click("Save summary privately to Journal");assert.equal(calls[1].payload.id,retryId);assert.equal(calls[1].payload.answers.pattern,"I put other things first");await unmount();
await mount();await answer("I want to kill myself");await click("Continue");assert.ok(getByRole(container,"alert").textContent.includes("local emergency"));assert.equal(calls.length,0);await unmount();
console.log("Reset UI: five self-chosen profiles, optional depth, adaptive wording, explicit saving, safe retry and urgent safety passed.");
// Exercise the actual route with authenticated/RLS-client doubles; SQL policies are tested separately.
let signedIn=true,dbError=null,savedRow=null,dbCalls=[];
globalThis.__qaSupabase={auth:{getUser:async()=>({data:{user:signedIn?{id:"owner"}:null},error:null})},from(table){const query={insert:async values=>{dbCalls.push({table,values});return {error:dbError};},select(){return query},eq(){return query},single:async()=>({data:savedRow,error:null})};return query;}};
const payload={kind:"journal",id:"11111111-1111-4111-8111-111111111111",answers:{direction:"My direction",pattern:"Private pattern",avoidance:"",identity:"",fear:"",change:"My evidence",action:"My action"}};
const request=(body=payload,origin="https://bynv.test")=>new Request("https://bynv.test/api/account/reset",{method:"POST",headers:{origin,"Content-Type":"application/json"},body:JSON.stringify(body)});
assert.equal((await resetPOST(request(payload,"https://other.test"))).status,403);signedIn=false;assert.equal((await resetPOST(request())).status,401);assert.equal(dbCalls.length,0);signedIn=true;
assert.equal((await resetPOST(request({...payload,answers:{}}))).status,400);
let response=await resetPOST(request());assert.equal(response.status,200);assert.equal(response.headers.get("Cache-Control"),"private, no-store");assert.equal(dbCalls[0].values.user_id,"owner");savedRow=dbCalls[0].values;dbError={code:"23505"};assert.equal((await resetPOST(request())).status,200);savedRow={...savedRow,content:"Changed"};assert.equal((await resetPOST(request())).status,409);
dbError=null;assert.equal((await resetPOST(request({...payload,kind:"goal"}))).status,200);const goal=dbCalls.at(-1).values;assert.equal(goal.title,"My direction");assert.equal(goal.success_vision,"My evidence");assert.ok(!JSON.stringify(goal).includes("Private pattern"));
console.log("Reset API: authentication, origin, validation, private responses, owned insert, retry conflict and minimal goal payload passed.");

dom.window.close();
process.exit(0);
