// A deliberately small YAML subset, so the harness carries no runtime dependency into host projects.
// Supported: `key: scalar`, `key: [a, b]`, `key:` followed by an indented block of `key: value`
// lines, and `key:` followed by a block list whose items are `- key: value` maps or `- scalar`.
// One level of nesting inside list items. Comments start with `#`. Strings may be quoted.
// Anything else throws, which is the point: the files this reads are written by this harness.

export type YamlScalar = string | number | boolean | null;
export type YamlValue = YamlScalar | YamlValue[] | YamlMap;
export type YamlMap = { [key: string]: YamlValue };

const KEY_LINE = /^([A-Za-z0-9_.-]+):(?:\s+(.*))?$/;
const UNSUPPORTED_START = /^[|>&*!]/;
const QUOTE_OPENERS = new Set(["", "[", "{", ",", ":"]);

function quotedMask(s: string): boolean[] {
  const mask: boolean[] = [];
  let quote: string | null = null;
  let previous = "";
  for (let at = 0; at < s.length; at++) {
    const ch = s[at];
    if (quote !== null) {
      mask[at] = true;
      const escaped = (quote === '"' && ch === "\\") || (quote === "'" && ch === "'" && s[at + 1] === "'");
      if (escaped) mask[++at] = true;
      else if (ch === quote) quote = null;
      previous = ch;
      continue;
    }
    const opens = (ch === '"' || ch === "'") && QUOTE_OPENERS.has(previous);
    if (opens) quote = ch;
    mask[at] = opens;
    if (ch.trim() !== "") previous = ch;
  }
  return mask;
}

function uncommented(raw: string): string {
  const mask = quotedMask(raw);
  for (let at = 0; at < raw.length; at++) {
    if (raw[at] === "#" && !mask[at] && (at === 0 || raw[at - 1].trim() === "")) return raw.slice(0, at).trim();
  }
  return raw.trim();
}

function unsupported(value: string, line: number): Error {
  return new Error(`yaml-lite: unsupported value at line ${line}: ${value}`);
}

function nestedInMap(line: number): Error {
  return new Error(`yaml-lite: nested {...} or [...] inside {...} at line ${line}`);
}

