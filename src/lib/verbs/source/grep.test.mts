import { test } from "node:test";
import assert from "node:assert/strict";
import { parseArgs, UsageError } from "../../util/args.mts";
import { verb } from "./grep.mts";

const parse = (argv: string[]) => verb.parse(parseArgs(argv));

test("the source subverbs read their positional arguments (T-6.4)", () => {
  assert.deepEqual(parse(["analysis", "rate", "--path", "docs/"]), { name: "analysis", query: "rate", path: "docs/" });
  assert.throws(() => parse(["analysis"]), UsageError);
});
