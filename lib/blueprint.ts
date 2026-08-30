import type { ReturnTypeOfArchitectResults } from "./types";

const firstActions: Record<string, string> = {
  clarity: "Name one 90-day outcome and the decision it makes easier this week.",
  energy: "Protect one repeatable recovery block in your calendar this week.",
  action: "Reduce one priority to a ten-minute action and repeat it three times.",
  resilience: "Write a simple reset plan for the next time the week changes direction.",
  relationships: "Ask one trusted person for the specific support or conversation you need.",
  environment: "Remove one recurring source of friction from your primary space or system.",
  growth: "Schedule a 15-minute weekly review to keep, change, or remove one thing.",
};

export function createBlueprint(results: ReturnTypeOfArchitectResults) {
  const ordered = [...results.sections].sort((a, b) => b.score - a.score);
  const strengths = ordered.filter((section) => section.score === ordered[0]?.score).map(({ key, label, score }) => ({ key, label, score }));
  const ascending = [...results.sections].sort((a, b) => a.score - b.score);
  const priorities = ascending.slice(0, 2).map(({ key, label, score }) => ({ key, label, score }));
  return {
    strengths,
    priorities,
    frictionPoints: priorities.map((priority) => `${priority.label} currently has the most room for focused support.`),
    firstActions: priorities.map((priority) => ({ key: priority.key, action: firstActions[priority.key] })),
  };
}
