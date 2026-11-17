import type { TestContext } from "node:test";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { hookContext } from "#test/context.mts";
import { looseHandler } from "#test/hook.mts";
import { withProject } from "#test/project.mts";
import { closureTests, loadGuard, silencedLines, skipSeeds, suppressionSeeds, tableRows, thresholdEdits, thresholdSeeds, type SilencedSeed, type ThresholdSeed } from "#test/variants.mts";
import { guardSilenced as silencedHandler } from "./index.mts";

const guardSilenced = looseHandler(silencedHandler);

const projects = new WeakMap<TestContext, string>();

function projectOf(t: TestContext): string {
  const known = projects.get(t);
  if (known !== undefined) return known;
  const root = withProject(t, { host: true, picket: false });
  projects.set(t, root);
  return root;
}

const silenced = await loadGuard(() => import("../../../shared/silenced.mjs"), "src/lib/shared/silenced.mjs");
const comments = await loadGuard(() => import("../../../shared/comments.mjs"), "src/lib/shared/comments.mjs");

async function writeDecision(root: string, path: string, content: string): Promise<string | null> {
  const event = { hook_event_name: "PreToolUse", tool_name: "Write", tool_input: { file_path: path, content }, cwd: root };
  const out = await guardSilenced(event, hookContext(root, { cwd: root }));
  return out?.hookSpecificOutput?.permissionDecision ?? null;
}

async function decided({ rel, line }: SilencedSeed, t: TestContext): Promise<string | null> {
  const root = projectOf(t);
  return writeDecision(root, join(root, ...rel.split("/")), `${line}\n`);
}

async function rewritten({ rel, before, after }: ThresholdSeed, t: TestContext): Promise<string | null> {
  const root = projectOf(t);
  const path = join(root, ...rel.split("/"));
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, before);
  return writeDecision(root, path, after);
}

closureTests({
  guard: "guard.silenced",
  grammar: silencedLines,
  seeds: [],
  rows: [
    { table: tableRows(silenced, "TEST_MOVES"), key: (move: { kind: string }) => move.kind, seedsOf: (move: { kind: string }) => skipSeeds(move.kind) },
    { table: tableRows(comments, "LANGS"), key: (ext: string) => ext, seedsOf: suppressionSeeds },
  ],
  run: decided,
  closed: (decision) => decision === "deny",
});

closureTests({
  guard: "guard.silenced thresholds",
  grammar: thresholdEdits,
  seeds: [],
  rows: [{ table: tableRows(silenced, "THRESHOLDS"), key: (row: { tool: string }) => row.tool, seedsOf: (row: { tool: string }) => thresholdSeeds(row.tool) }],
  run: rewritten,
  closed: (decision) => decision === "deny",
});
