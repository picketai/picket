import { test } from "node:test";
import assert from "node:assert/strict";
import { parseArgs, UsageError } from "../../dist/lib/util/args.mjs";
import { verb as admit } from "../../dist/lib/verbs/admit/index.mjs";
import { verb as cost } from "../../dist/lib/verbs/cost/index.mjs";
import { verb as list } from "../../dist/lib/verbs/list/index.mjs";
import { verb as next } from "../../dist/lib/verbs/next/index.mjs";
import { verb as packet } from "../../dist/lib/verbs/packet/index.mjs";
import { verb as preflight } from "../../dist/lib/verbs/preflight/index.mjs";
import { verb as state } from "../../dist/lib/verbs/state/index.mjs";
import { verb as verify } from "../../dist/lib/verbs/verify/index.mjs";
import { verb as close } from "../../dist/lib/verbs/close/index.mjs";
import { verb as comment } from "../../dist/lib/verbs/comment/index.mjs";
import { verb as init } from "../../dist/lib/verbs/init/index.mjs";
import { verb as migrate } from "../../dist/lib/verbs/migrate/index.mjs";
import { verb as route } from "../../dist/lib/verbs/route/index.mjs";
import { verb as set } from "../../dist/lib/verbs/set/index.mjs";
import { verb as waive } from "../../dist/lib/verbs/waive/index.mjs";

const ID = "20261023-x";

const parse = (spec, argv, stdin) => spec.parse(parseArgs(argv, stdin));

test("state, preflight and packet need a valid work item id", () => {
  for (const spec of [state, preflight, packet]) {
    assert.throws(() => parse(spec, []), UsageError);
    assert.throws(() => parse(spec, ["../etc"]), UsageError);
    assert.equal(parse(spec, [ID]).id, ID);
  }
});

test("list takes no arguments", () => {
  assert.deepEqual(parse(list, []), {});
});

test("next reads an id, or --latest with an optional session, and nothing else (T-4.4)", () => {
  assert.deepEqual(parse(next, [ID]), { id: ID });
  assert.deepEqual(parse(next, ["--latest"]), { latest: true, session: undefined });
  assert.deepEqual(parse(next, ["--latest", "--session", "s-1"]), { latest: true, session: "s-1" });
  assert.throws(() => parse(next, []), UsageError);
});

test("cost reads --session and --work, and a bare --session is a usage error (T-4.2)", () => {
  assert.deepEqual(parse(cost, []), { session: undefined, workId: undefined });
  assert.deepEqual(parse(cost, ["--session", "s-1", "--work", ID]), { session: "s-1", workId: ID });
  assert.throws(() => parse(cost, ["--session"]), (err) => err instanceof UsageError && err.message.includes("--session"));
});

test("admit takes the text, a file, or standard input for -, and splits --touched", () => {
  assert.deepEqual(parse(admit, ["--text", "fix a typo", "--touched", "a.ts, b.ts"]), { text: "fix a typo", file: null, touched: ["a.ts", "b.ts"] });
  assert.deepEqual(parse(admit, ["--request", "req.md"]), { text: null, file: "req.md", touched: [] });
  assert.deepEqual(parse(admit, ["--request", "-"], () => "from stdin"), { text: "from stdin", file: null, touched: [] });
  assert.deepEqual(parse(admit, []), { text: "", file: null, touched: [] });
  assert.throws(() => parse(admit, ["--text"]), UsageError);
});

test("verify needs an id and a whole phase number (T-4.4)", () => {
  assert.deepEqual(parse(verify, [ID, "2"]), { id: ID, phase: 2, runTests: true });
  assert.equal(parse(verify, [ID, "2", "--no-tests"]).runTests, false);
  assert.throws(() => parse(verify, [ID]), UsageError);
  assert.throws(() => parse(verify, [ID, "x"]), UsageError);
});

test("packet reads --width as a whole number (T-4.4)", () => {
  assert.deepEqual(parse(packet, [ID, "--width", "80"]), { id: ID, width: 80 });
  assert.equal(parse(packet, [ID]).width, undefined);
  assert.throws(() => parse(packet, [ID, "--width", "abc"]), UsageError);
});

test("set reads key=value assignments, an empty value included, and refuses a token without =", () => {
  assert.deepEqual(parse(set, [ID, "status=blocked", "blocked_reason="]), { id: ID, assignments: [{ field: "status", value: "blocked" }, { field: "blocked_reason", value: "" }] });
  assert.throws(() => parse(set, [ID]), UsageError);
  assert.throws(() => parse(set, [ID, "status"]), (err) => err instanceof UsageError && err.message.includes("bad assignment status"));
});

test("close reads the message and the touched paths", () => {
  assert.deepEqual(parse(close, [ID, "--message", "chore: done", "--touched", "a.ts,b.ts"]), { id: ID, message: "chore: done", touched: ["a.ts", "b.ts"] });
  assert.deepEqual(parse(close, [ID]), { id: ID, message: undefined, touched: [] });
  assert.throws(() => parse(close, []), UsageError);
});

test("comment needs a path and a text that is not blank", () => {
  assert.deepEqual(parse(comment, [ID, "--path", "src/a.ts", "--text", "why"]), { id: ID, path: "src/a.ts", text: "why" });
  assert.throws(() => parse(comment, [ID, "--path", "src/a.ts", "--text", " "]), UsageError);
  assert.throws(() => parse(comment, [ID, "--text", "why"]), UsageError);
});

test("waive takes exactly one of --text and --deleted (T-5.4)", () => {
  assert.deepEqual(parse(waive, [ID, "--path", "a.test.ts", "--text", "it.skip("]), { id: ID, path: "a.test.ts", text: "it.skip(", deleted: false });
  assert.deepEqual(parse(waive, [ID, "--path", "a.test.ts", "--deleted"]), { id: ID, path: "a.test.ts", text: null, deleted: true });
  assert.throws(() => parse(waive, [ID, "--path", "a.test.ts", "--text", "x", "--deleted"]), UsageError);
  assert.throws(() => parse(waive, [ID, "--path", "a.test.ts"]), UsageError);
});

test("route needs a verdict and an agent and reads its numbers as whole numbers (T-5.4)", () => {
  const input = parse(route, [ID, "--verdict", "approved", "--agent", "user", "--phase", "2", "--through", "4"]);
  assert.deepEqual(input, { id: ID, verdict: "approved", agent: "user", phase: 2, scope: undefined, through: 4, reason: undefined, session: undefined });
  assert.throws(() => parse(route, [ID, "--verdict", "approved", "--agent", "user", "--phase", "x"]), UsageError);
  assert.throws(() => parse(route, [ID, "--verdict", "approved"]), (err) => err instanceof UsageError && err.message.includes("--agent"));
});

test("migrate reads --dry-run and init reads --root and --no-install", () => {
  assert.deepEqual(parse(migrate, ["--dry-run"]), { dryRun: true });
  assert.deepEqual(parse(migrate, []), { dryRun: false });
  assert.deepEqual(parse(init, ["--root", "/p", "--no-install"]), { root: "/p", install: false });
  assert.deepEqual(parse(init, []), { root: null, install: true });
});
