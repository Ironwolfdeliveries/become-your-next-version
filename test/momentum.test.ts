import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { momentumFacts, validReview, emptyReview, safePersonalChoice } from "../lib/momentum.ts";
import { nextExperienceStep } from "../lib/experience-guidance.ts";
import { recommendPlan } from "../lib/plan-recommendation.ts";
import { relevantResources } from "../lib/library-recommendations.ts";
import type { Experience, DailyEntry, Cycle } from "../lib/experience.ts";
const today="2026-09-17";
const base: Experience={today,timezone:"America/New_York",name:"Member",orientationComplete:true,assessmentComplete:true,score:59,strengths:[],priorities:[{key:"environment",label:"Environment & Systems",score:39}],firstActions:[],cycle:null,cycles:[],daily:null,recent:[],unresolved:[],goals:[]};
const day=(overrides:Partial<DailyEntry>={}):DailyEntry=>({id:"day",focus_date:today,priority:"My chosen direction",action:"My chosen step",completed:false,reflection:null,steps:[{id:"step",text:"My chosen step",done:false}],check_in:null,recovery:null,cycle_id:null,updated_at:"2026-09-17T12:00:00Z",...overrides});
const profiles=[
 ["Finish my project","Draft the opening paragraph"],
 ["Build a health habit I choose","Prepare what I need for my chosen habit"],
 ["Grow in my career","List what I want to learn next"],
 ["Organize everyday responsibilities","Put my upcoming reminders in one place"],
 ["Explore my next version","Choose one skill I am curious about"],
];
describe("one framework follows five member-chosen directions",()=>{
 for(const [focus,step] of profiles) it(focus,()=>{
   const cycle:Cycle={id:"cycle",focus,starts_on:today,ends_on:"2026-09-30",status:"active",outcome:null,success_vision:"Recognize a change I care about",plan_steps:[step],commitment_rule:null,pillar_key:null,goal_id:null,completed_at:null,updated_at:"2026-09-17T12:00:00Z"};
   const state={...base,cycle,cycles:[cycle]};
   assert.deepEqual(recommendPlan(state,"").actions,[step]);
   assert.match(nextExperienceStep(state).message,new RegExp(step));
   const missed=day({priority:focus,action:step,steps:[{id:"step",text:step,done:false}],check_in:"missed"});
   const recoveryState={...state,daily:missed,recent:[missed]};
   assert.equal(nextExperienceStep(recoveryState).href,"/daily-focus#recovery");
   assert.equal(momentumFacts(recoveryState).recoveryNeeded.length,1);
   const saved=day({...missed,recovery:{strategy:"shrink",reason:"Low energy",next_date:"2026-09-18",next_action:step,resolved_at:"2026-09-17T13:00:00Z"}});
   const recovered={...state,daily:saved,recent:[saved]};
   assert.equal(momentumFacts(recovered).recoveryNeeded.length,0);
   assert.match(nextExperienceStep(recovered).message,/Planned for 2026-09-18/);
   const done=day({...missed,completed:true,check_in:"done",steps:[{id:"step",text:step,done:true}]});
   assert.equal(momentumFacts({...state,recent:[done]}).completedActions[0].text,step);
   assert.equal(nextExperienceStep({...state,daily:done,recent:[done]}).href,"/momentum");
   assert.equal(nextExperienceStep({...state,cycle:{...cycle,ends_on:"2026-09-16"}}).href,"/architect-cycle");
   assert.ok(relevantResources(state).length>=1);
 });
});
describe("honest momentum and brief evidence",()=>{
 it("counts honest check-ins and recovery without inventing completed actions",()=>{
   const missed=day({check_in:"missed"}),partial=day({id:"yesterday",focus_date:"2026-09-16",check_in:"progress"});
   const facts=momentumFacts({...base,recent:[missed,partial]});
   assert.equal(facts.checkins,2);assert.equal(facts.completedActions.length,0);assert.equal(facts.recoveryNeeded.length,2);
 });
 it("recognizes a comeback only after its scheduled action is actually completed",()=>{
   const source=day({focus_date:"2026-09-16",recovery:{strategy:"keep",next_date:today,next_action:"My chosen step",resolved_at:"2026-09-16T12:00:00Z"}});
   assert.equal(momentumFacts({...base,recent:[source,day()]}).comeback,false);
   assert.equal(momentumFacts({...base,recent:[source,day({steps:[{id:"step",text:"My chosen step",done:true}]})]}).comeback,true);
 });
 it("requires change and evidence while accepting no change honestly",()=>{
   assert.equal(validReview(emptyReview),false);
   assert.equal(validReview({...emptyReview,changed:"No clear change yet."}),false);
   assert.equal(validReview({...emptyReview,changed:"No clear change yet.",evidence:"I do not yet have evidence of a different result."}),true);
   assert.equal(validReview({...emptyReview,changed:"x".repeat(601),evidence:"A short observation"}),false);
 });
 it("rejects clearly harmful penalties and allows constructive personal support",()=>{
   for(const value of ["Skip meals", "Humiliate myself", "Pay a fine", "Exercise until collapse"]) assert.equal(safePersonalChoice(value),false,value);
   assert.equal(safePersonalChoice("Ask a friend for help choosing a smaller step"),true);
   assert.equal(safePersonalChoice("Take an evening off"),true);
 });
 it("asks an open question before proposing a Blueprint answer",()=>{
   const next=nextExperienceStep(base);
   assert.match(next.message,/What would you genuinely like to be different/);
   assert.doesNotMatch(next.message,/Environment & Systems|Lose|smoking|new job/);
 });
 it("recognizes a chosen goal date, inactivity, and a recent reassessment",()=>{
   const goal={id:"g",title:"My direction",pillar_key:null,status:"active",target_date:"2026-09-18",success_vision:null,commitment_rule:null,advanced_at:null};
   assert.equal(nextExperienceStep({...base,goals:[goal]}).href,"/goals");
   assert.equal(nextExperienceStep({...base,goals:[{...goal,target_date:null}]}).href,"/architect-cycle?goal=g");
   assert.match(nextExperienceStep({...base,recent:[day({focus_date:"2026-09-01",check_in:"done",completed:true})]}).greeting,/Welcome back/);
   assert.equal(nextExperienceStep({...base,assessmentChange:7,assessmentDate:today}).href,"/momentum#comparison");
 });
});
