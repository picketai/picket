import type { TestContext } from "node:test";
import { join } from "node:path";
import { hookContext } from "#test/context.mts";
import { looseHandler } from "#test/hook.mts";
import { withProject } from "#test/project.mts";
import { closureTests, loadGuard, silencedLines, skipSeeds, tableRows, type SilencedSeed } from "#test/variants.mts";
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

async function decided({ rel, line }: SilencedSeed, t: TestContext): Promise<string | null> {
  const root = projectOf(t);
  const event = { hook_event_name: "PreToolUse", tool_name: "Write", tool_input: { file_path: join(root, ...rel.split("/")), content: `${line}\n` }, cwd: root };
  const out = await guardSilenced(event, hookContext(root, { cwd: root }));
  return out?.hookSpecificOutput?.permissionDecision ?? null;
}

closureTests({
  guard: "guard.silenced",
  grammar: silencedLines,
  seeds: [],
  rows: [{ table: tableRows(silenced, "TEST_MOVES"), key: (move: { kind: string }) => move.kind, seedsOf: (move: { kind: string }) => skipSeeds(move.kind) }],
  run: decided,
  closed: (decision) => decision === "deny",
});
