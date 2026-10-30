import { readFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { GLOSSARY_CHARS, glossaryBody } from "../../../shared/glossary.mts";
import { hostRel } from "../../../shared/paths.mts";
import type { HookContext, HookSpec, PayloadOf } from "../../hook-spec.mts";
import { context, type ContextOutput } from "../../output.mts";

const MEMORY = hostRel("MEMORY.md");

function glossaryLength(abs: string): number | null {
  try {
    return glossaryBody(readFileSync(abs, "utf8")).length;
  } catch {
    return null;
  }
}

function count(n: number): string {
  return n.toLocaleString("en-US");
}

export function lintGlossary(event: PayloadOf<"PostToolUse">, { root }: HookContext): ContextOutput | null {
  const filePath = event.tool_input?.file_path;
  if (!filePath) return null;
  const abs = resolve(event.cwd ?? root, filePath);
  if (relative(root, abs).replaceAll("\\", "/") !== MEMORY) return null;
  const length = glossaryLength(abs);
  if (length === null || length <= GLOSSARY_CHARS) return null;
  return context(
    "PostToolUse",
    `lint.glossary: ${MEMORY} is ${count(length)} characters; sessions see only the first ${count(GLOSSARY_CHARS)}. Move the longest decision's detail to an SDR under \`artifacts/strategy/decisions/\` and leave a pointer.`,
  );
}

export const hook: HookSpec<"PostToolUse"> = {
  handler: async (event, ctx) => lintGlossary(event, ctx),
};
