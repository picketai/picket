import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { MARKER } from "./escalation.mjs";
import { hostPath } from "./paths.mjs";

const BASH_RULE = /^Bash(?:\((.*)\))?$/s;

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

export function couldMatchEscalation(rule) {
  const match = rule.trim().match(BASH_RULE);
  if (!match) return false;
  const pattern = match[1];
  return pattern === undefined || pattern.startsWith("*") || pattern.includes(MARKER);
}

export function escalationAllowRules({ root, home = homedir() }) {
  return settingsFiles(root, home).flatMap((file) => allowRules(file).filter(couldMatchEscalation).map((rule) => ({ rule, file })));
}
