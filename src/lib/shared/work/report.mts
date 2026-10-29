export type ReportFindings = { findings: number; architect_review: string[] };

const FINDING_LINE = /^(?:- \*\*(R-\d{3})\*\*|### (R-\d{3})|(R-\d{3}))/;
const ARCHITECT_REVIEW = "[ARCHITECT REVIEW NEEDED]";

export function reportFindings(body: string): ReportFindings {
  const findings = body
    .split(/\r?\n/)
    .map((line) => ({ line, id: line.match(FINDING_LINE)?.slice(1).find(Boolean) }))
    .filter((finding): finding is { line: string; id: string } => finding.id !== undefined);
  return { findings: findings.length, architect_review: findings.filter(({ line }) => line.includes(ARCHITECT_REVIEW)).map(({ id }) => id) };
}
