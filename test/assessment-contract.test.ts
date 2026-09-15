import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { architectSections, architectQuestionCount, architectScoredQuestionCount } from "../lib/architect-assessment.ts";
import { createBlueprint } from "../lib/blueprint.ts";

// Prevent the SQL completion contract from drifting from the existing assessment.
const sql = readFileSync(new URL("../docs/assessment-preservation.sql", import.meta.url), "utf8");
const metadata = sql.match(/v_config jsonb := '([\s\S]*?)'::jsonb;/)?.[1];
assert.ok(metadata, "Assessment SQL must include its scoring question contract");
const dbSections = JSON.parse(metadata) as { key: string; label: string; questions: string[]; action: string }[];
assert.equal(architectQuestionCount, 42);
assert.equal(architectScoredQuestionCount, 35);
assert.equal(dbSections.length, 7);
for (const [index, section] of architectSections.entries()) {
  const stored = dbSections[index];
  assert.equal(stored.key, section.key);
  assert.equal(stored.label, section.label);
  assert.deepEqual(stored.questions.map((key) => `${stored.key}-${key}`), section.questions.filter((question) => question.type === "scale").map((question) => question.id));
  assert.deepEqual(section.questions.filter((question) => question.type === "text").map((question) => question.id), [`${stored.key}-reflection`]);
  const blueprint = createBlueprint({ score: 40, scoredAnswers: 35, sections: architectSections.map((other) => ({ key: other.key, label: other.label, score: other.key === section.key ? 20 : 80, answered: 5 })) });
  assert.equal(stored.action, blueprint.firstActions[0].action);
}
console.log("Assessment SQL and UI preserve all 42 questions, seven areas, score inputs and Blueprint first actions.");
