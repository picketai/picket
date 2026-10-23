import { test } from "node:test";
import assert from "node:assert/strict";
import { parseArgs, UsageError } from "../../util/args.mts";
import { verb } from "./find.mts";

const parse = (argv: string[]) => verb.parse(parseArgs(argv));

test("the source subverbs read their positional arguments (T-6.4)", () => {
  assert.deepEqual(parse(["analysis", "pricing"]), { name: "analysis", query: "pricing", path: null });
  assert.throws(() => parse([]), UsageError);
});
