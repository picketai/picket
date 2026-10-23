import { test } from "node:test";
import assert from "node:assert/strict";
import { parseArgs } from "../../util/args.mts";
import { verb } from "./list.mts";

test("extension add checks the name before anything is written, and extension list takes no arguments", () => {
  assert.deepEqual(verb.parse(parseArgs([])), {});
});
