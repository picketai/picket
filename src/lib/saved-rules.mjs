import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { MARKER, POWERSHELL_MARKER_TEXT } from "./escalation.mjs";
import { hostPath } from "./paths.mjs";

const BASH_RULE = /^Bash(?:\((.*)\))?$/s;
const POWERSHELL_RULE = /^PowerShell(?:\((.*)\))?$/s;

export function settingsFiles(root, home) {
  return [hostPath(home, "settings.json"), hostPath(root, "settings.json"), hostPath(root, "settings.local.json")];
}

function allowRules(file) {
  try {
    const allow = JSON.parse(readFileSync(file, "utf8"))?.permissions?.allow;
    return Array.isArray(allow) ? allow.filter((rule) => typeof rule === "string") : [];
  } catch {
    return [];
  }
}

const MARKED_PREFIX = `${MARKER}=`;
const LEGACY_PREFIX_SUFFIX = ":*";

function literalPrefix(pattern) {
  if (pattern.endsWith(LEGACY_PREFIX_SUFFIX)) return pattern.slice(0, -LEGACY_PREFIX_SUFFIX.length);
  return pattern.includes("*") ? pattern.slice(0, pattern.indexOf("*")) : null;
}

export function couldMatchEscalation(rule) {
  const match = rule.trim().match(BASH_RULE);
  if (!match) return false;
  const pattern = match[1];
  if (pattern === undefined || pattern.startsWith("*") || pattern.includes(MARKER)) return true;
  const prefix = literalPrefix(pattern);
  return prefix !== null && (MARKED_PREFIX.startsWith(prefix) || prefix.startsWith(MARKED_PREFIX));
}

export function couldMatchPowerShellEscalation(rule, command) {
  const match = rule.trim().match(POWERSHELL_RULE);
  if (!match) return false;
  const pattern = match[1];
  if (pattern === undefined || pattern.startsWith("*") || pattern.includes(MARKER)) return true;
  const prefix = literalPrefix(pattern)?.toLowerCase();
  return prefix != null && [command, POWERSHELL_MARKER_TEXT].some((text) => text.toLowerCase().startsWith(prefix));
}

export function escalationAllowRules({ root, home = homedir(), tool = "Bash", command = "" }) {
  const couldMatch = tool === "PowerShell" ? (rule) => couldMatchPowerShellEscalation(rule, command) : couldMatchEscalation;
  return settingsFiles(root, home).flatMap((file) => allowRules(file).filter(couldMatch).map((rule) => ({ rule, file })));
}
