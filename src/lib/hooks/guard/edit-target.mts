import { existsSync, readFileSync } from "node:fs";
import { repoRelative } from "../../shared/paths.mts";
import type { HookContext, PayloadOf } from "../hook-spec.mts";

export type EditTarget = { filePath: string; abs: string; rel: string; outside: boolean };
export type EditTexts = { before: string; after: string };
export type QuotedEntry = { text: string; label?: string };

type EditEvent = PayloadOf<"PreToolUse">;

const QUOTED_LIMIT = 3;
const QUOTE_WIDTH = 80;

function stringField(input: Record<string, unknown> | undefined, key: string): string {
  const value = input?.[key];
  return typeof value === "string" ? value : "";
}

export function editTarget(event: EditEvent, ctx: HookContext): EditTarget | null {
  const filePath = event.tool_input?.file_path;
  if (!filePath) return null;
  const { abs, rel, outside } = repoRelative(event, filePath, ctx.root);
  return { filePath, abs, rel, outside };
}

function editedFile(current: string, from: string, to: string, all: boolean): EditTexts {
  if (!from || !current.includes(from)) return { before: from, after: to };
  return { before: current, after: all ? current.split(from).join(to) : current.replace(from, () => to) };
}

export function editTexts(event: EditEvent, abs: string): EditTexts {
  const input = event.tool_input;
  const current = existsSync(abs) ? readFileSync(abs, "utf8") : "";
  if (event.tool_name === "Edit") return editedFile(current, stringField(input, "old_string"), stringField(input, "new_string"), Boolean(input?.replace_all));
  return { before: current, after: stringField(input, "content") };
}

export function quotedList(entries: readonly QuotedEntry[]): string {
  const quoted = entries.slice(0, QUOTED_LIMIT).map(({ text, label }) => `${label ? `${label} ` : ""}"${text.slice(0, QUOTE_WIDTH)}"`).join("; ");
  const more = entries.length > QUOTED_LIMIT ? ` (+${entries.length - QUOTED_LIMIT} more)` : "";
  return `${quoted}${more}`;
}
