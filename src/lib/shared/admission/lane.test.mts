import { test } from "node:test";
import assert from "node:assert/strict";
import { laneOf, PENDING } from "./lane.mts";

const SMALL_CHANGE = {
  forced: null,
  mentioned_paths: [],
  touched: 0,
  declared_research: false,
  research: false,
  security: false,
  security_path_hits: [],
  migration: false,
  irreversible: false,
  new_dependency: false,
  cross_context: false,
  new_surface: false,
  design_question: false,
  small_change: true,
  numbered_items: 0,
  diagnosis: false,
};
const CAPS = { fast: { max_files: 3 } };

test("a small change with no touch set answers pending and asks for the touched files", () => {
  assert.deepEqual(laneOf(SMALL_CHANGE, CAPS), {
    lane: PENDING,
    reasons: [
      "small change: no file(s) named, no new surface, no new dependency, no design question",
      "fast needs a touch set: find the files the change edits and re-run picket admit --request <file> --touched <paths>",
    ],
    signals: SMALL_CHANGE,
  });
});

test("a small change with one touched file answers fast", () => {
  const signals = { ...SMALL_CHANGE, touched: 1 };
  assert.deepEqual(laneOf(signals, CAPS), {
    lane: "fast",
    reasons: ["small change: 1 file(s) named, no new surface, no new dependency, no design question"],
    signals,
  });
});
