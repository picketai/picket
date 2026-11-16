import type { TestContext } from "node:test";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { hookContext } from "#test/context.mts";
import { looseHandler } from "#test/hook.mts";
import { withProject } from "#test/project.mts";
import { closureTests, codeComments, commentSeeds, loadGuard, tableRows, type CommentEdit } from "#test/variants.mts";
import { guardComments as commentsHandler } from "./index.mts";

const guardComments = looseHandler(commentsHandler);

const languages = await loadGuard(() => import("../../../shared/comments.mjs"), "src/lib/shared/comments.mjs");

async function decided({ tool, rel, before, input }: CommentEdit, t: TestContext): Promise<string | null> {
  const root = withProject(t, { host: true, picket: false });
  const file = join(root, ...rel.split("/"));
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, before);
  const event = { hook_event_name: "PreToolUse", tool_name: tool, tool_input: { file_path: file, ...input }, cwd: root };
  const out = await guardComments(event, hookContext(root, { cwd: root }));
  return out?.hookSpecificOutput?.permissionDecision ?? null;
}

closureTests({
  guard: "guard.comments",
  grammar: codeComments,
  seeds: [],
  rows: [{ table: tableRows(languages, "LANGS"), key: (ext: string) => ext, seedsOf: commentSeeds }],
  run: decided,
  closed: (decision) => decision === "deny",
});
