import { test } from "node:test";
import assert from "node:assert/strict";
import { parseArgs, UsageError } from "../../util/args.mts";
import { verb } from "./index.mts";

const ID = "20261023-x";
const parse = (argv: string[]) => verb.parse(parseArgs(argv));

test("state, preflight and packet need a valid work item id", () => {
  assert.throws(() => parse([]), UsageError);
  assert.throws(() => parse(["../etc"]), UsageError);
  assert.equal(parse([ID]).id, ID);
});

test("packet reads --width as a whole number (T-4.4)", () => {
  assert.deepEqual(parse([ID, "--width", "80"]), { id: ID, width: 80 });
  assert.equal(parse([ID]).width, undefined);
  assert.throws(() => parse([ID, "--width", "abc"]), UsageError);
});
