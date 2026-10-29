import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs, UsageError } from "../../util/args.mts";
import { workId } from "../../shared/work/files.mts";
import type { NextView } from "../../shared/work/next-view.mts";
import { verb } from "./index.mts";
import { fixedContext } from "#test/context.mts";
import { openItem, withProject } from "#test/project.mts";

const ID = "20261023-x";
const parse = (argv: string[]) => verb.parse(parseArgs(argv));

test("next prints its JSON with send, and the human form shows each send's tool, first commands and a text fence", async (t) => {
  const root = withProject(t, { host: true, picket: false });
  const { id } = openItem(root, { lane: "design", title: "Rendered" });
  writeFileSync(join(root, "work", id, "design.md"), "---\nlane: design\n---\n# D\n\n## Phase 1: A\n\nt\n");
  const outcome = await verb.run({ id: workId(id) }, fixedContext(root, { session: "S" }));
  assert.ok(outcome.status === "done");
  const view = outcome.value;
  assert.ok("send" in view);
  assert.deepEqual(view.send.map((s) => `${s.tool} ${s.to}`), ["Agent developer", "Agent reviewer"]);
  const human = verb.render(view);
  assert.equal(human.match(/^```text$/gm)?.length, 2, human);
  assert.match(human, /^Agent developer · picket:developer\n```text\nwork: .*\nphase: 1\nartifact: work\/.*\/design\.md\n```$/m);
});

test("the human form names a model and lists each first command", () => {
  const view: NextView = {
    id: workId("20261023-x"),
    lane: "order",
    status: "open",
    phase: 2,
    options: [],
    own_gate: null,
    action: "review_cumulative",
    actor: "reviewer",
    detail: "d",
    send: [{ tool: "Agent", to: "cumulative-reviewer", type: "picket:reviewer", model: "opus", first: ["picket mutate 20261023-x", "picket summary 20261023-x --save"], message: "work: 20261023-x" }],
  };
  assert.equal(
    verb.render(view),
    "review_cumulative · reviewer · phase 2 · d\n\nAgent cumulative-reviewer · picket:reviewer · model opus\nfirst: picket mutate 20261023-x\nfirst: picket summary 20261023-x --save\n```text\nwork: 20261023-x\n```",
  );
});

test("next reads an id, or --latest with an optional session, and nothing else (T-4.4)", () => {
  assert.deepEqual(parse([ID]), { id: ID });
  assert.deepEqual(parse(["--latest"]), { latest: true, session: undefined });
  assert.deepEqual(parse(["--latest", "--session", "s-1"]), { latest: true, session: "s-1" });
  assert.throws(() => parse([]), UsageError);
});
