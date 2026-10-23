import { test } from "node:test";
import assert from "node:assert/strict";
import { laneOf } from "./lane.mts";

test("laneOf decides from the signals alone", () => {
  const signals = {
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
    diagnosis: false,
  };
  const r = laneOf(signals, { fast: { max_files: 3 } });
  assert.equal(r.lane, "fast");
  assert.deepEqual(r.reasons, ["small change: no file(s) named, no new surface, no new dependency, no design question"]);
});
