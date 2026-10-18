import { readArtifact } from "./work.mjs";
import { securityPaths } from "./config.mjs";

export function ownGate(id, n, root) {
  const art = readArtifact(id, root);
  const entry = phaseEntry(art.front, n);
  const section = phaseSection(art.body, n);

  const securePath = firstSecurityPath([...entryFiles(entry), ...touchSetPaths(section)], root);
  if (securePath) return { kind: "security_path", reason: `touches a security path (${securePath})` };
  if (isMarkedSecure(entry)) return { kind: "security_mark", reason: "is marked security-sensitive in the record" };
  if (/\[IRREVERSIBLE\]/.test(withoutCode(section))) return { kind: "irreversible", reason: "carries an irreversible step" };
  return null;
}

const FENCED_BLOCK = /^(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1[^\n]*$/gm;
const INLINE_CODE = /(`+)[\s\S]*?\1/g;

function withoutCode(section) {
  return section.replace(FENCED_BLOCK, "").replace(INLINE_CODE, "");
}

export function phasePaths(id, n, root) {
  const art = readArtifact(id, root);
  return [...new Set([...entryFiles(phaseEntry(art.front, n)), ...touchSetPaths(phaseSection(art.body, n))])];
}

function phaseEntry(front, n) {
  const phases = Array.isArray(front?.phases) ? front.phases : [];
  return phases.find((p) => Number(p?.n) === Number(n)) ?? null;
}

function entryFiles(entry) {
  return Array.isArray(entry?.files) ? entry.files.map(String) : [];
}

function isMarkedSecure(entry) {
  return entry != null && Object.hasOwn(entry, "security") && entry.security !== false;
}

function phaseSection(body, n) {
  const re = new RegExp(`^## Phase ${Number(n)}\\b[^\\n]*\\n([\\s\\S]*?)(?=^## |(?![\\s\\S]))`, "m");
  return String(body ?? "").match(re)?.[1] ?? "";
}

function touchSetPaths(section) {
  const block = section.match(/^\*\*Touch set:\*\*[^\n]*\n([\s\S]*?)(?=^\*\*|(?![\s\S]))/m)?.[1] ?? "";
  return block
    .split(/\r?\n/)
    .filter((line) => line.startsWith("- "))
    .map((line) => line.match(/`([^`]+)`/)?.[1])
    .filter(Boolean);
}

function firstSecurityPath(paths, root) {
  const prefixes = securityPaths(root).map(asPrefix);
  return paths.find((p) => prefixes.some((prefix) => normalise(p).startsWith(prefix))) ?? null;
}

function asPrefix(configured) {
  return normalise(configured).replace(/\*\*$/, "").replace(/\/?$/, "/");
}

function normalise(path) {
  return String(path).replace(/\\/g, "/");
}
