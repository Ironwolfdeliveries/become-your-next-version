import { architectLibrary } from "./architect-library.ts";
import { resolveAreaKey } from "./area-guidance.ts";
import type { Experience } from "./experience.ts";
export function relevantResources(state: Experience) {
  const goal = state.goals.find(g => g.id === state.cycle?.goal_id) ?? state.goals.find(g => g.status === "active");
  const key = resolveAreaKey(state.cycle?.pillar_key ?? goal?.pillar_key, state.cycle?.focus ?? goal?.title) ?? (!state.cycle && !goal ? state.priorities[0]?.key : undefined);
  const byArea: Record<string,string> = {clarity:"smallest-useful-step",energy:"realistic-energy-plan",action:"ten-minute-focus-reset",resilience:"smallest-useful-step",relationships:"clear-conversation-plan",environment:"ten-minute-focus-reset",growth:"weekly-progress-review"};
  const slugs = new Set([byArea[key ?? ""] ?? "smallest-useful-step", "weekly-progress-review"]);
  return architectLibrary.filter(resource => slugs.has(resource.slug)).slice(0,2);
}
