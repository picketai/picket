import { test } from "node:test";
import assert from "node:assert/strict";
import { parseArgs, UsageError } from "../../util/args.mts";
import { verb } from "./add.mts";

const ID = "20261023-x";
const parse = (argv: string[]) => verb.parse(parseArgs(argv));

test("the source subverbs read their positional arguments (T-6.4)", () => {
  assert.deepEqual(parse([ID, "docs/a.md"]), { id: ID, ref: "docs/a.md" });
  assert.throws(() => parse([ID]), UsageError);
});
