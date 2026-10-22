import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { rulesDir } from "../shared/paths.mjs";

export const INJECTED_RULES = Object.freeze(["prose.md", "comments.md", "work-items.md", "security-paths.md", "untrusted.md"]);

export function joinedRules(dir = rulesDir()) {
  if (!existsSync(dir)) return null;
  const texts = INJECTED_RULES.map((file) => join(dir, file))
    .filter(existsSync)
    .map((path) => readFileSync(path, "utf8").replace(/\r\n/g, "\n").trim());
  return texts.length ? texts.join("\n\n") : null;
}

export function injectRules(event, { rules = rulesDir() } = {}) {
  const additionalContext = joinedRules(rules);
  if (!additionalContext) return null;
  return { hookSpecificOutput: { hookEventName: event.hook_event_name, additionalContext } };
}