function scalar(s: string): YamlScalar {
  if (s === "" || s === "null" || s === "~") return null;
  if (s === "true") return true;
  if (s === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  // Quoted scalars carry escapes: "lines\\[0\\]" is the regex lines\[0\] (an architect writing a
  // grep pattern in double quotes doubles the backslashes, as YAML requires), '' inside '…' is '.
  if (s.startsWith('"') && s.endsWith('"') && s.length >= 2) return s.slice(1, -1).replace(/\\(["\\/nrt])/g, (_, c: string) => ({ n: "\n", r: "\r", t: "\t" })[c] ?? c);
  if (s.startsWith("'") && s.endsWith("'") && s.length >= 2) return s.slice(1, -1).replaceAll("''", "'");
  return s;
}

function splitFlow(inner: string, line: number, insideMap: boolean): string[] {
  const mask = quotedMask(inner);
  const parts: string[] = [];
  let start = 0;
  let depth = 0;
  for (let at = 0; at < inner.length; at++) {
    if (mask[at]) continue;
    const ch = inner[at];
    if (insideMap && (ch === "{" || ch === "[")) throw nestedInMap(line);
    if (ch === "{") depth++;
    else if (ch === "}") depth--;
    else if (ch === "," && depth === 0) {
      parts.push(inner.slice(start, at));
      start = at + 1;
    }
  }
  const last = inner.slice(start);
  if (last.trim() !== "") parts.push(last);
  return parts.map((part) => part.trim());
}

function flowEntry(entry: string, line: number): [string, YamlScalar] {
  const mask = quotedMask(entry);
  const colon = [...entry].findIndex((ch, at) => ch === ":" && !mask[at] && (at + 1 === entry.length || entry[at + 1].trim() === ""));
  if (colon <= 0) throw unsupported(entry, line);
  return [String(scalar(entry.slice(0, colon).trim())), scalar(entry.slice(colon + 1).trim())];
}

function flowMap(value: string, line: number): YamlMap {
  if (!value.endsWith("}")) throw unsupported(value, line);
  const inner = value.slice(1, -1).trim();
  return inner === "" ? {} : Object.fromEntries(splitFlow(inner, line, true).map((entry) => flowEntry(entry, line)));
}

function flowItem(item: string, line: number): YamlValue {
  if (item.startsWith("{")) return flowMap(item, line);
  if (item.startsWith("[")) throw unsupported(item, line);
  return scalar(item);
}

function flowList(value: string, line: number): YamlValue[] {
  if (!value.endsWith("]")) throw unsupported(value, line);
  const inner = value.slice(1, -1).trim();
  return inner === "" ? [] : splitFlow(inner, line, false).map((item) => flowItem(item, line));
}

export function readValue(raw: string, line: number): YamlValue {
  const value = uncommented(raw);
  if (UNSUPPORTED_START.test(value)) throw unsupported(value, line);
  if (value.startsWith("{")) return flowMap(value, line);
  if (value.startsWith("[")) return flowList(value, line);
  return scalar(value);
}

type Reader = { lines: string[]; at: number; firstLine: number };

function indentOf(line: string): number {
  return line.length - line.replace(/^ +/, "").length;
}

function meaningful(line: string): boolean {
  const t = line.trim();
  return t !== "" && !t.startsWith("#");
}

function lineNumber(reader: Reader): number {
  return reader.at + reader.firstLine;
}

function parseMap(reader: Reader, indent: number, target: YamlMap): YamlMap {
  const { lines } = reader;
  while (reader.at < lines.length) {
    const line = lines[reader.at];
    if (!meaningful(line)) {
      reader.at++;
      continue;
    }
    const ind = indentOf(line);
    if (ind < indent) return target;
    if (ind > indent) throw new Error(`yaml-lite: unexpected indent at line ${lineNumber(reader)}: ${line}`);
    const m = line.trim().match(KEY_LINE);
    if (!m) throw new Error(`yaml-lite: expected "key: value" at line ${lineNumber(reader)}: ${line}`);
    const [, key, rest = ""] = m;
    const keyLine = lineNumber(reader);
    reader.at++;
    if (uncommented(rest) !== "") {
      target[key] = readValue(rest, keyLine);
      continue;
    }
    // block value: look at the next meaningful line
    let j = reader.at;
    while (j < lines.length && !meaningful(lines[j])) j++;
    if (j >= lines.length || indentOf(lines[j]) <= indent) {
      target[key] = null;
      continue;
    }
    const childIndent = indentOf(lines[j]);
    target[key] = lines[j].trim().startsWith("- ") ? parseList(reader, childIndent) : parseMap(reader, childIndent, {});
  }
  return target;
}

function parseList(reader: Reader, indent: number): YamlValue[] {
  const { lines } = reader;
  const out: YamlValue[] = [];
  while (reader.at < lines.length) {
    const line = lines[reader.at];
    if (!meaningful(line)) {
      reader.at++;
      continue;
    }
    const ind = indentOf(line);
    if (ind < indent) return out;
    if (ind > indent || !line.trim().startsWith("- ")) throw new Error(`yaml-lite: expected list item at line ${lineNumber(reader)}: ${line}`);
    const body = line.trim().slice(2);
    if (!KEY_LINE.test(body)) {
      out.push(readValue(body, lineNumber(reader)));
      reader.at++;
      continue;
    }
    // map item: rewrite the first line as an indented key so parseMap can consume the block
    const itemIndent = indent + 2;
    lines[reader.at] = " ".repeat(itemIndent) + body;
    out.push(parseMap(reader, itemIndent, {}));
  }
  return out;
}

export function parse(text: string, firstLine = 1): YamlMap {
  const reader: Reader = { lines: text.replace(/\r\n/g, "\n").split("\n"), at: 0, firstLine };
  return parseMap(reader, 0, {});
}

export function stringify(obj: YamlMap, indent = 0): string {
  const pad = " ".repeat(indent);
  const lines: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      if (value.length === 0) lines.push(`${pad}${key}: []`);
      else if (value.every((v) => v === null || typeof v !== "object")) lines.push(`${pad}${key}: [${(value as YamlScalar[]).map(fmtScalar).join(", ")}]`);
      else {
        lines.push(`${pad}${key}:`);
        for (const item of value) {
          const inner = stringify(item as YamlMap, indent + 4).split("\n");
          lines.push(`${pad}  - ${inner[0].trimStart()}`);
          for (const l of inner.slice(1)) lines.push(l);
        }
      }
    } else if (value !== null && typeof value === "object") {
      lines.push(`${pad}${key}:`);
      lines.push(stringify(value, indent + 2));
    } else lines.push(`${pad}${key}: ${fmtScalar(value)}`);
  }
  return lines.join("\n");
}

function fmtScalar(v: YamlScalar): string {
  if (v === null) return "null";
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  const s = String(v);
  return /^[A-Za-z0-9_./:@+-][^#\[\],]*$/.test(s) && !/^(true|false|null|~|-?\d+(\.\d+)?)$/.test(s) && !/:\s/.test(s) ? s : JSON.stringify(s);
}

/** Splits `---\nyaml\n---\nbody` into { front, body }. Files without frontmatter return front = {}. */
export function frontmatter(text: string): { front: YamlMap; body: string } {
  const m = text.replace(/\r\n/g, "\n").match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { front: {}, body: text };
  return { front: parse(m[1], 2), body: m[2] };
}
