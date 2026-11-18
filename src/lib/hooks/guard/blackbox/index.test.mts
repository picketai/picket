import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { HOOKS } from "../../../hooks.mts";
import { saveBlock } from "../../../shared/work/block.mts";
import { workId } from "../../../shared/work/files.mts";
import { setMarker } from "../../../shared/work/markers.mts";
import { hookContext } from "#test/context.mts";
import { userEntry, writeTranscript } from "#test/hook.mts";
import { openItem, withProject, writeArtifact } from "#test/project.mts";
import { blackboxDenial } from "./index.mts";

const PLAN_PATH = "src/orders/api.mts";
const DESIGN = `---\nlane: design\nphases:\n  - n: 1\n    files: [${PLAN_PATH}]\n---\n# D\n\n## Phase 1: Orders\n\n**Touch set:**\n- \`${PLAN_PATH}\`: the route\n`;

const FIX_PATH = "src/orders/fix.mts";

type Item = { root: string; id: string; transcript: string };

function saveFixesEntry(root: string, id: string): void {
  setMarker(root, workId(id), 1, "approved", hookContext(root).now());
  saveBlock(root, workId(id), 1, `## Phase 1 of ${id}: Orders\n\nFiles: ${FIX_PATH}\n\nPHASE DONE\n`);
}

function item(t: TestContext, send = (id: string) => `work: ${id}\nphase: 1`): Item {
  const root = withProject(t, { host: true });
  const { id } = openItem(root, { lane: "design", title: "Orders" });
  writeArtifact(root, id, "design.md", DESIGN);
  mkdirSync(join(root, "src", "orders"), { recursive: true });
  writeFileSync(join(root, PLAN_PATH), "x\n");
  mkdirSync(join(root, "docs"), { recursive: true });
  writeFileSync(join(root, "docs", "other.md"), "y\n");
  return { root, id, transcript: writeTranscript(root, [userEntry(send(id))]) };
}

function denial({ root, transcript }: Item, tool: "Read" | "Grep", input: Record<string, string>, agent = "abcd-tester"): string | null {
  const event = { hook_event_name: "PreToolUse" as const, tool_name: tool, tool_input: input, cwd: root, agent_type: agent, transcript_path: transcript };
  return blackboxDenial(event, { ...hookContext(root), name: "guard.blackbox" });
}

test("a tester Read of a plan path or the item's record is denied as the change under test (T-4.1)", (t) => {
  const it = item(t);
  assert.match(denial(it, "Read", { file_path: join(it.root, PLAN_PATH) }) ?? "", /black box/);
  assert.match(denial(it, "Read", { file_path: join(it.root, "work", it.id, "design.md") }) ?? "", /black box/);
  assert.equal(denial(it, "Read", { file_path: join(it.root, PLAN_PATH) }), `guard.blackbox: ${PLAN_PATH} is part of the change under test; the tester is a black box and reads the brief, the request and unchanged files only`);
});

test("a tester Read of its own test folder or an unowned file gets no decision (T-4.1)", (t) => {
  const it = item(t);
  assert.equal(denial(it, "Read", { file_path: join(it.root, "work", it.id, "test", "brief.md") }), null);
  assert.equal(denial(it, "Read", { file_path: join(it.root, "docs", "other.md") }), null);
});

test("a developer Read of the plan path gets no decision (T-4.1)", (t) => {
  const it = item(t);
  assert.equal(denial(it, "Read", { file_path: join(it.root, PLAN_PATH) }, "picket:developer"), null);
});

test("a tester Grep with no path, or on a folder holding an owned path, is denied; on docs/ it is not (T-4.2)", (t) => {
  const it = item(t);
  assert.match(denial(it, "Grep", { pattern: "x" }) ?? "", /black box/);
  assert.match(denial(it, "Grep", { pattern: "x", path: join(it.root, "src") }) ?? "", /black box/);
  assert.match(denial(it, "Grep", { pattern: "x", path: "work" }) ?? "", /black box/);
  assert.equal(denial(it, "Grep", { pattern: "x", path: join(it.root, "docs") }), null);
  assert.equal(denial(it, "Grep", { pattern: "x", path: join(it.root, "work", it.id, "test") }), null);
});

test("guard.blackbox runs on Read and Grep, and not on Glob (T-4.2)", () => {
  const matchers = HOOKS["guard.blackbox"].on.map((on) => on.matcher);
  assert.deepEqual(matchers, ["Read|Grep"]);
  assert.ok(!new RegExp(`^(?:${matchers[0]})$`).test("Glob"));
});

test("a tester whose send names no work item is denied every read (T-4.3)", (t) => {
  const it = item(t, () => "check the orders service");
  assert.equal(denial(it, "Read", { file_path: join(it.root, "README.md") }), "guard.blackbox: the tester's send names no work item, so every read is refused");
});

test("a tester Read of a file a fix after approval names is denied once the fixes entry is saved", (t) => {
  const it = item(t);
  const fixed = join(it.root, ...FIX_PATH.split("/"));
  writeFileSync(fixed, "z\n");
  assert.equal(denial(it, "Read", { file_path: fixed }), null);
  saveFixesEntry(it.root, it.id);
  assert.match(denial(it, "Read", { file_path: fixed }) ?? "", /black box/);
});

test("a tester whose send names an item that cannot be read is denied every read", (t) => {
  const it = item(t, () => "work: 20991231-no-such-item");
  assert.match(denial(it, "Read", { file_path: join(it.root, "docs", "other.md") }) ?? "", /cannot be read/);
});
