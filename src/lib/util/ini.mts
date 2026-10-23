export type IniEntry = readonly [key: string, value: string];
export type IniSection = readonly [name: string, entries: readonly IniEntry[]];

type Span = { start: number; end: number };

function eolOf(text: string): string {
  return text.includes("\r\n") ? "\r\n" : "\n";
}

function isHeader(line: string): boolean {
  return /^\s*\[.*\]\s*$/.test(line);
}

function sectionSpan(lines: string[], section: string): Span | null {
  const start = lines.findIndex((line) => line.trim() === `[${section}]`);
  if (start === -1) return null;
  const next = lines.findIndex((line, i) => i > start && isHeader(line));
  return { start, end: next === -1 ? lines.length : next };
}

function keyIndex(lines: string[], span: Span, key: string): number {
  for (let i = span.start + 1; i < span.end; i++) {
    if (lines[i].split("=")[0].trim() === key && lines[i].includes("=")) return i;
  }
  return -1;
}

export function getKey(text: string, section: string, key: string): string | undefined {
  const lines = text.split(/\r?\n/);
  const span = sectionSpan(lines, section);
  const at = span === null ? -1 : keyIndex(lines, span, key);
  return at === -1 ? undefined : lines[at].slice(lines[at].indexOf("=") + 1);
}

export function setKey(text: string, section: string, key: string, value: string): string {
  const eol = eolOf(text);
  const lines = text.split(/\r?\n/);
  const span = sectionSpan(lines, section);
  if (span === null) {
    const base = text === "" || text.endsWith("\n") ? text : `${text}${eol}`;
    const gap = base === "" ? "" : eol;
    return `${base}${gap}[${section}]${eol}${key}=${value}${eol}`;
  }
  const at = keyIndex(lines, span, key);
  if (at !== -1) lines[at] = `${key}=${value}`;
  else {
    let last = span.end - 1;
    while (last > span.start && lines[last].trim() === "") last--;
    lines.splice(last + 1, 0, `${key}=${value}`);
  }
  return lines.join(eol);
}

export function removeKey(text: string, section: string, key: string): string {
  const lines = text.split(/\r?\n/);
  const span = sectionSpan(lines, section);
  const at = span === null ? -1 : keyIndex(lines, span, key);
  if (at === -1) return text;
  lines.splice(at, 1);
  return lines.join(eolOf(text));
}

export function renderIni(sections: readonly IniSection[]): string {
  return sections.map(([name, entries]) => [`[${name}]`, ...entries.map(([key, value]) => `${key}=${value}`)].join("\n")).join("\n\n") + "\n";
}
