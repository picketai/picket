import { existsSync, readFileSync } from "node:fs";
import { loadConfig, securityPaths } from "../../../shared/config.mjs";
import { hostPath, hostRel } from "../../../shared/paths.mts";
import { nextOf } from "../../../shared/work/next-view.mts";
import { readSnapshot, stateView, type WorkSnapshot } from "../../../shared/work/snapshot.mts";
import { listOpenWork } from "../../../shared/work/state.mts";
import type { HookContext, HookSpec, PayloadOf } from "../../hook-spec.mts";
import { context, type ContextOutput } from "../../output.mts";

const SHOWN_ITEMS = 8;
const GLOSSARY_CHARS = 6000;

function openItemLine(snap: WorkSnapshot, secured: readonly string[]): string {
  const s = stateView(snap);
  const n = nextOf(snap, secured);
  return `- ${s.id} · ${s.lane} · ${s.status}${s.phase_count ? ` · phases ${s.phases_approved}/${s.phase_count}` : ""} · next: ${n.action}${n.actor ? ` by ${n.actor}` : ""}${n.phase ? ` (phase ${n.phase})` : ""}`;
}

function openItemsPart(root: string): string | null {
  const open = listOpenWork(root).map((id) => readSnapshot(root, id));
  if (!open.length) return null;
  const secured = securityPaths(root);
  const lines = open.slice(0, SHOWN_ITEMS).map((snap) => openItemLine(snap, secured));
  const more = open.length > SHOWN_ITEMS ? `\n- and ${open.length - SHOWN_ITEMS} more (picket list)` : "";
  return `# Open work items\n${lines.join("\n")}${more}\nResume with /picket:resuming <id>; never re-derive state from the conversation.`;
}

function sourcesPart(root: string): string | null {
  const { sources } = loadConfig(root);
  if (!sources.length) return null;
  const lines = sources.map((s) => `- ${s.name}: ${s.root ?? `unreachable (${s.reason})`} · read-only; use picket source find|grep and the snapshots`);
  return `# Sources\n${lines.join("\n")}`;
}

function glossaryPart(root: string): string | null {
  const memory = hostPath(root, "MEMORY.md");
  if (!existsSync(memory)) return null;
  const text = readFileSync(memory, "utf8").trim();
  return text ? `# Project glossary and decisions (${hostRel("MEMORY.md")})\n${text.slice(0, GLOSSARY_CHARS)}` : null;
}

function collectParts(root: string): string[] {
  const parts: string[] = [];
  try {
    for (const part of [openItemsPart, sourcesPart, glossaryPart]) {
      const text = part(root);
      if (text) parts.push(text);
    }
  } catch {}
  return parts;
}

export function injectState(_event: PayloadOf<"SessionStart">, { root }: HookContext): ContextOutput | null {
  const parts = collectParts(root);
  return parts.length ? context("SessionStart", parts.join("\n\n")) : null;
}

export const hook: HookSpec<"SessionStart"> = {
  handler: async (event, ctx) => injectState(event, ctx),
  onBadInput: "empty",
};
