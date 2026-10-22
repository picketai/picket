import { openSync, fstatSync, readSync, closeSync, existsSync } from "node:fs";
import { join, dirname, basename } from "node:path";

/**
 * The transcript that holds THIS agent's turns. Measured on Claude Code 2.1.268: every hook payload
 * carries `transcript_path` = the main session file, even for a tool call inside a subagent; the
 * subagent's own Reads, Edits and text live in `<dir>/<session>/subagents/agent-<agent_id>.jsonl`,
 * which SubagentStop names as `agent_transcript_path` and PreToolUse only implies via `agent_id`.
 * Checking a subagent's Edit against the main transcript denied 17 legitimate edits in one design run.
 */
export function agentTranscript(data) {
  const main = data?.transcript_path ?? null;
  const own = data?.agent_transcript_path;
  if (own && existsSync(own)) return own;
  if (data?.agent_id && main) {
    const p = join(dirname(main), basename(main, ".jsonl"), "subagents", `agent-${data.agent_id}.jsonl`);
    if (existsSync(p)) return p;
  }
  return main;
}

// --- Transcript reading ----------------------------------------------------
// Scan the tail, not the whole file: a 200-turn transcript is megabytes, and the
// block we want is always in the LAST assistant entry. Windows escalate only if
// no assistant entry is found (very long single lines, e.g. a huge tool input).
const WINDOWS = [512 * 1024, 4 * 1024 * 1024, Infinity];

function readTail(path, maxBytes) {
  const fd = openSync(path, "r");
  try {
    const size = fstatSync(fd).size;
    const start = maxBytes === Infinity ? 0 : Math.max(0, size - maxBytes);
    const len = size - start;
    if (len <= 0) return "";
    const buf = Buffer.allocUnsafe(len);
    readSync(fd, buf, 0, len, start);
    let s = buf.toString("utf8");
    if (start > 0) {
      const nl = s.indexOf("\n"); // drop the partial line the window cut through
      s = nl === -1 ? "" : s.slice(nl + 1);
    }
    return s;
  } finally {
    closeSync(fd);
  }
}

function lastAssistantEntry(path) {
  for (const win of WINDOWS) {
    let chunk;
    try {
      chunk = readTail(path, win);
    } catch {
      return null;
    }
    const lines = chunk.split("\n");
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i];
      if (!line.trim() || !line.includes('"assistant"')) continue;
      let entry;
      try {
        entry = JSON.parse(line);
      } catch {
        continue; // truncated or unrelated line
      }
      if (entry?.type === "assistant" && Array.isArray(entry.message?.content)) return entry;
    }
    if (win === Infinity) break;
  }
  return null;
}

// The assistant entries of the turn that just ended, newest first: everything after the last
// request, which is a `user` entry that is not a tool result coming back.
function currentTurnAssistantEntries(path) {
  let chunk;
  try {
    chunk = readTail(path, WINDOWS[1]);
  } catch {
    return [];
  }
  const out = [];
  const lines = chunk.split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    let entry;
    try {
      entry = JSON.parse(lines[i]);
    } catch {
      continue;
    }
    if (entry?.type === "assistant" && Array.isArray(entry.message?.content)) out.push(entry);
    if (entry?.type === "user") {
      const content = entry.message?.content;
      if (!(Array.isArray(content) && content.some((c) => c?.type === "tool_result"))) break;
    }
  }
  return out;
}

// --- Candidate texts -------------------------------------------------------
// SendMessage is matched loosely: the team tool may surface plain or MCP-scoped.
// SubagentHandback is how a subagent delivers its report to the caller (Claude Code 2.1.280 on):
// the block goes in its `message`, and the final text after it is often a paraphrase with no heading.
const SEND_TOOLS = /(^|__)(SendMessage|SubagentHandback)$/;
// Preferred payload keys, then longest-string fallback — so a field rename in
// the team tool degrades to "still finds the body" rather than "sees nothing".
const BODY_KEYS = ["message", "content", "text", "body", "summary", "prompt"];

function stringsFrom(value, depth = 0, out = []) {
  if (depth > 3 || value == null) return out;
  if (typeof value === "string") {
    out.push(value);
    return out;
  }
  if (typeof value === "object") for (const v of Object.values(value)) stringsFrom(v, depth + 1, out);
  return out;
}

function bodyFromToolInput(input) {
  if (!input || typeof input !== "object") return "";
  for (const k of BODY_KEYS) if (typeof input[k] === "string" && input[k].trim()) return input[k];
  return stringsFrom(input).sort((a, b) => b.length - a.length)[0] ?? "";
}

