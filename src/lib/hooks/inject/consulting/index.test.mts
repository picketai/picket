import { test } from "node:test";
import assert from "node:assert/strict";
import { consultingHint, DIRECTION_PHRASES, SUGGESTION } from "./index.mts";

const PHRASED = {
  "should we": "should we split the billing service",
  "which approach": "Which approach fits the invoice export best",
  "build or buy": "do we build or buy the tax engine",
  "trade-off between": "what is the trade-off between queues and polling",
  "stress-test": "please stress-test this plan for the importer",
  "question me": "question me on the refund flow",
  "interview me": "interview me about the new pricing model",
  "challenge my thinking": "challenge my thinking on the cache layer",
};

test("each of the eight direction phrasings gets the consulting line", () => {
  assert.deepEqual(Object.keys(PHRASED), DIRECTION_PHRASES);
  for (const prompt of Object.values(PHRASED)) assert.equal(consultingHint(prompt, undefined), SUGGESTION, prompt);
  assert.equal(consultingHint(PHRASED["should we"], "user"), SUGGESTION);
});

test("gate replies, short prompts, prompts naming a skill and non-user sources get nothing", () => {
  for (const prompt of ["a", "r 2", "x should we drop it", "reject: which approach failed", "use picket:ordering, should we add a fee column", "should we?"]) {
    assert.equal(consultingHint(prompt, undefined), null, prompt);
  }
  assert.equal(consultingHint(PHRASED["should we"], "sdk"), null);
});

test("a prompt with none of the phrasings, or one only inside a longer word, gets nothing", () => {
  assert.equal(consultingHint("add a late fee line to overdue invoices", undefined), null);
  assert.equal(consultingHint("the shouldwe flag is unused in the importer", undefined), null);
});
