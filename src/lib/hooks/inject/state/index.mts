import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { loadConfig, securityPaths } from "../../../shared/config.mjs";
import { glossaryBody, injectedGlossary } from "../../../shared/glossary.mts";
import { configPath, hostPath, hostRel, STATE_FILES, stateDir, statePath } from "../../../shared/paths.mts";
import { isNewerVersion, picketVersion } from "../../../shared/picket-version.mts";
import { ACTION_TEXT, isNextAction } from "../../../shared/work/action-text.mts";
import { nextOf } from "../../../shared/work/next-view.mts";
import { readSnapshot, stateView, type WorkSnapshot } from "../../../shared/work/snapshot.mts";
import { listOpenWork } from "../../../shared/work/state.mts";
import type { HookContext, HookSpec, PayloadOf } from "../../hook-spec.mts";
import { context, type ContextOutput } from "../../output.mts";

const SHOWN_ITEMS = 8;

function openItemLine(snap: WorkSnapshot, secured: readonly string[]): string {
  const s = stateView(snap);
  const n = nextOf(snap, secured);
  const next = isNextAction(n.action) ? ACTION_TEXT[n.action](n, "observer") : n.detail;
  return `- ${s.id} · ${s.lane} · ${s.status}${s.phase_count ? ` · phases ${s.phases_approved}/${s.phase_count}` : ""} · next: ${next}`;
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
  const text = glossaryBody(readFileSync(memory, "utf8"));
  return text ? `# Project glossary and decisions (${hostRel("MEMORY.md")})\n${injectedGlossary(text)}` : null;
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

function versionNotice(root: string, running: string): string | null {
  if (!existsSync(configPath(root))) return null;
  const recorded: string | null = loadConfig(root).picket_version;
  if (recorded === null || isNewerVersion(running, recorded)) return `Picket updated to ${running}; run \`picket init\` to refresh this project.`;
  if (isNewerVersion(recorded, running)) return `This project uses Picket ${recorded}; run \`/plugin update picket@picketai\`.`;
  return null;
}

function noticedVersion(root: string): unknown {
  try {
    return JSON.parse(readFileSync(statePath(root, STATE_FILES.updateNotice), "utf8")).version;
  } catch {
    return null;
  }
}

function recordNotice(root: string, running: string): void {
  mkdirSync(stateDir(root), { recursive: true });
  writeFileSync(statePath(root, STATE_FILES.updateNotice), `${JSON.stringify({ version: running })}\n`);
}

function updateNotice(root: string): string | null {
  try {
    const running = picketVersion();
    const notice = versionNotice(root, running);
    if (notice === null || noticedVersion(root) === running) return null;
    recordNotice(root, running);
    return notice;
  } catch {
    return null;
  }
}

export function injectState(_event: PayloadOf<"SessionStart">, { root }: HookContext): ContextOutput | null {
  const notice = updateNotice(root);
  const parts = [...(notice ? [`# Picket update\n${notice}`] : []), ...collectParts(root)];
  return parts.length ? context("SessionStart", parts.join("\n\n"), notice) : null;
}

export const hook: HookSpec<"SessionStart"> = {
  handler: async (event, ctx) => injectState(event, ctx),
  onBadInput: "empty",
};
