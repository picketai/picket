import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { rank, similarPairs, skillDescriptions, vectorise } from "./routing.mjs";

const MIN_SHARE = 0.95;
const FAIL_SIMILARITY = 0.75;
const REPORT_SIMILARITY = 0.5;
const MIN_POSITIVE = 3;
const MIN_NEGATIVE = 2;
const LANE_SKILLS = ["designing", "expediting", "ordering", "researching"];

const DOCS = skillDescriptions(resolve("."));
const MODEL = vectorise(DOCS);
const CASES = JSON.parse(readFileSync(resolve("test", "skills", "description-cases.json"), "utf8"));
const NAMES = DOCS.map((d) => d.name);

function outcomes() {
  return CASES.flatMap(({ skill, positive, negative }) => [
    ...positive.map((prompt) => {
      const top = rank(prompt, MODEL);
      return { skill, prompt, kind: "positive", passed: top[0].name === skill, top };
    }),
    ...negative.map(({ prompt, owner }) => {
      const top = rank(prompt, MODEL);
      const position = (name) => top.findIndex((r) => r.name === name);
      return { skill, prompt, kind: `negative (owner ${owner})`, passed: position(owner) < position(skill), top };
    }),
  ]);
}

test("every non-lane skill has enough positive and negative cases, and every owner exists", () => {
  const expected = NAMES.filter((name) => !LANE_SKILLS.includes(name));
  assert.deepEqual(CASES.map((c) => c.skill).sort(), expected);
  for (const { skill, positive, negative } of CASES) {
    assert.ok(positive.length >= MIN_POSITIVE, `${skill}: ${positive.length} positive`);
    assert.ok(negative.length >= MIN_NEGATIVE, `${skill}: ${negative.length} negative`);
    for (const { owner } of negative) assert.ok(NAMES.includes(owner) && owner !== skill, `${skill}: owner ${owner}`);
  }
});

test("no two skill descriptions are close enough to route the same prompts", (t) => {
  for (const { a, b, score } of similarPairs(MODEL, REPORT_SIMILARITY)) t.diagnostic(`${a} and ${b}: cosine ${score.toFixed(2)}`);
  const tooClose = similarPairs(MODEL, FAIL_SIMILARITY).map(({ a, b, score }) => `${a} and ${b}: ${score.toFixed(2)}`);
  assert.deepEqual(tooClose, []);
});

test("the descriptions route the cases on at least the minimum share", () => {
  const results = outcomes();
  const failed = results.filter((r) => !r.passed);
  const share = (results.length - failed.length) / results.length;
  const listed = failed.map((r) => `${r.skill} ${r.kind}: "${r.prompt}" -> ${r.top.slice(0, 2).map((x) => `${x.name} ${x.score.toFixed(2)}`).join(", ")}`).join("\n");
  assert.ok(share >= MIN_SHARE, `routing share ${share.toFixed(3)} under ${MIN_SHARE}; failing cases:\n${listed}`);
});
