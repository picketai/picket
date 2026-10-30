export type Brief = { purpose: string; in_scope: string; out_of_scope: string };

const HEADING = "## Brief";
const LABELS: Record<keyof Brief, string> = { purpose: "purpose", in_scope: "in scope", out_of_scope: "out of scope" };
const FIELDS = Object.keys(LABELS) as (keyof Brief)[];

export function briefLines(brief: Brief | null): string[] {
  return brief ? FIELDS.map((field) => `${LABELS[field]}: ${brief[field]}`) : [];
}

export function withBrief(request: string, brief: Brief): string {
  const separator = request.endsWith("\n") ? "\n" : "\n\n";
  return `${request}${separator}${HEADING}\n${briefLines(brief).join("\n")}\n`;
}

function lastSection(text: string): string[] {
  const lines = text.split(/\r?\n/);
  const start = lines.lastIndexOf(HEADING);
  if (start < 0) return [];
  const body = lines.slice(start + 1);
  const end = body.findIndex((line) => line.startsWith("#"));
  return end < 0 ? body : body.slice(0, end);
}

function fieldValue(lines: readonly string[], field: keyof Brief): string {
  const prefix = `${LABELS[field]}: `;
  return lines.find((line) => line.startsWith(prefix))?.slice(prefix.length).trim() ?? "";
}

export function readBrief(text: string | null): Brief | null {
  if (text === null) return null;
  const lines = lastSection(text);
  const [purpose, in_scope, out_of_scope] = FIELDS.map((field) => fieldValue(lines, field));
  return purpose && in_scope && out_of_scope ? { purpose, in_scope, out_of_scope } : null;
}
