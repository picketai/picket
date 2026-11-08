import { workRel, type WorkId } from "./work/files.mts";

export type Severity = "Critical" | "Major" | "Minor" | "Nit";
export type Finding = { severity: Severity; path: string; line: number | null; end_line: number | null; text: string };

const FINDING = /^- \[(Critical|Major|Minor|Nit)\]\s+`?([^\s:\u2014`]+)`?(?::(\d+)(?:-(\d+))?)?(?::\s+|\s+\u2014\s+)(.*)$/;
const RECORD_FILES: readonly string[] = ["order.md", "design.md"];

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

function citesRecord(path: string, id: WorkId): boolean {
  const file = path.split("#")[0];
  return RECORD_FILES.some((name) => file === name || file === `${workRel(id)}${name}`);
}

export function citesOnlyRecord(findings: readonly Finding[], id: WorkId): boolean {
  return findings.every((finding) => citesRecord(finding.path, id));
}
