import { test } from "node:test";
import assert from "node:assert/strict";
import { parseArgs, UsageError } from "../../util/args.mts";
import { verb } from "./index.mts";

const ID = "20261023-x";
const parse = (argv: string[]) => verb.parse(parseArgs(argv));

test("drive reads its flags with today's value types and refuses a bad timeout, env or bare --run (T-6.4)", () => {
  const input = parse(["--run", "node -e 0", "--env", "A=1", "--hit", "GET /a", "--hit", "GET /b", "--timeout", "30", "--keep-changes", "--work", ID, "--phase", "2"]);
  assert.deepEqual(input, { env: { A: "1" }, run: "node -e 0", start: undefined, hits: [{ method: "GET", path: "/a", body: undefined }, { method: "GET", path: "/b", body: undefined }], port: undefined, wait: undefined, timeoutMs: 30000, keepChanges: true, work: ID, phase: "2" });
  assert.throws(() => parse(["--run", "x", "--timeout", "abc"]), UsageError);
  assert.throws(() => parse(["--run", "x", "--env", "1A=2"]), (err) => err instanceof UsageError && err.message.includes("--env"));
  assert.throws(() => parse(["--run"]), UsageError);
  assert.throws(() => parse(["--hit", " "]), (err) => err instanceof UsageError && err.message.includes("bad --hit"));
});
