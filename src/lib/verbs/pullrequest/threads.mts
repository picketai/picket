export type Severity = "Critical" | "Major" | "Minor" | "Nit";
export type Finding = { severity: Severity; path: string; line: number | null; end_line: number | null; text: string };
export type ThreadContext = { filePath: string; rightFileStart: { line: number; offset: number }; rightFileEnd: { line: number; offset: number } };
export type Thread = { comments: { parentCommentId: number; content: string; commentType: number }[]; status: number; threadContext?: ThreadContext };

const FINDING = /^- \[(Critical|Major|Minor|Nit)\]\s+`?([^\s:\u2014`]+)`?(?::(\d+)(?:-(\d+))?)?(?::\s+|\s+\u2014\s+)(.*)$/;
const ACTIVE = 1;
const FIXED = 2;
const TEXT_COMMENT = 1;

function lineNumber(text: string | undefined): number | null {
  return text ? Number(text) : null;
}

export function parseFindings(text: string): Finding[] {
  const out: Finding[] = [];
  for (const line of String(text).split(/\r?\n/)) {
    const m = line.match(FINDING);
    if (m) out.push({ severity: m[1] as Severity, path: m[2], line: lineNumber(m[3]), end_line: lineNumber(m[4]) ?? lineNumber(m[3]), text: m[5].trim() });
  }
  return out;
}

function comment(content: string): Thread["comments"][number] {
  return { parentCommentId: 0, content, commentType: TEXT_COMMENT };
}

function findingThread(f: Finding): Thread {
  const thread: Thread = { comments: [comment(`**[${f.severity}]** ${f.text}`)], status: ACTIVE };
  if (f.line) thread.threadContext = { filePath: `/${f.path.replace(/^\/+/, "")}`, rightFileStart: { line: f.line, offset: 1 }, rightFileEnd: { line: f.end_line ?? f.line, offset: 1 } };
  return thread;
}

export function buildThreads(reviewText: string): Thread[] {
  const lines = String(reviewText).replace(/\r\n/g, "\n").split("\n");
  const verdict = lines.filter((l) => l.trim()).at(-1)?.trim() ?? "";
  const headline = lines.find((l) => l.trim() && !l.startsWith("## ")) ?? "";
  const findings = parseFindings(reviewText);
  const counts = findings.reduce<Record<string, number>>((c, f) => ((c[f.severity] = (c[f.severity] ?? 0) + 1), c), {});
  const tally = Object.entries(counts).map(([k, v]) => `${v} ${k.toLowerCase()}`).join(", ") || "none";
  const summary = `**Picket review: ${verdict}**\n\n${headline.trim()}\n\nFindings: ${tally}.`;
  return [{ comments: [comment(summary)], status: verdict === "APPROVED" ? FIXED : ACTIVE }, ...findings.map(findingThread)];
}
