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

test("the packet renders inside a text fence and its value keeps the bare text", () => {
  const value = { lines: ["▶ phase 1/2 done · x", "", "[a] approve"], text: "▶ phase 1/2 done · x\n\n[a] approve", next: {} };
  const rendered = verb.render(value).split("\n");
  assert.equal(rendered[0], "```text");
  assert.equal(rendered.at(-1), "```");
  assert.equal(rendered.slice(1, -1).join("\n"), value.text);
});

test("packet reads --width as a whole number (T-4.4)", () => {
  assert.deepEqual(parse([ID, "--width", "80"]), { id: ID, width: 80 });
  assert.equal(parse([ID]).width, undefined);
  assert.throws(() => parse([ID, "--width", "abc"]), UsageError);
});
