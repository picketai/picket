import { test } from "node:test";
import assert from "node:assert/strict";
import { parseArgs, UsageError } from "../../util/args.mts";
import { verb } from "./add.mts";

const parse = (argv: string[]) => verb.parse(parseArgs(argv));

test("extension add checks the name before anything is written, and extension list takes no arguments", () => {
  assert.deepEqual(parse(["local"]), { name: "local" });
  for (const name of ["Local", "../x"]) assert.throws(() => parse([name]), (err) => err instanceof UsageError && /must match/.test(err.message), name);
  assert.throws(() => parse([]), UsageError);
});
