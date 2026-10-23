import { detectBlock } from "../work/block.mts";
import { agentTranscript, isSubagentTurn, type HookData } from "./agent.mts";
import { messageText, toolUses, type TranscriptEntry, type Usage } from "./entries.mts";
import { entriesFromEnd, TAIL_WINDOWS } from "./tail.mts";

export type Turn = { text: string; model: string | null };
export type TurnUsage = { input: number; output: number; cache_read: number; cache_creation: number };
export type TurnSpan = { durationMs: number | null; usage: TurnUsage | null; assistantTurns: number | null };
export type BlockLines = { lines: string[]; nonEmpty: string[]; last: string };

const [SPAN_BYTES, TURN_BYTES] = TAIL_WINDOWS;

function isAssistantWithContent(entry: TranscriptEntry): boolean {
  return entry?.type === "assistant" && Array.isArray(entry.message?.content);
}

function isToolResult(entry: TranscriptEntry): boolean {
  const content = entry.message?.content;
  return Array.isArray(content) && content.some((c) => c?.type === "tool_result");
}

function lastAssistantEntry(path: string): TranscriptEntry | null {
  try {
    for (const entry of entriesFromEnd(path, { contains: '"assistant"' })) if (isAssistantWithContent(entry)) return entry;
  } catch {
    return null;
  }
  return null;
}

// The assistant entries of the turn that just ended, newest first: everything after the last
// request, which is a `user` entry that is not a tool result coming back.
export function currentTurnAssistantEntries(path: string): TranscriptEntry[] {
  const out: TranscriptEntry[] = [];
  try {
    for (const entry of entriesFromEnd(path, { maxBytes: TURN_BYTES })) {
      if (isAssistantWithContent(entry)) out.push(entry);
      if (entry?.type === "user" && !isToolResult(entry)) break;
    }
  } catch {
    return [];
  }
  return out;
}

// SendMessage is matched loosely: the team tool may surface plain or MCP-scoped.
// SubagentHandback is how a subagent delivers its report to the caller (Claude Code 2.1.280 on):
// the block goes in its `message`, and the final text after it is often a paraphrase with no heading.
const SEND_TOOLS = /(^|__)(SendMessage|SubagentHandback)$/;
// Preferred payload keys, then longest-string fallback — so a field rename in
// the team tool degrades to "still finds the body" rather than "sees nothing".
const BODY_KEYS = ["message", "content", "text", "body", "summary", "prompt"];

function stringsFrom(value: unknown, depth = 0, out: string[] = []): string[] {
  if (depth > 3 || value == null) return out;
  if (typeof value === "string") {
    out.push(value);
    return out;
  }
  if (typeof value === "object") for (const v of Object.values(value)) stringsFrom(v, depth + 1, out);
  return out;
}

function bodyFromToolInput(input: unknown): string {
  if (!input || typeof input !== "object") return "";
  const fields = input as Record<string, unknown>;
  for (const k of BODY_KEYS) {
    const value = fields[k];
    if (typeof value === "string" && value.trim()) return value;
  }
  return stringsFrom(input).sort((a, b) => b.length - a.length)[0] ?? "";
}

function sentBodies(path: string): string[] {
  const bodies: string[] = [];
  for (const turnEntry of currentTurnAssistantEntries(path)) {
    for (const use of toolUses(turnEntry).reverse()) {
      if (!SEND_TOOLS.test(use.name ?? "")) continue;
      const body = bodyFromToolInput(use.input);
      if (body.trim()) bodies.push(body);
    }
  }
  return bodies;
}

export function blockLines(text: string): BlockLines {
  const lines = text.split(/\r?\n/).filter((l) => !/^\s*```/.test(l.trim()));
  const nonEmpty = lines.filter((l) => l.trim() !== "");
  return { lines, nonEmpty, last: (nonEmpty[nonEmpty.length - 1] ?? "").trim() };
}

// Returns the turn's contract text plus the model that produced it, from a
// single tail read. Candidate order: SendMessage and SubagentHandback payloads
// from anywhere in the current turn (newest first), then the final assistant
// text, then the harness-supplied last_assistant_message.
// The first candidate carrying a recognised block header wins; with none, the
// plain final text is returned so non-block turns behave exactly as before.
//
// `includeToolPayloads` defaults to "only on a teammate's turn". The lead relays
// requests to teammates through SendMessage too, and one of those payloads can
// legitimately carry a block header (a forwarded amendment request). Judging the
// lead against a contract that belongs to someone else would invent violations
// and inflate gate counts, so the lead keeps its historical behaviour: its own
// final text, nothing else.
export function readTurn(data: HookData, { includeToolPayloads = isSubagentTurn(data) }: { includeToolPayloads?: boolean } = {}): Turn {
  const candidates: string[] = [];
  let model: string | null = null;

  const path = agentTranscript(data);
  const entry = path ? lastAssistantEntry(path) : null;
  if (entry) {
    model = entry.message?.model ?? null;
    if (includeToolPayloads) candidates.push(...sentBodies(path as string));
    const text = messageText(entry);
    if (text.trim()) candidates.push(text);
  }
  const last = data?.last_assistant_message;
  if (typeof last === "string" && last.trim()) candidates.push(last);

  for (const c of candidates) if (detectBlock(c)) return { text: c, model };
  return { text: candidates.length ? candidates[candidates.length - 1] : "", model };
}

function addUsage(total: TurnUsage, u: Usage): void {
  total.input += u.input_tokens ?? 0;
  total.output += u.output_tokens ?? 0;
  total.cache_read += u.cache_read_input_tokens ?? 0;
  total.cache_creation += u.cache_creation_input_tokens ?? 0;
}

/**
 * Cost and duration of the turn that just ended, from one bounded tail read.
 *
 * Wall-clock per turn used to be derivable only as the gap between consecutive
 * ledger rows, which conflates thinking and tool time with the human sitting at
 * a phase gate — a 15-minute gap could be either, and those have opposite
 * fixes. This measures the turn itself: from the request entering the
 * transcript to the last assistant entry leaving it.
 *
 * Returns nulls rather than guesses when the boundary falls outside the tail
 * window: a missing number is honest, a wrong one is worse than none.
 */
export function turnSpan(path: string | null | undefined): TurnSpan {
  const empty: TurnSpan = { durationMs: null, usage: null, assistantTurns: null };
  const usage: TurnUsage = { input: 0, output: 0, cache_read: 0, cache_creation: 0 };
  let assistantTurns = 0;
  let endedAt: number | null = null;
  let startedAt: number | null = null;

  try {
    for (const entry of entriesFromEnd(path, { maxBytes: SPAN_BYTES })) {
      const ts = entry?.timestamp ? Date.parse(entry.timestamp) : NaN;
      if (entry?.type === "assistant") {
        if (endedAt === null && !Number.isNaN(ts)) endedAt = ts;
        assistantTurns++;
        addUsage(usage, entry.message?.usage ?? {});
        continue;
      }
      // The turn starts at the request that provoked it. A `user` entry carrying
      // tool_result content is this turn's own tool output coming back, not a new
      // request, so it is not the boundary.
      if (entry?.type === "user") {
        if (isToolResult(entry)) continue;
        if (!Number.isNaN(ts)) startedAt = ts;
        break;
      }
    }
  } catch {
    return empty;
  }

  const durationMs = startedAt !== null && endedAt !== null && endedAt >= startedAt ? endedAt - startedAt : null;
  return {
    durationMs,
    usage: assistantTurns ? usage : null,
    assistantTurns: assistantTurns || null,
  };
}
