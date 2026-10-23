import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { rulesDir } from "../../../shared/paths.mts";
import type { HookContext, HookSpec, PayloadOf } from "../../hook-spec.mts";
import { context, type ContextOutput } from "../../output.mts";

type InjectEvent = "SessionStart" | "SubagentStart";

export const INJECTED_RULES = Object.freeze(["prose.md", "comments.md", "work-items.md", "security-paths.md", "untrusted.md"]);

export function joinedRules(dir: string = rulesDir()): string | null {
  if (!existsSync(dir)) return null;
  const texts = INJECTED_RULES.map((file) => join(dir, file))
    .filter(existsSync)
    .map((path) => readFileSync(path, "utf8").replace(/\r\n/g, "\n").trim());
  return texts.length ? texts.join("\n\n") : null;
}

export function injectRules(event: PayloadOf<InjectEvent>, _ctx: HookContext, rules: string = rulesDir()): ContextOutput | null {
  const text = joinedRules(rules);
  return text ? context(event.hook_event_name, text) : null;
}

export const hook: HookSpec<InjectEvent> = {
  handler: async (event, ctx) => injectRules(event, ctx),
  onBadInput: "empty",
};
