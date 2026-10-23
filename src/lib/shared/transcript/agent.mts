import { existsSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { bareAgentName } from "../agent-name.mts";
import { tailText } from "./tail.mts";

export type HookData = Record<string, unknown> | null | undefined;

const NAME_BYTES = 256 * 1024;
const AGENT_TYPE = /"agent_type"\s*:\s*"([a-z-]+(?::[a-z-]+)?)"/;
const SUBAGENT_TYPE = /"subagent_type"\s*:\s*"([a-z-]+(?::[a-z-]+)?)"/;

function stringField(data: HookData, key: string): string | null {
  const value = data?.[key];
  return typeof value === "string" ? value : null;
}

export function agentTranscript(data: HookData): string | null {
  const main = stringField(data, "transcript_path");
  const own = stringField(data, "agent_transcript_path");
  if (own && existsSync(own)) return own;
  if (data?.agent_id && main) {
    const p = join(dirname(main), basename(main, ".jsonl"), "subagents", `agent-${data.agent_id}.jsonl`);
    if (existsSync(p)) return p;
  }
  return main;
}

export function isSubagentTurn(data: HookData): boolean {
  return data?.hook_event_name === "SubagentStop" || Boolean(data?.agent_id);
}

export function agentName(data: HookData, path: string | null | undefined): string | null {
  if (data?.agent_type) return bareAgentName(String(data.agent_type));
  if (data?.agent_name) return bareAgentName(String(data.agent_name));
  if (data?.hook_event_name === "Stop" && !data?.agent_id) return "lead";
  const text = tailText(path, NAME_BYTES);
  const m = text.match(AGENT_TYPE) ?? text.match(SUBAGENT_TYPE);
  if (m) return bareAgentName(m[1]);
  return data?.hook_event_name === "SubagentStop" ? "subagent" : "lead";
}
