import { test } from "node:test";
import assert from "node:assert/strict";
import { parseArgs, UsageError } from "../../util/args.mts";
import { verb } from "./index.mts";

const ID = "20261023-x";
const parse = (argv: string[]) => verb.parse(parseArgs(argv));

test("set reads key=value assignments, an empty value included, and refuses a token without =", () => {
  assert.deepEqual(parse([ID, "status=blocked", "blocked_reason="]), { id: ID, assignments: [{ field: "status", value: "blocked" }, { field: "blocked_reason", value: "" }] });
  assert.throws(() => parse([ID]), UsageError);
  assert.throws(() => parse([ID, "status"]), (err) => err instanceof UsageError && err.message.includes("bad assignment status"));
});
