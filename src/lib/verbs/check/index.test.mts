import { test } from "node:test";
import assert from "node:assert/strict";
import { parseArgs, UsageError } from "../../util/args.mts";
import { verb } from "./index.mts";

const parse = (argv: string[]) => verb.parse(parseArgs(argv));

test("check reads its steps, a single command and a whole-second timeout (T-6.4)", () => {
  assert.deepEqual(parse(["--steps", "test,build", "--timeout", "60"]), { steps: ["test", "build"], only: undefined, timeoutMs: 60000 });
  assert.deepEqual(parse([]), { steps: undefined, only: undefined, timeoutMs: undefined });
  assert.throws(() => parse(["--timeout", "1.5"]), UsageError);
  assert.throws(() => parse(["--only"]), UsageError);
});
