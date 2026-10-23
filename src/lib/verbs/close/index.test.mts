import { test } from "node:test";
import assert from "node:assert/strict";
import { parseArgs, UsageError } from "../../util/args.mts";
import { verb } from "./index.mts";

const ID = "20261023-x";
const parse = (argv: string[]) => verb.parse(parseArgs(argv));

test("close reads the message and the touched paths", () => {
  assert.deepEqual(parse([ID, "--message", "chore: done", "--touched", "a.ts,b.ts"]), { id: ID, message: "chore: done", touched: ["a.ts", "b.ts"] });
  assert.deepEqual(parse([ID]), { id: ID, message: undefined, touched: [] });
  assert.throws(() => parse([]), UsageError);
});
