import { test } from "node:test";
import assert from "node:assert/strict";
import { flag, int, list, many, need, pairs, parseArgs, seconds, str, UsageError } from "../../dist/lib/util/args.mjs";

const args = (...argv) => parseArgs(argv);

function throwsNaming(fn, flagName) {
  assert.throws(fn, (err) => err instanceof UsageError && err.message.includes(flagName));
}

test("parseArgs splits positionals from flags, a flag takes the next token unless it starts with --, and a repeat collects", () => {
  const parsed = args("next", "x", "--pretty", "--hit", "/a", "--hit", "/b");
  assert.deepEqual(parsed.pos, ["next", "x"]);
  assert.deepEqual(parsed.opt, { pretty: true, hit: ["/a", "/b"] });
});

test("stdin is read only when a verb calls it", () => {
  let reads = 0;
  const parsed = parseArgs(["x"], () => {
    reads++;
    return "text";
  });
  assert.equal(reads, 0);
  assert.equal(parsed.stdin(), "text");
  assert.equal(reads, 1);
});

test("str gives the value or undefined and throws on a bare or repeated flag (T-1.4)", () => {
  assert.equal(str(args("--session", "s1"), "session"), "s1");
  assert.equal(str(args(), "session"), undefined);
  throwsNaming(() => str(args("--session"), "session"), "--session");
  throwsNaming(() => str(args("--session", "a", "--session", "b"), "session"), "--session");
});

test("need throws naming the flag when it is absent", () => {
  assert.equal(need(args("--lane", "fast"), "lane"), "fast");
  throwsNaming(() => need(args(), "lane"), "--lane");
});

test("list splits on commas, trims and drops empty items (T-1.4)", () => {
  assert.deepEqual(list(args("--touched", "a, b,,c"), "touched"), ["a", "b", "c"]);
  assert.deepEqual(list(args(), "touched"), []);
});

test("many gives every occurrence (T-1.4)", () => {
  assert.deepEqual(many(args("--hit", "GET /a", "--hit", "GET /b"), "hit"), ["GET /a", "GET /b"]);
  assert.deepEqual(many(args(), "hit"), []);
  throwsNaming(() => many(args("--hit"), "hit"), "--hit");
});

test("int and seconds read whole numbers, seconds in milliseconds (T-1.4)", () => {
  assert.equal(int(args("--width", "80"), "width"), 80);
  assert.equal(seconds(args("--timeout", "30"), "timeout"), 30000);
  assert.equal(seconds(args(), "timeout"), undefined);
  throwsNaming(() => seconds(args("--timeout", "abc"), "timeout"), "--timeout");
  throwsNaming(() => int(args("--width", "1.5"), "width"), "--width");
});

test("flag is true when present without a value and throws when given one (T-1.4)", () => {
  assert.equal(flag(args("--yes"), "yes"), true);
  assert.equal(flag(args(), "yes"), false);
  throwsNaming(() => flag(args("--yes", "x"), "yes"), "--yes");
});

test("pairs reads NAME=VALUE flags and refuses a name that is not an identifier (T-1.4)", () => {
  assert.deepEqual(pairs(args("--env", "A=1", "--env", "B=2"), "env"), { A: "1", B: "2" });
  assert.deepEqual(pairs(args("--env", "URL=a=b"), "env"), { URL: "a=b" });
  assert.deepEqual(pairs(args(), "env"), {});
  for (const bad of [["--env", "1A=2"], ["--env", "=x"], ["--env", "NOEQUALS"], ["--env"]]) throwsNaming(() => pairs(args(...bad), "env"), "--env");
});
