import { bareAgentName } from "../../../shared/agent-name.mts";
import { loadExtensions } from "../../../shared/extensions.mjs";
import type { HookContext, HookSpec, PayloadOf } from "../../hook-spec.mts";
import { context, type ContextOutput } from "../../output.mts";

type InjectEvent = "SessionStart" | "SubagentStart";
type ExtensionFile = { text: string };
type Extension = { name: string; version: string; rules: ExtensionFile[]; agents: Record<string, ExtensionFile[]> };
type ExtensionReport = { enabled: Extension[]; refused: { name: string; reason: string }[] };
type NamedBlock = { name: string; text: string };

export const EXTENSION_CHARS = 10_000;

function roleOf(event: PayloadOf<InjectEvent>): string | null {
  return event.hook_event_name === "SessionStart" ? "lead" : bareAgentName(event.agent_type);
}

function blockFor(extension: Extension, role: string | null): string {
  const texts = [...extension.rules, ...(role === null ? [] : (extension.agents[role] ?? []))].map((file) => file.text.replace(/\r\n/g, "\n").trim());
  return [`## Extension ${extension.name} ${extension.version}`, ...texts].join("\n\n");
}

function fitBlocks(blocks: NamedBlock[], reserved: number): { kept: string[]; left: string[] } {
  const kept: string[] = [];
  const left: string[] = [];
  let used = reserved;
  for (const { name, text } of blocks) {
    const cost = text.length + (kept.length ? 2 : 0);
    if (left.length === 0 && used + cost <= EXTENSION_CHARS) {
      kept.push(text);
      used += cost;
    } else left.push(name);
  }
  return { kept, left };
}

function leftOutLine(names: string[]): string {
  return `Extensions left out, over the ${EXTENSION_CHARS}-character limit: ${names.join(", ")}`;
}

export function extensionContext(report: ExtensionReport, role: string | null): string | null {
  const refusals = report.refused.map((r) => `Extension ${r.name} refused: ${r.reason}`);
  const blocks = report.enabled.map((e) => ({ name: e.name, text: blockFor(e, role) }));
  const refusalText = refusals.join("\n");
  const allNames = blocks.map((b) => b.name);
  const reserved = refusalText.length + (refusalText ? 2 : 0) + (allNames.length ? leftOutLine(allNames).length + 2 : 0);
  const { kept, left } = fitBlocks(blocks, reserved);
  const parts = [...kept, ...(refusalText ? [refusalText] : []), ...(left.length ? [leftOutLine(left)] : [])];
  return parts.length ? parts.join("\n\n") : null;
}

export function injectExtensions(event: PayloadOf<InjectEvent>, { root }: HookContext): ContextOutput | null {
  const report: ExtensionReport = loadExtensions(root);
  if (!report.enabled.length && !report.refused.length) return null;
  const text = extensionContext(report, roleOf(event));
  return text ? context(event.hook_event_name, text) : null;
}

export const hook: HookSpec<InjectEvent> = {
  handler: async (event, ctx) => injectExtensions(event, ctx),
  onBadInput: "empty",
};
