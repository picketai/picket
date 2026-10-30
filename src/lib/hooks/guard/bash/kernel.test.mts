import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { classifyKernelCall, isLeadOnly, kernelClass, WRAPPING_FLAGS } from "./kernel.mts";
import { VERB_NAMES } from "../../../verbs.mts";
import { writeLayout } from "../../../shared/repos.mts";
import { openItem, withProject, writeArtifact, writeConfig } from "#test/project.mts";

const WORKTREE = "src/Orders/.worktrees/RMS-12";
const PLAN = "---\nlane: order\nphases:\n  - n: 1\n    files: [src/Orders/pricing.cs, README.md]\n---\n# O\n\n## Phase 1: Both\n\n## Phase 2: No entry\n";
const SAFE_COMMANDS = new Set(["dotnet test", "dotnet build"]);

function worktreeItem(t: TestContext, worktreeTest: string): { root: string; id: string } {
  const root = withProject(t, { host: true });
  const { id } = openItem(root, { lane: "order", title: "Guarded" });
  writeArtifact(root, id, "order.md", PLAN);
  writeLayout(root, id, { worktrees: null, repos: [{ path: "src/Orders", base: null, worktree: WORKTREE }] });
  writeConfig(root, { version: 1, commands: { test: "dotnet test" } });
  writeConfig(join(root, WORKTREE), { version: 1, commands: { test: worktreeTest } });
  return { root, id };
}

function classifyVerify(root: string, ...words: string[]): { verdict: string; seen: string[] } {
  const seen: string[] = [];
  const classifyText = (text: string, cwd: string | null) => {
    seen.push(`${text} @ ${cwd === null ? null : cwd === root ? "<root>" : cwd.slice(root.length + 1).replaceAll("\\", "/")}`);
    return SAFE_COMMANDS.has(text) ? "safe" : "unknown";
  };
  const verdict = classifyKernelCall(["picket", "verify", ...words], { cwd: root, depth: 0, hookRoot: root, platform: process.platform, classifyText });
  return { verdict, seen };
}

const READ_VERBS = ["state", "next", "packet", "list", "summary", "cost", "preflight", "admit", "verify", "name"];
const READ_SUBVERBS: Record<string, string[]> = { source: ["find", "grep"], extension: ["list"] };

test("every flag whose value drive or check executes is a wrapping flag guard.bash inspects", () => {
  for (const flag of ["--only", "--run", "--start"]) assert.ok(WRAPPING_FLAGS.has(flag), flag);
});

test("kernelClass is safe for today's read verbs and subverbs and kernel for every other entry; isLeadOnly holds for comment, reply, uninstall and waive only (T-4.1)", () => {
  const verbs = Object.keys(VERB_NAMES);
  assert.ok(verbs.length > 10, verbs.join(" "));
  for (const [verb, entry] of Object.entries(VERB_NAMES)) {
    if (!("subverbs" in entry)) {
      assert.equal(kernelClass(verb, undefined), READ_VERBS.includes(verb) ? "safe" : "kernel", verb);
      continue;
    }
    assert.equal(kernelClass(verb, undefined), "kernel", `${verb} without a subverb`);
    for (const sub of Object.keys(entry.subverbs)) assert.equal(kernelClass(verb, sub), READ_SUBVERBS[verb]?.includes(sub) ? "safe" : "kernel", `${verb} ${sub}`);
  }
  assert.equal(kernelClass("nosuchverb", undefined), "kernel");
  assert.equal(kernelClass("constructor", undefined), "kernel");
  assert.deepEqual(verbs.filter(isLeadOnly).sort(), ["comment", "reply", "uninstall", "waive"]);
});

test("picket verify is safe only when every checkout's test command is safe in its own folder (T-3.5)", (t) => {
  const unsafe = worktreeItem(t, "node wt.js");
  assert.deepEqual(classifyVerify(unsafe.root, unsafe.id, "1"), { verdict: "unknown", seen: ["dotnet test @ <root>", `node wt.js @ ${WORKTREE}`] });
  assert.equal(classifyVerify(unsafe.root, unsafe.id, "1", "--no-tests").verdict, "safe");
  const safe = worktreeItem(t, "dotnet build");
  assert.deepEqual(classifyVerify(safe.root, safe.id, "1"), { verdict: "safe", seen: ["dotnet test @ <root>", `dotnet build @ ${WORKTREE}`] });
});

test("picket verify of a missing item, a phase with no entry, or no phase classifies unknown (T-3.6)", (t) => {
  const { root, id } = worktreeItem(t, "dotnet build");
  assert.equal(classifyVerify(root, "nosuchitem", "1").verdict, "unknown");
  assert.equal(classifyVerify(root, id, "2").verdict, "unknown");
  assert.equal(classifyVerify(root, id).verdict, "unknown");
  assert.equal(classifyVerify(root, "Not An Id", "1").verdict, "unknown");
});
