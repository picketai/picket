import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs, UsageError } from "../../util/args.mts";
import { readState, writeState } from "../../shared/work/state.mts";
import { appendVerdict } from "../../shared/work/verdict-log.mts";
import { instanceTag } from "../../shared/work/send.mts";
import { verb } from "./index.mts";
import { fixedContext } from "#test/context.mts";
import { openItem, withProject } from "#test/project.mts";

const ID = "20261023-x";
const parse = (argv: string[]) => verb.parse(parseArgs(argv));

test("set reads key=value assignments, an empty value included, and refuses a token without =", () => {
  assert.deepEqual(parse([ID, "status=blocked", "blocked_reason="]), { id: ID, assignments: [{ field: "status", value: "blocked" }, { field: "blocked_reason", value: "" }] });
  assert.throws(() => parse([ID]), UsageError);
  assert.throws(() => parse([ID, "status"]), (err) => err instanceof UsageError && err.message.includes("bad assignment status"));
});

test("status=open on a stalled item continues this session's live developer in its next send", async (t) => {
  const root = withProject(t, { host: true, picket: false });
  const { id } = openItem(root, { lane: "order", title: "Reopened" });
  writeFileSync(join(root, "work", id, "order.md"), "---\nlane: order\n---\n# O\n\n## Phase 1: A\n\nt\n");
  appendVerdict(root, id, { agent: "developer", verdict: "PHASE STALLED", phase: 1, scope: null, through: null, session: "S" }, new Date());
  writeState(root, { ...readState(root, id), status: "blocked", blocked_reason: "PHASE STALLED on phase 1" }, new Date());
  const outcome = await verb.run({ id, assignments: [{ field: "status", value: "open" }] }, fixedContext(root, { session: "S" }));
  assert.ok(outcome.status === "done");
  const next = outcome.value.next as { action: string; send: { tool: string; to: string }[] };
  assert.equal(next.action, "implement_phase");
  assert.deepEqual(next.send.map((s) => `${s.tool} ${s.to}`), [`SendMessage ${instanceTag(id)}-developer`]);
});
