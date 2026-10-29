export type FieldValue = string | string[];
export type Section = { level: 2 | 3; title: string; line: number; end: number };
export type Fence = { start: number; end: number; lines: string[] };

const FRONTMATTER = /^---\n([\s\S]*?)\n---\n?/;
const TOP_LEVEL_KEY = /^([A-Za-z][\w-]*):\s*(.*)$/;
const BLOCK_SCALAR = /^[>|]-?$/;
const LIST_ITEM = /^\s+-\s+(.*)$/;
const INDENTED = /^\s+\S/;
const FENCE_MARK = /^\s*(```|~~~)/;
const HEADING = /^(#{2,3})\s+(.*)$/;
const ANY_HEADING = /^#{1,6}\s/;
const ORDERED_ITEM = /^\d+\.\s/;

function normalised(text: string): string {
  return text.replace(/\r\n/g, "\n");
}

export function bodyOf(text: string): string {
  return normalised(text).replace(FRONTMATTER, "");
}

function indentedRun(lines: string[], from: number): string[] {
  let end = from;
  while (end < lines.length && INDENTED.test(lines[end])) end++;
  return lines.slice(from, end);
}

function nestedValue(head: string, nested: string[]): FieldValue {
  if (BLOCK_SCALAR.test(head)) return nested.map((line) => line.trim()).join(" ");
  if (head === "" && nested.length > 0) return nested.map((line) => line.match(LIST_ITEM)?.[1]?.trim() ?? line.trim());
  return head;
}

export function frontmatterFields(text: string): Record<string, FieldValue> {
  const match = normalised(text).match(FRONTMATTER);
  if (!match) return {};
  const lines = match[1].split("\n");
  const fields: Record<string, FieldValue> = {};
  for (let i = 0; i < lines.length; i++) {
    const key = lines[i].match(TOP_LEVEL_KEY);
    if (!key) continue;
    const nested = indentedRun(lines, i + 1);
    fields[key[1]] = nestedValue(key[2].trim(), nested);
    i += nested.length;
  }
  return fields;
}

function unfencedLines(lines: string[]): boolean[] {
  let inside = false;
  return lines.map((line) => {
    if (FENCE_MARK.test(line)) {
      inside = !inside;
      return false;
    }
    return !inside;
  });
}

export function sections(body: string): Section[] {
  const lines = normalised(body).split("\n");
  const outside = unfencedLines(lines);
  const headings = lines.flatMap((line, i) => {
    const match = outside[i] ? line.match(HEADING) : null;
    return match ? [{ level: match[1].length as 2 | 3, title: match[2].trim(), line: i }] : [];
  });
  return headings.map((heading, k) => {
    const next = headings.slice(k + 1).find((later) => later.level <= heading.level);
    return { ...heading, end: next ? next.line : lines.length };
  });
}

export function isOrderedItem(line: string): boolean {
  return ORDERED_ITEM.test(line);
}

export function hasOrderedList(body: string): boolean {
  const lines = normalised(body).split("\n");
  const outside = unfencedLines(lines);
  return lines.some((line, i) => outside[i] && isOrderedItem(line));
}

export function paragraphs(body: string): string[] {
  const lines = normalised(body).split("\n");
  const outside = unfencedLines(lines);
  const found: string[] = [];
  let current: string[] = [];
  const close = () => {
    if (current.length) found.push(current.join(" ").replace(/\s+/g, " ").trim());
    current = [];
  };
  lines.forEach((line, i) => {
    if (!outside[i] || !line.trim() || ANY_HEADING.test(line)) close();
    else current.push(line.trim());
  });
  close();
  return found;
}

export function fences(lines: string[]): Fence[] {
  const found: Fence[] = [];
  let start: number | null = null;
  lines.forEach((line, i) => {
    if (!FENCE_MARK.test(line)) return;
    if (start === null) start = i;
    else {
      found.push({ start, end: i, lines: lines.slice(start + 1, i) });
      start = null;
    }
  });
  return found;
}
