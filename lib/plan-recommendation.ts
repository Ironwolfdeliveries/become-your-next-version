import { getAreaGuidance, resolveAreaKey } from "./area-guidance.ts";
import { entrySteps, type Experience } from "./experience.ts";

const clean = (value: string) => value.trim().toLowerCase();
export function priorityAreaKey(experience: Experience, priority: string) {
  const cycle = experience.cycle;
  if (cycle && clean(priority) === clean(cycle.focus.slice(0, 200))) return resolveAreaKey(cycle.pillar_key, cycle.focus);
  const goal = experience.goals.find(item => item.status === "active" && clean(item.title.slice(0, 200)) === clean(priority));
  return resolveAreaKey(goal?.pillar_key, priority);
}

export function recommendPlan(experience: Experience, selectedPriority: string) {
  const cycle = experience.cycle;
  const goal = experience.goals.find(item => item.status === "active");
  const priority = (selectedPriority.trim() || cycle?.focus || goal?.title || experience.priorities[0]?.label || "Make room for what matters today").slice(0, 200);
  const areaKey = priorityAreaKey(experience, priority);
  const guide = getAreaGuidance(areaKey);
  let source = "A small start for your priority";
  let actions: string[] = [];
  if (cycle && clean(priority) === clean(cycle.focus.slice(0, 200))) {
    source = "From your current Architect Cycle";
    const completed = new Set(experience.recent.filter(entry => entry.cycle_id === cycle.id)
      .flatMap(entry => entrySteps(entry).filter(step => step.done).map(step => clean(step.text))));
    const saved = cycle.plan_steps?.filter(Boolean) || [];
    actions = saved.filter(action => !completed.has(clean(action))).slice(0, 3);
    if (saved.length && !actions.length) actions = [`Review what changed in “${cycle.focus}” and choose one useful next step for the rest of this Cycle.`];
  } else if (experience.goals.some(item => item.status === "active" && clean(item.title.slice(0, 200)) === clean(priority))) {
    source = "From your active goal";
    actions = [`Choose one task that would move “${priority}” forward, then spend 10 minutes starting it.`];
  } else if (areaKey) source = "A starting point from your Blueprint";
  // Improve new recommendations only. Never rewrite a member's saved steps or Blueprint.
  if (!actions.length) actions = [guide?.actions[0] ?? `Choose one task that would move “${priority}” forward, then spend 10 minutes starting it.`];
  return { priority, source, actions, areaKey };
}
