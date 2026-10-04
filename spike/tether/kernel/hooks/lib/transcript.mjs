// Transcript helpers shared by the Stop, SubagentStop and PostToolUse hooks. One bounded tail
// read per question; nulls instead of guesses when the window does not reach the answer.
import { closeSync, existsSync, fstatSync, openSync, readSync } from "node:fs";
export { readTurn, turnSpan, isSubagentTurn, blockLines, agentTranscript } from "./turn-block.mjs";

const WINDOW = 4 * 1024 * 1024;

export function readTail(path, maxBytes = WINDOW) {
  if (!path || !existsSync(path)) return "";
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
      const nl = s.indexOf("\n");
      s = nl === -1 ? "" : s.slice(nl + 1);
    }
    return s;
  } finally {
    closeSync(fd);
  }
}

export function entries(path, maxBytes = WINDOW) {
  const out = [];
  for (const line of readTail(path, maxBytes).split("\n")) {
    if (!line.trim()) continue;
    try {
      out.push(JSON.parse(line));
    } catch {}
  }
  return out;
}

/** `work: <id>` and `phase: <n>` from the first user message of the transcript (the spawn message). */
export function spawnHints(path) {
  const all = entries(path, Infinity);
  const first = all.find((e) => e?.type === "user" && !Array.isArray(e.message?.content) || (e?.type === "user" && Array.isArray(e.message?.content) && e.message.content.some((c) => c?.type === "text")));
  const text = typeof first?.message?.content === "string" ? first.message.content : first?.message?.content?.filter((c) => c?.type === "text").map((c) => c.text).join("\n") ?? "";
  return {
    work_id: text.match(/^\s*work:\s*([a-z0-9-]+)/m)?.[1] ?? null,
    phase: text.match(/^\s*phase:\s*(\d+)/m) ? Number(text.match(/^\s*phase:\s*(\d+)/m)[1]) : null,
    lane: text.match(/^\s*lane:\s*(fast|order|design|research)/m)?.[1] ?? null,
    scope: text.match(/^\s*scope:\s*(crosscheck|cumulative|checkpoint|phase \d+)/m)?.[1] ?? null,
  };
}

const WRITE_TOOLS = new Set(["Write", "Edit", "MultiEdit", "NotebookEdit"]);

/** Tool-use statistics over the whole transcript: counts, reads, re-reads, first write and start time. */
export function toolStats(path) {
  const all = entries(path, Infinity);
  const stats = { tool_calls: 0, counts: {}, reads: 0, rereads: 0, first_ts: null, last_ts: null, first_write_ts: null, first_work_write_ts: null, read_paths: new Set(), names: [] };
  for (const e of all) {
    const ts = e?.timestamp ? Date.parse(e.timestamp) : NaN;
    if (!Number.isNaN(ts)) {
      if (stats.first_ts === null) stats.first_ts = ts;
      stats.last_ts = ts;
    }
    if (e?.type !== "assistant" || !Array.isArray(e.message?.content)) continue;
    for (const c of e.message.content) {
      if (c?.type !== "tool_use") continue;
      stats.tool_calls++;
      stats.counts[c.name] = (stats.counts[c.name] ?? 0) + 1;
      stats.names.push(c.name);
      if (c.name === "Read") {
        stats.reads++;
        const p = c.input?.file_path;
        if (p) {
          if (stats.read_paths.has(p)) stats.rereads++;
          stats.read_paths.add(p);
        }
      }
      if (WRITE_TOOLS.has(c.name)) {
        if (stats.first_write_ts === null && !Number.isNaN(ts)) stats.first_write_ts = ts;
        const p = String(c.input?.file_path ?? "").replaceAll("\\", "/");
        if (stats.first_work_write_ts === null && /(^|\/)work\//.test(p) && !Number.isNaN(ts)) stats.first_work_write_ts = ts;
      }
    }
  }
  return stats;
}

/** Was `filePath` read (Read tool) earlier in this transcript? Compared on normalised absolute paths. */
export function wasRead(path, filePath) {
  const want = norm(filePath);
  for (const e of entries(path)) {
    if (e?.type !== "assistant" || !Array.isArray(e.message?.content)) continue;
    for (const c of e.message.content) {
      if (c?.type === "tool_use" && c.name === "Read" && norm(c.input?.file_path) === want) return true;
      if (c?.type === "tool_use" && WRITE_TOOLS.has(c.name) && norm(c.input?.file_path) === want) return true; // it wrote it, so it knows it
    }
  }
  return false;
}

function norm(p) {
  return String(p ?? "").replaceAll("\\", "/").replace(/^[a-z]:/i, (m) => m.toLowerCase()).toLowerCase();
}

/** The agent's role: hook payload first, then the transcript's spawn hints, then "lead". */
export function agentName(data, path) {
  if (data?.agent_type) return String(data.agent_type);
  if (data?.agent_name) return String(data.agent_name);
  // A Stop without an agent id is the lead's own turn. The transcript scan below would find the
  // lead's Agent spawn (`subagent_type: architect`) and label the lead's turn "architect".
  if (data?.hook_event_name === "Stop" && !data?.agent_id) return "lead";
  const text = readTail(path, 256 * 1024);
  const m = text.match(/"agent_type"\s*:\s*"([a-z-]+)"/) ?? text.match(/"subagent_type"\s*:\s*"([a-z-]+)"/);
  if (m) return m[1];
  return data?.hook_event_name === "SubagentStop" ? "subagent" : "lead";
}