// --- Contract detection ----------------------------------------------------
// The agents' contract headings (the <output_format> blocks in .claude/agents/). First match wins.
const BLOCKS = [
  ["phase", /^##\s+Phase\s+\d+\s+of\s+[a-z0-9-]+/m],
  ["review", /^##\s+Review:\s+[a-z0-9-]+/m],
  ["artifact", /^##\s+(Order|Design|Amendment):\s+[a-z0-9-]+/m],
  ["report", /^##\s+Report:\s+[a-z0-9-]+/m],
  ["expedited", /^##\s+Expedited:\s+[a-z0-9-]+/m],
];

export function detectBlock(text) {
  if (!text) return null;
  for (const [name, re] of BLOCKS) if (re.test(text)) return name;
  return null;
}

const VERDICTS = new Set(["ALIGNED", "DRIFT DETECTED", "APPROVED", "CHANGES REQUIRED"]);

export function blockLines(text) {
  const lines = text.split(/\r?\n/).filter((l) => !/^\s*```/.test(l.trim()));
  const nonEmpty = lines.filter((l) => l.trim() !== "");
  return { lines, nonEmpty, last: (nonEmpty[nonEmpty.length - 1] ?? "").trim() };
}

export function detectVerdict(text) {
  const { last } = blockLines(text);
  return VERDICTS.has(last) ? last : null;
}

export function detectClassification(text) {
  return /^Classification:\s+(CODE_DRIFT|ADR_AMENDED|PLAN_UPDATED)\s*$/m.exec(text)?.[1] ?? null;
}

export function detectScope(text) {
  return /^\*\*Scope:\*\*\s*(full|delta)/m.exec(text)?.[1] ?? null;
}

// --- The one entry point both hooks call -----------------------------------
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
export function readTurn(data, { includeToolPayloads = isSubagentTurn(data) } = {}) {
  const candidates = [];
  let model = null;

  const path = agentTranscript(data);
  const entry = path && existsSync(path) ? lastAssistantEntry(path) : null;
  if (entry) {
    model = entry.message?.model ?? null;
    if (includeToolPayloads)
      for (const turnEntry of currentTurnAssistantEntries(path)) {
        const content = turnEntry.message.content;
        for (let i = content.length - 1; i >= 0; i--) {
          const c = content[i];
          if (c?.type === "tool_use" && SEND_TOOLS.test(c.name ?? "")) {
            const body = bodyFromToolInput(c.input);
            if (body.trim()) candidates.push(body);
          }
        }
      }
    const text = entry.message.content
      .filter((c) => c?.type === "text")
      .map((c) => c.text)
      .join("\n");
    if (text.trim()) candidates.push(text);
  }
  if (typeof data?.last_assistant_message === "string" && data.last_assistant_message.trim())
    candidates.push(data.last_assistant_message);

  for (const c of candidates) if (detectBlock(c)) return { text: c, model };
  return { text: candidates.length ? candidates[candidates.length - 1] : "", model };
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
export function turnSpan(path) {
  const empty = { durationMs: null, usage: null, assistantTurns: null };
  if (!path || !existsSync(path)) return empty;

  let chunk;
  try {
    chunk = readTail(path, WINDOWS[0]);
  } catch {
    return empty;
  }

  const lines = chunk.split("\n");
  const usage = { input: 0, output: 0, cache_read: 0, cache_creation: 0 };
  let assistantTurns = 0;
  let endedAt = null;
  let startedAt = null;

  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (!line.trim()) continue;
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue; // truncated or unrelated line
    }
    const ts = entry?.timestamp ? Date.parse(entry.timestamp) : NaN;
    if (entry?.type === "assistant") {
      if (endedAt === null && !Number.isNaN(ts)) endedAt = ts;
      assistantTurns++;
      const u = entry.message?.usage ?? {};
      usage.input += u.input_tokens ?? 0;
      usage.output += u.output_tokens ?? 0;
      usage.cache_read += u.cache_read_input_tokens ?? 0;
      usage.cache_creation += u.cache_creation_input_tokens ?? 0;
      continue;
    }
    // The turn starts at the request that provoked it. A `user` entry carrying
    // tool_result content is this turn's own tool output coming back, not a new
    // request, so it is not the boundary.
    if (entry?.type === "user") {
      const content = entry.message?.content;
      const isToolResult =
        Array.isArray(content) && content.some((c) => c?.type === "tool_result");
      if (isToolResult) continue;
      if (!Number.isNaN(ts)) startedAt = ts;
      break;
    }
  }

  const durationMs =
    startedAt !== null && endedAt !== null && endedAt >= startedAt ? endedAt - startedAt : null;
  return {
    durationMs,
    usage: assistantTurns ? usage : null,
    assistantTurns: assistantTurns || null,
  };
}

// True when this invocation is a teammate's turn ending, not the lead's.
export function isSubagentTurn(data) {
  return data?.hook_event_name === "SubagentStop" || Boolean(data?.agent_id);
}
