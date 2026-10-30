export type ReportFindings = { findings: number; architect_review: string[]; strategic_review: string[] };

const FINDING_LINE = /^(?:- \*\*(R-\d{3})\*\*|### (R-\d{3})|(R-\d{3}))/;
const ARCHITECT_REVIEW = "[ARCHITECT REVIEW NEEDED]";
export const STRATEGIC_REVIEW = "[STRATEGIC REVIEW NEEDED]";
const CODE_SPAN = /`[^`]*`/g;

export function carriesFlag(line: string, flag: string): boolean {
  return line.replace(CODE_SPAN, "").includes(flag);
}

export function reportFindings(body: string): ReportFindings {
  const findings = body
    .split(/\r?\n/)
    .map((line) => ({ line, id: line.match(FINDING_LINE)?.slice(1).find(Boolean) }))
    .filter((finding): finding is { line: string; id: string } => finding.id !== undefined);
  const flagged = (flag: string) => findings.filter(({ line }) => carriesFlag(line, flag)).map(({ id }) => id);
  return { findings: findings.length, architect_review: flagged(ARCHITECT_REVIEW), strategic_review: flagged(STRATEGIC_REVIEW) };
}
