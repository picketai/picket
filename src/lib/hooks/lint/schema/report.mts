import { frontmatter } from "../../../util/yaml-lite.mts";

type Finding = { id: string; words: number; tags: string[] };

const MAX_FINDINGS = 50;
const MAX_FINDING_WORDS = 120;
const MAX_SUMMARY_IDS = 3;
const MARKERS = ["[VERIFIED]", "[INFERRED]", "[ASSUMED]"];
const WITHDRAWN = "[withdrawn]";
const CONFIDENCE = ["high", "medium", "low"];
const FINDING_LINE = /^- \*\*(R-\d{3})\*\*(.*)$/;
const LEADING_TAGS = /^\s*(?:\[[^\]]*\](?=\s|$)\s*)*/;
const TAG = /\[[^\]]*\]/g;
const FINDING_ID = /\b(R-\d{3})\b/g;
const PLACEHOLDER = /\[REPLACE[:\]]/;
const SUMMARY =/^## Summary[^\n]*\n([\s\S]*?)(?=^## |(?![\s\S]))/m;

export function leftoverProblems(text: string): string[] {
  const problems: string[] = [];
  if (PLACEHOLDER.test(text)) problems.push("unfilled [REPLACE] placeholder left in the file");
  if (/<!--/.test(text)) problems.push("template comment left in the file");
  return problems;
}

function frontProblems(front: Record<string, unknown>): string[] {
  const problems: string[] = [];
  if (front.kind !== "report") problems.push(`kind is ${JSON.stringify(front.kind ?? null)}; a report needs kind: report`);
  if (!CONFIDENCE.includes(String(front.confidence))) problems.push(`confidence is ${JSON.stringify(front.confidence ?? null)}; a report takes ${CONFIDENCE.join(", ")}`);
  return problems;
}

function isContinuation(line: string): boolean {
  return line.trim() !== "" && !line.startsWith("- ") && !line.startsWith("#");
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function findings(body: string): Finding[] {
  const lines = body.replace(/\r\n/g, "\n").split("\n");
  return lines.flatMap((line, i) => {
    const match = FINDING_LINE.exec(line);
    if (!match) return [];
    const [, id, rest] = match;
    const following = lines.slice(i + 1);
    const end = following.findIndex((next) => !isContinuation(next));
    const continuation = end === -1 ? following : following.slice(0, end);
    const tags = LEADING_TAGS.exec(rest)?.[0].match(TAG) ?? [];
    return [{ id, words: wordCount([rest, ...continuation].join(" ")), tags }];
  });
}

function hasOneMarker({ tags }: Finding): boolean {
  if (tags[0] === WITHDRAWN) return true;
  return tags.length === 1 && MARKERS.includes(tags[0]);
}

function markerProblem(finding: Finding): string {
  if (finding.tags.length === 0) return `${finding.id} opens with no marker; give it one of ${MARKERS.join(", ")}`;
  return `${finding.id} opens with "${finding.tags.join(" ")}", not one marker`;
}

function findingProblems(list: Finding[]): string[] {
  const problems = list.filter((finding) => !hasOneMarker(finding)).map(markerProblem);
  if (list.length > MAX_FINDINGS) problems.push(`${list.length} findings; the cap is ${MAX_FINDINGS}`);
  for (const { id, words } of list) if (words > MAX_FINDING_WORDS) problems.push(`${id} runs ${words} words; the cap is ${MAX_FINDING_WORDS}`);
  return problems;
}

function summaryProblems(body: string): string[] {
  const summary = SUMMARY.exec(body.replace(/\r\n/g, "\n"))?.[1] ?? "";
  const ids = [...new Set([...summary.matchAll(FINDING_ID)].map(([, id]) => id))];
  return ids.length > MAX_SUMMARY_IDS ? [`the Summary cites ${ids.length} findings (${ids.join(", ")}); the cap is ${MAX_SUMMARY_IDS}`] : [];
}

export function reportProblems(text: string): string[] {
  const { front, body } = frontmatter(text);
  return [...frontProblems(front), ...findingProblems(findings(body)), ...summaryProblems(body), ...leftoverProblems(text)];
}
