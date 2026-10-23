import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { NO_LANE, admit } from "../../dist/lib/verbs/admit/admit.mjs";
import { LANES } from "../../dist/lib/shared/work/state.mjs";

const MIN_SHARE = 0.9;
const MIN_ENTRIES = 100;
const MIN_PER_LANE = 20;
const MIN_NO_LANE = 10;
const SHOWN_REQUEST = 80;

const FIXTURE = resolve("bench", "fixture");
const LABELLED = JSON.parse(readFileSync(resolve("test", "kernel", "admit-labelled.json"), "utf8"));

function isFilled(value) {
  return typeof value === "string" && value.trim() !== "";
}

test("the labelled set holds at least 100 distinct, complete entries, 20 per lane and 10 with no lane", () => {
  assert.ok(LABELLED.length >= MIN_ENTRIES, `${LABELLED.length} entries`);
  for (const entry of LABELLED) {
    assert.ok(isFilled(entry.request) && isFilled(entry.why), JSON.stringify(entry));
    assert.ok([...LANES, NO_LANE].includes(entry.lane), JSON.stringify(entry));
    assert.equal(entry.lane === NO_LANE, isFilled(entry.skill), `a ${NO_LANE} entry and only it names a skill: ${JSON.stringify(entry)}`);
  }
  for (const lane of LANES) {
    const count = LABELLED.filter((entry) => entry.lane === lane).length;
    assert.ok(count >= MIN_PER_LANE, `${lane}: ${count} entries`);
  }
  assert.ok(LABELLED.filter((entry) => entry.lane === NO_LANE).length >= MIN_NO_LANE);
  assert.equal(new Set(LABELLED.map((entry) => entry.request)).size, LABELLED.length, "two entries share a request");
});

function answer(result) {
  return result.lane === NO_LANE ? `${NO_LANE}:${result.skill}` : result.lane;
}

test("admit agrees with the labels on at least the minimum share", () => {
  const misses = LABELLED.map((entry) => ({ entry, got: answer(admit(entry.request, { root: FIXTURE })) })).filter(({ entry, got }) => got !== answer(entry));
  const share = (LABELLED.length - misses.length) / LABELLED.length;
  const listed = misses.map(({ entry, got }) => `${answer(entry)} -> ${got}: ${entry.request.slice(0, SHOWN_REQUEST)}`).join("\n");
  assert.ok(share >= MIN_SHARE, `admit agrees on ${share.toFixed(3)}, under the minimum share ${MIN_SHARE}; misses:\n${listed}`);
});
