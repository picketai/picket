import { test } from "node:test";
import assert from "node:assert/strict";
import { parseArgs, UsageError } from "../../util/args.mts";
import { verb } from "./index.mts";

const ID = "20261023-x";
const parse = (argv: string[]) => verb.parse(parseArgs(argv));

test("waive takes exactly one of --text and --deleted (T-5.4)", () => {
  assert.deepEqual(parse([ID, "--path", "a.test.ts", "--text", "it.skip("]), { id: ID, path: "a.test.ts", text: "it.skip(", deleted: false });
  assert.deepEqual(parse([ID, "--path", "a.test.ts", "--deleted"]), { id: ID, path: "a.test.ts", text: null, deleted: true });
  assert.throws(() => parse([ID, "--path", "a.test.ts", "--text", "x", "--deleted"]), UsageError);
  assert.throws(() => parse([ID, "--path", "a.test.ts"]), UsageError);
});
