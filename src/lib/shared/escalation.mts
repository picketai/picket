import { createHash } from "node:crypto";
import { appendLedger, type EscalationRow, type LedgerRow } from "./ledger.mts";

export const MARKER = "PICKET_ESCALATE";
export const ASKING_MODES = new Set(["default", "acceptEdits", "auto"]);

const MAX_REASON_CHARS = 200;
const LOGGED_CHARS = 300;
const ASSIGNMENT = /^[A-Za-z_][A-Za-z0-9_]*=/;
const NON_LITERAL = /[\n\r$`]/;
const LEADING_MARKER = new RegExp(`^\\s*${MARKER}=(?:"(?:[^"\\\\]|\\\\.)*"|'[^']*'|\\\\.|[^\\s"'\\\\])*\\s*`);
const POWERSHELL_ENV_DRIVE = "$env:";
export const POWERSHELL_MARKER_TEXT = `${POWERSHELL_ENV_DRIVE}${MARKER}`;

function anyCase(text: string): string {
  return [...text].map((ch) => (/[a-z]/i.test(ch) ? `[${ch.toLowerCase()}${ch.toUpperCase()}]` : `\\${ch}`)).join("");
}

const POWERSHELL_MARKER_ASSIGNMENT = String.raw`${anyCase(POWERSHELL_ENV_DRIVE)}${MARKER}\s*=\s*(?:'(?:[^']|'')*'|"(?:[^"\x60]|\x60[\s\S]|"")*")`;
export const POWERSHELL_MARKER_STATEMENT = new RegExp(String.raw`^${POWERSHELL_MARKER_ASSIGNMENT}(?=[ \t]*(?:;|\r?\n|$))`);
export const POWERSHELL_FOLDABLE_MARKER = new RegExp(String.raw`^${POWERSHELL_MARKER_ASSIGNMENT}[ \t]*;`);
const POWERSHELL_LEADING_MARKER = new RegExp(String.raw`^\s*${POWERSHELL_MARKER_ASSIGNMENT}[ \t]*;`);

export type ShellToken = string | object;
export type Assignment = { name: string; value: string };
export type EscalationMarker = { invalid: string } | { reason: string; command: ShellToken[] };
export type EscalationInput = {
  session?: string | null;
  outcome: EscalationRow["outcome"];
  why?: string | null;
  command: string;
  reason?: string | null;
  agent?: string | null;
  work_id?: string | null;
};

export function leadingAssignments(segment: ShellToken[]): { assignments: Assignment[]; command: ShellToken[] } {
  const firstCommandToken = segment.findIndex((token) => typeof token !== "string" || !ASSIGNMENT.test(token));
  const split = firstCommandToken === -1 ? segment.length : firstCommandToken;
  const assignments = (segment.slice(0, split) as string[]).map((token) => ({ name: token.slice(0, token.indexOf("=")), value: token.slice(token.indexOf("=") + 1) }));
  return { assignments, command: segment.slice(split) };
}

export function carriesMarker(segment: ShellToken[]): boolean {
  return leadingAssignments(segment).assignments.some(({ name }) => name === MARKER);
}

function reasonProblem(reason: string, isOpaque: (reason: string) => boolean): string | null {
  if (!reason) return "the reason is empty";
  if (reason.length > MAX_REASON_CHARS) return `the reason is longer than ${MAX_REASON_CHARS} characters`;
  if (NON_LITERAL.test(reason) || isOpaque(reason)) return "the reason is not a literal (no newline, $ or backtick)";
  return null;
}

export function escalationMarker(segment: ShellToken[], { isOpaque = () => false }: { isOpaque?: (reason: string) => boolean } = {}): EscalationMarker | null {
  const { assignments, command } = leadingAssignments(segment);
  const marker = assignments.find(({ name }) => name === MARKER);
  if (!marker) return null;
  if (assignments.length > 1) return { invalid: "the marker stands beside a second assignment" };
  if (!command.length) return { invalid: "no command follows the marker" };
  const problem = reasonProblem(marker.value, isOpaque);
  return problem ? { invalid: problem } : { reason: marker.value, command };
}

export function withoutMarker(rawCommand: string): string {
  return rawCommand.replace(POWERSHELL_LEADING_MARKER, "").replace(LEADING_MARKER, "").trim();
}

export function commandKey(command: string): string {
  return createHash("sha256").update(withoutMarker(command).replace(/\s+/g, " ")).digest("hex");
}

function isEscalation(row: LedgerRow | null | undefined): row is EscalationRow {
  return row?.event === "escalation";
}

function ranAfter(rows: LedgerRow[], index: number, { session, key }: EscalationRow): boolean {
  return rows.slice(index + 1).some((row) => isEscalation(row) && row.outcome === "ran" && row.session === session && row.key === key);
}

export function notRunAsks(rows: LedgerRow[]): EscalationRow[] {
  const escalations = rows.filter(isEscalation);
  return escalations.filter((row, index) => row.outcome === "ask" && !ranAfter(escalations, index, row));
}

export function notRunBefore(rows: LedgerRow[], session: string | null | undefined, key: string): boolean {
  for (let i = rows.length - 1; i >= 0; i--) {
    const row = rows[i];
    if (isEscalation(row) && row.outcome === "ask" && row.session === session && row.key === key) return !ranAfter(rows, i, row);
  }
  return false;
}

export function recordEscalation(root: string, input: EscalationInput, now: Date): EscalationRow {
  const row = {
    session: input.session ?? null,
    event: "escalation" as const,
    outcome: input.outcome,
    why: input.why ?? null,
    key: commandKey(input.command),
    command: input.command.slice(0, LOGGED_CHARS),
    reason: input.reason?.slice(0, LOGGED_CHARS) ?? null,
    agent: input.agent ?? null,
    work_id: input.work_id ?? null,
  };
  appendLedger(root, row, now);
  return { v: 2, ts: now.toISOString(), ...row };
}
