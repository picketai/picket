import { test } from "node:test";
import assert from "node:assert/strict";
import { parseArgs } from "../../util/args.mts";
import { verb } from "./index.mts";

test("list takes no arguments", () => {
  assert.deepEqual(verb.parse(parseArgs([])), {});
});
