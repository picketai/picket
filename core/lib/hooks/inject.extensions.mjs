import { bareAgentName } from "../agent-name.mjs";
import { loadExtensions } from "../extensions.mjs";

export const EXTENSION_CHARS = 10_000;

function roleOf(event) {
  return event.hook_event_name === "SessionStart" ? "lead" : bareAgentName(event.agent_type);
}

function blockFor(extension, role) {
  const texts = [...extension.rules, ...(extension.agents[role] ?? [])].map((file) => file.text.replace(/\r\n/g, "\n").trim());
  return [`## Extension ${extension.name} ${extension.version}`, ...texts].join("\n\n");
}

function fitBlocks(blocks, reserved) {
  const kept = [];
  const left = [];
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

function leftOutLine(names) {
  return `Extensions left out, over the ${EXTENSION_CHARS}-character limit: ${names.join(", ")}`;
}

export function extensionContext(report, role) {
  const refusals = report.refused.map((r) => `Extension ${r.name} refused: ${r.reason}`);
  const blocks = report.enabled.map((e) => ({ name: e.name, text: blockFor(e, role) }));
  const refusalText = refusals.join("\n");
  const allNames = blocks.map((b) => b.name);
  const reserved = refusalText.length + (refusalText ? 2 : 0) + (allNames.length ? leftOutLine(allNames).length + 2 : 0);
  const { kept, left } = fitBlocks(blocks, reserved);
  const parts = [...kept, ...(refusalText ? [refusalText] : []), ...(left.length ? [leftOutLine(left)] : [])];
  return parts.length ? parts.join("\n\n") : null;
}

export function injectExtensions(event, { root }) {
  const report = loadExtensions(root);
  if (!report.enabled.length && !report.refused.length) return null;
  const additionalContext = extensionContext(report, roleOf(event));
  if (!additionalContext) return null;
  return { hookSpecificOutput: { hookEventName: event.hook_event_name, additionalContext } };
}
