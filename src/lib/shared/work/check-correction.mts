type Span = { start: number; end: number };

const FRONTMATTER_FENCE = "---";
const NEEDS_QUOTES = /#|:\s|:$|^[\s"'[{&*!|>%@`]|\s$|[[\]{},]/;
const PLAIN_KEYWORD = /^(true|false|null|~|-?\d+(\.\d+)?)$/;
const REVISION_LOG = /^## Revision log\b/;
const NEXT_SECTION = /^## /;

function indentOf(line: string): number {
  return line.length - line.trimStart().length;
}

function isBlank(line: string): boolean {
  return line.trim() === "";
}

function frontmatterSpan(lines: string[]): Span | null {
  if (lines[0] !== FRONTMATTER_FENCE) return null;
  const end = lines.indexOf(FRONTMATTER_FENCE, 1);
  return end === -1 ? null : { start: 1, end };
}

function blockAfter(lines: string[], at: number, limit: number): Span {
  const indent = indentOf(lines[at]);
  let end = at + 1;
  while (end < limit && (isBlank(lines[end]) || indentOf(lines[end]) > indent)) end++;
  return { start: at + 1, end };
}

function findLine(lines: string[], { start, end }: Span, matches: (line: string) => boolean): number {
  for (let at = start; at < end; at++) if (matches(lines[at])) return at;
  return -1;
}

function phaseEntry(lines: string[], front: Span, phase: number): Span | null {
  const at = findLine(lines, front, (line) => new RegExp(`^\\s*- n:\\s*${phase}\\s*$`).test(line));
  return at === -1 ? null : { start: at, end: blockAfter(lines, at, front.end).end };
}

function checkItem(lines: string[], drive: Span, index: number): Span | null {
  const items: number[] = [];
  const itemIndent = indentOf(lines[findLine(lines, drive, (line) => !isBlank(line))] ?? "");
  for (let at = drive.start; at < drive.end; at++) {
    if (indentOf(lines[at]) === itemIndent && lines[at].trimStart().startsWith("- ")) items.push(at);
  }
  if (index >= items.length) return null;
  return { start: items[index], end: items[index + 1] ?? drive.end };
}

function quoted(value: string): string {
  if (!NEEDS_QUOTES.test(value) && !PLAIN_KEYWORD.test(value)) return value;
  return `"${value.replace(/[\\"]/g, "\\$&")}"`;
}

function pathLine(lines: string[], item: Span): number {
  return findLine(lines, item, (line) => /^\s*(?:- )?path:/.test(line));
}

export function correctCheckPath(text: string, phase: number, index: number, path: string): string {
  const lines = text.split("\n");
  const front = frontmatterSpan(lines);
  const entry = front && phaseEntry(lines, front, phase);
  const driveAt = entry ? findLine(lines, entry, (line) => /^\s*drive:\s*$/.test(line)) : -1;
  const item = entry && driveAt !== -1 ? checkItem(lines, blockAfter(lines, driveAt, entry.end), index) : null;
  const at = item ? pathLine(lines, item) : -1;
  if (at === -1) return text;
  const prefix = lines[at].match(/^(\s*(?:- )?path:)/)?.[1] ?? "";
  lines[at] = `${prefix} ${quoted(path)}`;
  return lines.join("\n");
}

function lastContentLine(lines: string[], from: number, to: number): number {
  let last = from;
  for (let at = from + 1; at < to; at++) if (!isBlank(lines[at])) last = at;
  return last;
}

export function withRevisionLine(text: string, line: string): string {
  const lines = text.split("\n");
  const heading = lines.findIndex((candidate) => REVISION_LOG.test(candidate));
  if (heading === -1) return `${text.replace(/\n*$/, "")}\n\n## Revision log\n\n${line}\n`;
  const next = lines.findIndex((candidate, at) => at > heading && NEXT_SECTION.test(candidate));
  const end = next === -1 ? lines.length : next;
  const last = lastContentLine(lines, heading, end);
  const spacer = last === heading ? [""] : [];
  lines.splice(last + 1, 0, ...spacer, line);
  return lines.join("\n");
}
