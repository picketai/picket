import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs, UsageError } from "../../util/args.mts";
import { setMarker } from "../../shared/work/markers.mts";
import { appendVerdict } from "../../shared/work/verdict-log.mts";
import { verb } from "./index.mts";
import { packet, WIDTH } from "./packet.mjs";
import { openItem, withProject } from "#test/project.mts";
import { appendDataRun } from "../../shared/data/runs.mts";
import type { TestContext } from "node:test";

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

const LONG_AMEND = "AMENDMENT NEEDED: T-2.7 the criterion names src/lib/shared/work/old-name.mts, but the phase changed src/lib/shared/work/new-name.mts and its test";

test("the amendment gate prints the whole detail, wrapped to the width, with the amend line and the review path uncut (T-2.8)", (t) => {
  const root = withProject(t, { host: true, picket: false });
  const { id } = openItem(root, { lane: "order", title: "Gated" });
  writeFileSync(join(root, "work", id, "order.md"), "---\nlane: order\n---\n# O\n\n## Phase 1: A\n\nt\n\n## Phase 2: B\n\nt\n");
  for (const n of [1, 2]) {
    setMarker(root, id, n, "done", new Date());
    setMarker(root, id, n, "approved", new Date());
  }
  appendVerdict(root, id, { agent: "reviewer", verdict: "CHANGES REQUIRED", phase: 2, scope: "cumulative", through: null, amend: LONG_AMEND, plan_only: true }, new Date("2026-10-29T10:00:00.000Z"));
  const { lines, text } = packet(id, root);
  assert.equal(lines[0], `▶ approve amendment by user · ${id}`);
  const detail = lines.slice(1, lines.indexOf("")).map((line) => line.trim()).join(" ");
  assert.equal(detail, `the cumulative review found only plan wording: ${LONG_AMEND}; review: work/${id}/reviews/cumulative.md`);
  assert.equal(text.includes("…"), false);
  assert.ok(lines.every((line) => line.length <= WIDTH), text);
  assert.equal(lines.at(-1), "[a] amend order.md, approved phases included   [f] fix the code instead");
});

function phaseGate(t: TestContext): { root: string; id: string } {
  const root = withProject(t, { host: true, picket: false });
  const { id } = openItem(root, { lane: "order", title: "Seeded" });
  writeFileSync(join(root, "work", id, "order.md"), "---\nlane: order\n---\n# O\n\n## Phase 1: A\n\nt\n\n## Phase 2: B\n\nt\n");
  setMarker(root, id, 1, "done", new Date());
  return { root, id };
}

const RUN = { path: "data/customer.sql", sha256: "a".repeat(64), entry: "customer" };

test("the phase gate lists every SQL run of the item under data, one per line, old rows included (T-5.1, T-5.4)", (t) => {
  const { root, id } = phaseGate(t);
  appendDataRun(root, { ...RUN, at: "2026-11-18T10:00:00.000Z", item: id, server: "sql01", database: "orders_test", status: 0, confirmation: "c-1", approved_at: "2026-11-18T09:00:00.000Z" });
  appendDataRun(root, { ...RUN, at: "2026-11-18T10:05:00.000Z", item: "20261118-other", server: "sql09", database: "other", status: 0 });
  appendDataRun(root, { ...RUN, at: "2026-11-18T11:00:00.000Z", item: id, server: "sql02", database: "orders_test", status: 1 });
  const { lines } = packet(id, root);
  const at = lines.findIndex((line) => /^\s*data\s/.test(line));
  assert.ok(at > 0, lines.join("\n"));
  assert.match(lines[at], /^\s*data\s+customer on server sql01, database orders_test, exit 0$/);
  assert.match(lines[at + 1], /^\s+customer on server sql02, database orders_test, exit 1$/);
  assert.ok(!lines.some((line) => line.includes("sql09")), lines.join("\n"));
});

test("the phase gate of an item with no SQL run has no data field", (t) => {
  const { root, id } = phaseGate(t);
  const { lines } = packet(id, root);
  assert.equal(lines[0], `▶ phase 1/2 done · ${id}`);
  assert.ok(!lines.some((line) => /^\s*data\s/.test(line)), lines.join("\n"));
});
