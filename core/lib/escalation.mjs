import { createHash } from "node:crypto";
import { appendFileSync, mkdirSync } from "node:fs";
import { stateDir, statePath, STATE_FILES } from "./paths.mjs";

export const MARKER = "PICKET_ESCALATE";
export const ASKING_MODES = new Set(["default", "acceptEdits", "auto"]);

const MAX_REASON_CHARS = 200;
const LOGGED_CHARS = 300;
const ASSIGNMENT = /^[A-Za-z_][A-Za-z0-9_]*=/;
const NON_LITERAL = /[\n\r$`]/;
const LEADING_MARKER = new RegExp(`^\\s*${MARKER}=(?:"(?:[^"\\\\]|\\\\.)*"|'[^']*'|\\\\.|[^\\s"'\\\\])*\\s*`);
const POWERSHELL_ENV_DRIVE = "$env:";
export const POWERSHELL_MARKER_TEXT = `${POWERSHELL_ENV_DRIVE}${MARKER}`;

function anyCase(text) {
  return [...text].map((ch) => (/[a-z]/i.test(ch) ? `[${ch.toLowerCase()}${ch.toUpperCase()}]` : `\\${ch}`)).join("");
}

const POWERSHELL_MARKER_ASSIGNMENT = String.raw`${anyCase(POWERSHELL_ENV_DRIVE)}${MARKER}\s*=\s*(?:'(?:[^']|'')*'|"(?:[^"\x60]|\x60[\s\S]|"")*")`;
export const POWERSHELL_MARKER_STATEMENT = new RegExp(String.raw`^${POWERSHELL_MARKER_ASSIGNMENT}(?=[ \t]*(?:;|\r?\n|$))`);
export const POWERSHELL_FOLDABLE_MARKER = new RegExp(String.raw`^${POWERSHELL_MARKER_ASSIGNMENT}[ \t]*;`);
const POWERSHELL_LEADING_MARKER = new RegExp(String.raw`^\s*${POWERSHELL_MARKER_ASSIGNMENT}[ \t]*;`);

export function leadingAssignments(segment) {
  const firstCommandToken = segment.findIndex((token) => typeof token !== "string" || !ASSIGNMENT.test(token));
  const split = firstCommandToken === -1 ? segment.length : firstCommandToken;
  const assignments = segment.slice(0, split).map((token) => ({ name: token.slice(0, token.indexOf("=")), value: token.slice(token.indexOf("=") + 1) }));
  return { assignments, command: segment.slice(split) };
}

export function carriesMarker(segment) {
  return leadingAssignments(segment).assignments.some(({ name }) => name === MARKER);
}

function reasonProblem(reason, isOpaque) {
  if (!reason) return "the reason is empty";
  if (reason.length > MAX_REASON_CHARS) return `the reason is longer than ${MAX_REASON_CHARS} characters`;
  if (NON_LITERAL.test(reason) || isOpaque(reason)) return "the reason is not a literal (no newline, $ or backtick)";
  return null;
}

export function escalationMarker(segment, { isOpaque = () => false } = {}) {
  const { assignments, command } = leadingAssignments(segment);
  const marker = assignments.find(({ name }) => name === MARKER);
  if (!marker) return null;
  if (assignments.length > 1) return { invalid: "the marker stands beside a second assignment" };
  if (!command.length) return { invalid: "no command follows the marker" };
  const problem = reasonProblem(marker.value, isOpaque);
  return problem ? { invalid: problem } : { reason: marker.value, command };
}

export function withoutMarker(rawCommand) {
  return rawCommand.replace(POWERSHELL_LEADING_MARKER, "").replace(LEADING_MARKER, "").trim();
}

export function commandKey(command) {
  return createHash("sha256").update(withoutMarker(command).replace(/\s+/g, " ")).digest("hex");
}

function isEscalation(row) {
  return row?.event === "escalation";
}

function ranAfter(rows, index) {
  const { session, key } = rows[index];
  return rows.slice(index + 1).some((row) => isEscalation(row) && row.outcome === "ran" && row.session === session && row.key === key);
}

export function notRunAsks(rows) {
  const escalations = rows.filter(isEscalation);
  return escalations.filter((row, index) => row.outcome === "ask" && !ranAfter(escalations, index));
}

export function notRunBefore(rows, session, key) {
  const latestAsk = rows.findLastIndex((row) => isEscalation(row) && row.outcome === "ask" && row.session === session && row.key === key);
  return latestAsk !== -1 && !ranAfter(rows, latestAsk);
}

export function recordEscalation(root, row) {
  const entry = {
    v: 2,
    ts: new Date().toISOString(),
    session: row.session ?? null,
    event: "escalation",
    outcome: row.outcome,
    why: row.why ?? null,
    key: commandKey(row.command),
    command: row.command.slice(0, LOGGED_CHARS),
    reason: row.reason?.slice(0, LOGGED_CHARS) ?? null,
    agent: row.agent ?? null,
    work_id: row.work_id ?? null,
  };
  mkdirSync(stateDir(root), { recursive: true });
  appendFileSync(statePath(root, STATE_FILES.ledger), JSON.stringify(entry) + "\n");
  return entry;
}
