import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { installedAt, sha256File } from "../manifest.mjs";

function eolOf(text) {
  return text.includes("\r\n") ? "\r\n" : "\n";
}

function isHeader(line) {
  return /^\s*\[.*\]\s*$/.test(line);
}

function sectionSpan(lines, section) {
  const start = lines.findIndex((line) => line.trim() === `[${section}]`);
  if (start === -1) return null;
  const next = lines.findIndex((line, i) => i > start && isHeader(line));
  return { start, end: next === -1 ? lines.length : next };
}

function keyIndex(lines, span, key) {
  for (let i = span.start + 1; i < span.end; i++) {
    if (lines[i].split("=")[0].trim() === key && lines[i].includes("=")) return i;
  }
  return -1;
}

export function getKey(text, section, key) {
  const lines = text.split(/\r?\n/);
  const span = sectionSpan(lines, section);
  const at = span === null ? -1 : keyIndex(lines, span, key);
  return at === -1 ? undefined : lines[at].slice(lines[at].indexOf("=") + 1);
}

export function setKey(text, section, key, value) {
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

export function removeKey(text, section, key) {
  const lines = text.split(/\r?\n/);
  const span = sectionSpan(lines, section);
  const at = span === null ? -1 : keyIndex(lines, span, key);
  if (at === -1) return text;
  lines.splice(at, 1);
  return lines.join(eolOf(text));
}

export function renderIni(sections) {
  return sections.map(([name, entries]) => [`[${name}]`, ...entries.map(([key, value]) => `${key}=${value}`)].join("\n")).join("\n\n") + "\n";
}

export function keyfileChange({ id, path, content, writer }) {
  const current = existsSync(path) ? readFileSync(path, "utf8") : null;
  if (current === content) return [];
  return [
    {
      id,
      summary: `write ${path}`,
      ...(current === null ? {} : { question: `Replace ${path}?` }),
      restart: null,
      apply(host, backup) {
        const backupPath = current === null ? undefined : backup(path);
        mkdirSync(dirname(path), { recursive: true });
        writeFileSync(path, content);
        return {
          id,
          component: "terminal",
          kind: current === null ? "created" : "edited",
          path,
          ...(backupPath ? { backup: backupPath } : {}),
          sha256: sha256File(path),
          previous: {},
          data: { writer, part: "file" },
          installedAt: installedAt(host),
        };
      },
    },
  ];
}

export function keptFile(item) {
  return { result: "kept", detail: "changed after setup", manual: `remove ${item.path} by hand if you no longer want it` };
}
