import { entriesFromEnd, TAIL_WINDOWS } from "./tail.mts";

export type Usage = { input_tokens?: number; output_tokens?: number; cache_read_input_tokens?: number; cache_creation_input_tokens?: number };
export type ContentItem = { type?: string; text?: string; name?: string; input?: Record<string, unknown> } & Record<string, unknown>;
export type TranscriptEntry = { type?: string; timestamp?: string; message?: { role?: string; model?: string; content?: unknown; usage?: Usage } } & Record<string, unknown>;
export type ToolUse = ContentItem & { type: "tool_use"; name: string };
export type Hints = { work_id: string | null; phase: number | null; lane: string | null; scope: string | null };
export type ToolStats = {
  tool_calls: number;
  counts: Record<string, number>;
  reads: number;
  rereads: number;
  first_ts: number | null;
  last_ts: number | null;
  first_write_ts: number | null;
  first_work_write_ts: number | null;
  read_paths: Set<string>;
  names: string[];
};

const WORK_LINE = /^\s*work:\s*([a-z0-9-]+)/m;
const WRITE_TOOLS = new Set(["Write", "Edit", "MultiEdit", "NotebookEdit"]);
const RECENT_BYTES = TAIL_WINDOWS[1];

function contentItems(entry: TranscriptEntry | null | undefined): ContentItem[] | null {
  const content = entry?.message?.content;
  return Array.isArray(content) ? (content as ContentItem[]) : null;
}

export function isUserText(entry: TranscriptEntry | null | undefined): boolean {
  if (entry?.type !== "user") return false;
  const content = contentItems(entry);
  return content === null || content.some((c) => c?.type === "text");
}

export function messageText(entry: TranscriptEntry | null | undefined): string {
  const content = entry?.message?.content;
  if (typeof content === "string") return content;
  return contentItems(entry)?.filter((c) => c?.type === "text").map((c) => c.text).join("\n") ?? "";
}

export function toolUses(entry: TranscriptEntry | null | undefined): ToolUse[] {
  if (entry?.type !== "assistant") return [];
  return (contentItems(entry) ?? []).filter((c): c is ToolUse => c?.type === "tool_use");
}

function hintsOf(text: string): Hints {
  const phase = text.match(/^\s*phase:\s*(\d+)/m)?.[1];
  return {
    work_id: text.match(WORK_LINE)?.[1] ?? null,
    phase: phase ? Number(phase) : null,
    lane: text.match(/^\s*lane:\s*(fast|order|design|research)/m)?.[1] ?? null,
    scope: text.match(/^\s*scope:\s*(crosscheck|cumulative|checkpoint|phase \d+)/m)?.[1] ?? null,
  };
}

/** `work: <id>` and `phase: <n>` from the first user message of the transcript (the spawn message). */
export function spawnHints(path: string | null | undefined): Hints {
  let first: TranscriptEntry | undefined;
  for (const entry of entriesFromEnd(path)) if (isUserText(entry)) first = entry;
  return hintsOf(messageText(first));
}

export function latestHints(path: string | null | undefined): Hints {
  for (const entry of entriesFromEnd(path)) {
    if (!isUserText(entry)) continue;
    const text = messageText(entry);
    if (WORK_LINE.test(text)) return hintsOf(text);
  }
  return hintsOf("");
}

function timeOf(entry: TranscriptEntry): number {
  return entry?.timestamp ? Date.parse(entry.timestamp) : NaN;
}

function filePathOf(use: ToolUse): string {
  return String(use.input?.file_path ?? "");
}

/** Tool-use statistics over the whole transcript: counts, reads, re-reads, first write and start time. */
export function toolStats(path: string | null | undefined): ToolStats {
  const stats: ToolStats = { tool_calls: 0, counts: {}, reads: 0, rereads: 0, first_ts: null, last_ts: null, first_write_ts: null, first_work_write_ts: null, read_paths: new Set(), names: [] };
  for (const e of [...entriesFromEnd(path)].reverse()) {
    const ts = timeOf(e);
    if (!Number.isNaN(ts)) {
      if (stats.first_ts === null) stats.first_ts = ts;
      stats.last_ts = ts;
    }
    for (const c of toolUses(e)) {
      stats.tool_calls++;
      stats.counts[c.name] = (stats.counts[c.name] ?? 0) + 1;
      stats.names.push(c.name);
      if (c.name === "Read") {
        stats.reads++;
        const p = c.input?.file_path;
        if (typeof p === "string" && p) {
          if (stats.read_paths.has(p)) stats.rereads++;
          stats.read_paths.add(p);
        }
      }
      if (WRITE_TOOLS.has(c.name)) {
        if (stats.first_write_ts === null && !Number.isNaN(ts)) stats.first_write_ts = ts;
        const p = filePathOf(c).replaceAll("\\", "/");
        if (stats.first_work_write_ts === null && /(^|\/)work\//.test(p) && !Number.isNaN(ts)) stats.first_work_write_ts = ts;
      }
    }
  }
  return stats;
}

/** Was `filePath` read (Read tool) earlier in this transcript? Compared on normalised absolute paths. */
export function wasRead(path: string | null | undefined, filePath: string): boolean {
  const want = norm(filePath);
  for (const e of entriesFromEnd(path, { maxBytes: RECENT_BYTES })) {
    for (const c of toolUses(e)) {
      if (c.name === "Read" && norm(c.input?.file_path) === want) return true;
      if (WRITE_TOOLS.has(c.name) && norm(c.input?.file_path) === want) return true; // it wrote it, so it knows it
    }
  }
  return false;
}

function norm(p: unknown): string {
  return String(p ?? "").replaceAll("\\", "/").replace(/^[a-z]:/i, (m) => m.toLowerCase()).toLowerCase();
}
