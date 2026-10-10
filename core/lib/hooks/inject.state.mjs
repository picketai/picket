import { existsSync, readFileSync } from "node:fs";
import { listOpenWork, deriveState } from "../work.mjs";
import { hostPath, hostRel } from "../paths.mjs";
import { next } from "../next.mjs";
import { loadConfig } from "../config.mjs";

const SHOWN_ITEMS = 8;
const GLOSSARY_CHARS = 6000;

function openItemLine(s, root) {
  const n = next(s.id, root);
  return `- ${s.id} · ${s.lane} · ${s.status}${s.phase_count ? ` · phases ${s.phases_approved}/${s.phase_count}` : ""} · next: ${n.action}${n.actor ? ` by ${n.actor}` : ""}${n.phase ? ` (phase ${n.phase})` : ""}`;
}

function openItemsPart(root) {
  const open = listOpenWork(root).map((id) => deriveState(id, root));
  if (!open.length) return null;
  const lines = open.slice(0, SHOWN_ITEMS).map((s) => openItemLine(s, root));
  const more = open.length > SHOWN_ITEMS ? `\n- and ${open.length - SHOWN_ITEMS} more (picket list)` : "";
  return `# Open work items\n${lines.join("\n")}${more}\nResume with /tether:resuming <id>; never re-derive state from the conversation.`;
}

function sourcesPart(root) {
  const { sources } = loadConfig(root);
  if (!sources.length) return null;
  const lines = sources.map((s) => `- ${s.name}: ${s.root ?? `unreachable (${s.reason})`} · read-only; use picket source find|grep and the snapshots`);
  return `# Sources\n${lines.join("\n")}`;
}

function glossaryPart(root) {
  const memory = hostPath(root, "MEMORY.md");
  if (!existsSync(memory)) return null;
  const text = readFileSync(memory, "utf8").trim();
  return text ? `# Project glossary and decisions (${hostRel("MEMORY.md")})\n${text.slice(0, GLOSSARY_CHARS)}` : null;
}

function collectParts(root) {
  const parts = [];
  try {
    for (const part of [openItemsPart, sourcesPart, glossaryPart]) {
      const text = part(root);
      if (text) parts.push(text);
    }
  } catch {}
  return parts;
}

export function injectState(event, { root }) {
  const parts = collectParts(root);
  return parts.length ? { hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: parts.join("\n\n") } } : null;
}
