import { test } from "node:test";
import assert from "node:assert/strict";
import { parseArgs, UsageError } from "../../util/args.mts";
import { verb } from "./index.mts";

const ID = "20261023-x";
const parse = (argv: string[]) => verb.parse(parseArgs(argv));

test("comment needs a path and a text that is not blank", () => {
  assert.deepEqual(parse([ID, "--path", "src/a.ts", "--text", "why"]), { id: ID, path: "src/a.ts", text: "why" });
  assert.throws(() => parse([ID, "--path", "src/a.ts", "--text", " "]), UsageError);
  assert.throws(() => parse([ID, "--text", "why"]), UsageError);
});
