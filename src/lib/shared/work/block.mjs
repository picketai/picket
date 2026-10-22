import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { projectRoot, workDir } from "./work.mjs";

const PATH_TOKEN = /^[\w.@\-\/\\]*\.[A-Za-z0-9]+$/;
const FIELD_LABEL = String.raw`Root cause|[A-Z][a-z]+`;
const FIELD_START = new RegExp(`^(${FIELD_LABEL}):\\s`);
const FIELD_LINE = new RegExp(`^(${FIELD_LABEL}):\\s*(.*)$`);

export function blockPath(id, n, root = projectRoot()) {
  return join(workDir(id, root), "phases", `${n}.block.md`);
}

export function saveBlock(id, n, text, root = projectRoot()) {
  mkdirSync(join(workDir(id, root), "phases"), { recursive: true });
  writeFileSync(blockPath(id, n, root), text.replace(/\r\n/g, "\n").trim() + "\n");
}

export function readBlock(id, n, root = projectRoot()) {
  const p = blockPath(id, n, root);
  return existsSync(p) ? readFileSync(p, "utf8") : null;
}

export function blockFiles(id, n, root = projectRoot()) {
  const files = parseBlock(readBlock(id, n, root) ?? "").fields.files ?? "";
  return files.split(/[\s,():]+/).filter((token) => PATH_TOKEN.test(token));
}

export function parseBlock(text) {
  const lines = String(text ?? "").replace(/\r\n/g, "\n").split("\n");
  const out = { title: null, headline: "", fields: {}, verdict: null };
  let i = 0;
  while (i < lines.length && !/^## /.test(lines[i])) i++;
  if (i < lines.length) {
    out.title = lines[i].replace(/^## /, "").trim();
    i++;
  }
  while (i < lines.length && !lines[i].trim()) i++;
  const para = [];
  while (i < lines.length && lines[i].trim() && !FIELD_START.test(lines[i])) para.push(lines[i].trim()), i++;
  out.headline = para.join(" ");
  for (; i < lines.length; i++) {
    const m = lines[i].match(FIELD_LINE);
    if (m) out.fields[m[1].toLowerCase()] = m[2].trim();
  }
  const last = lines.filter((l) => l.trim()).at(-1)?.trim() ?? "";
  if (/^(PHASE DONE|PHASE STALLED)$/.test(last)) out.verdict = last;
  return out;
}
