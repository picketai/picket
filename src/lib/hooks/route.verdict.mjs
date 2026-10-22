import { mkdirSync, writeFileSync } from "node:fs";
import { readTurn, latestHints, blockLines, agentTranscript } from "../shared/transcript/transcript.mjs";
import { route } from "../route.mjs";
import { findVerdict } from "../shared/verdicts.mjs";
import { stateDir, statePath, stateRel } from "../shared/paths.mjs";
import { saveBlock } from "../packet.mjs";

const HEADINGS = [
  [/^##\s+Phase\s+(\d+)\s+of\s+([a-z0-9-]+)/m, (m) => ({ agent: "developer", phase: Number(m[1]), id: m[2] })],
  [/^##\s+Review:\s+([a-z0-9-]+)\s*·\s*(crosscheck|phase\s+(\d+)|cumulative|checkpoint|pr)/m, (m) => ({ agent: "reviewer", id: m[1], scope: m[2].startsWith("phase") ? "phase" : m[2], phase: m[3] ? Number(m[3]) : null })],
  [/^##\s+(Order|Design|Amendment):\s+([a-z0-9-]+)/m, (m) => ({ agent: "architect", id: m[2] })],
  [/^##\s+Report:\s+([a-z0-9-]+)/m, (m) => ({ agent: "analyst", id: m[1] })],
];

function blockHeading(text) {
  for (const [re, fn] of HEADINGS) {
    const m = text.match(re);
    if (m) return fn(m);
  }
  return null;
}

function keepPullRequestReview(id, verdict, text, root) {
  const name = `${id}.review.md`;
  mkdirSync(stateDir(root), { recursive: true });
  writeFileSync(statePath(root, name), text.trim() + "\n");
  return `picket: ${verdict} recorded for ${id}; block saved to ${stateRel(name)}. Print it verbatim, then offer [p] post to the PR · [d] done.`;
}

const DEVELOPER_VERDICTS = ["PHASE DONE", "PHASE STALLED"];
const CLASS_ID = /^[A-Z][A-Za-z]*\d+$/;

export function reviewClasses(text) {
  const value = text.match(/^Classes:\s*(.*)$/m)?.[1]?.trim() ?? "";
  if (/^none$/i.test(value)) return [];
  return [...new Set(value.split(/[\s,]+/).filter((id) => CLASS_ID.test(id)))];
}

function unsavedBlockNote(info, verdict) {
  if (info || !DEVELOPER_VERDICTS.includes(verdict)) return "";
  return "\nBlock not saved: it has no `## Phase <n> of <id>: <title>` heading, so the gate packet shows \"not reported\". Re-emit the block in the developer contract shape.";
}

function saveDeveloperBlock(info, id, phase, text, root) {
  if (info?.agent !== "developer" || phase == null) return;
  try {
    saveBlock(id, phase, text, root);
  } catch {}
}

function applyVerdict({ event, info, hints, id, verdict, text, root }) {
  const scope = info?.scope === "phase" ? undefined : (info?.scope ?? (hints.scope && !hints.scope.startsWith("phase") ? hints.scope : undefined));
  const phase = info?.phase ?? hints.phase ?? undefined;
  const agent = info?.agent ?? (["approved", "rejected"].includes(verdict) ? "user" : event.agent_type ?? "lead");
  const amend = text.match(/^AMENDMENT NEEDED:.*$/m)?.[0] ?? null;
  const unsaved = unsavedBlockNote(info, verdict);
  saveDeveloperBlock(info, id, phase, text, root);
  const classes = info?.agent === "reviewer" ? reviewClasses(text) : [];
  const routed = route({ id, verdict, agent, phase, scope, root, reason: amend ?? undefined, session: event.session_id, classes });
  const next = routed.next;
  return `picket: ${verdict} applied to ${id}${phase ? ` phase ${phase}` : ""} (${routed.applied.join(", ") || "recorded"}). Next: ${next.action}${next.actor ? ` by ${next.actor}` : ""}${next.phase ? ` · phase ${next.phase}` : ""}. ${next.detail}${next.options?.length ? ` Options: ${next.options.join(" · ")}` : ""}${amend ? `\n${amend}` : ""}${unsaved}`;
}

function routeTurn(event, root) {
  const { text } = readTurn(event, { includeToolPayloads: true });
  const verdict = findVerdict(blockLines(text).last);
  if (!verdict) return null;
  const info = blockHeading(text);
  const hints = latestHints(agentTranscript(event));
  const id = info?.id ?? hints.work_id;
  if (info?.scope === "pr") return keepPullRequestReview(id, verdict, text, root);
  return id ? applyVerdict({ event, info, hints, id, verdict, text, root }) : null;
}

function outcome(event, root) {
  try {
    return routeTurn(event, root);
  } catch (err) {
    return `picket: verdict not applied (${err.message}). Run \`picket next <id>\` yourself.`;
  }
}

export function routeVerdict(event, { root }) {
  if (event.stop_hook_active) return null;
  const out = outcome(event, root);
  return out ? { hookSpecificOutput: { hookEventName: event.hook_event_name, additionalContext: out } } : null;
}
