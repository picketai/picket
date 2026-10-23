import { readFileSync } from "node:fs";
import { bareAgentName } from "../shared/agent-name.mjs";
import { appendLedger } from "../shared/ledger.mjs";
import { checkNodeFloor } from "../util/node-floor.mjs";
import { projectRoot } from "../shared/paths.mjs";

const REASON_LIMIT = 300;

function readEvent(onBadInput) {
  try {
    return JSON.parse(readFileSync(0, "utf8"));
  } catch {
    return onBadInput === "empty" ? {} : null;
  }
}

async function handle(handler, event, root) {
  try {
    return await handler(event, { root });
  } catch {
    return null;
  }
}

function denialOf(output) {
  if (output?.hookSpecificOutput?.permissionDecision === "deny") return { event: "block", reason: output.hookSpecificOutput.permissionDecisionReason };
  if (output?.decision === "block") return { event: "bounce", reason: output.reason };
  return null;
}

function hookName(handler) {
  return handler.name.replace(/^([a-z]+)([A-Z])/, (_, kind, first) => `${kind}.${first.toLowerCase()}`);
}

async function recordDenial(handler, root, event, output) {
  const denial = denialOf(output);
  if (denial === null) return;
  try {
    const { currentItem } = await import("../shared/work/state.mjs");
    const session = event.session_id ?? null;
    appendLedger(root, {
      event: denial.event,
      session,
      agent: bareAgentName(event.agent_type) ?? "lead",
      hook: hookName(handler),
      work_id: currentItem(root, { session })?.id ?? null,
      reason: String(denial.reason ?? "").slice(0, REASON_LIMIT),
    }, new Date());
  } catch {}
}

export async function runHook(handler, { onBadInput = "exit" } = {}) {
  const refusal = checkNodeFloor(process.versions.node);
  if (refusal) {
    process.stderr.write(`${refusal}\n`);
    process.exit(0);
  }
  const event = readEvent(onBadInput);
  const root = event ? projectRoot(event.cwd) : null;
  const output = event ? await handle(handler, event, root) : null;
  if (output) {
    process.stdout.write(JSON.stringify(output));
    await recordDenial(handler, root, event, output);
  }
  process.exit(0);
}
