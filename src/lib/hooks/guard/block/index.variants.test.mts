import { agentBlocks, BLOCK_PROBLEM_SEEDS, blockedKindSeed, blockRole, closureTests, loadGuard, loadedExport, tableRows, verdictSeed } from "#test/variants.mts";
import { guardBlock } from "./index.mts";

const verdicts = await loadGuard(() => import("../../../shared/verdicts.mjs"), "src/lib/shared/verdicts.mjs");
const block = await loadGuard(() => import("./index.mts"), "src/lib/hooks/guard/block/index.mts");

const VERDICT_AGENTS: Record<string, { agent: string }> = loadedExport(verdicts, "VERDICTS");

function bounced(text: string): boolean {
  const event = { hook_event_name: "SubagentStop", agent_type: `abcd-${blockRole(text)}`, last_assistant_message: text } as Parameters<typeof guardBlock>[0];
  return guardBlock(event)?.decision === "block";
}

closureTests({
  guard: "guard.block",
  grammar: agentBlocks,
  seeds: BLOCK_PROBLEM_SEEDS,
  rows: [
    { table: tableRows(verdicts, "VERDICTS"), key: (token: string) => token, seedsOf: (token: string) => verdictSeed(token, VERDICT_AGENTS[token].agent) },
    { table: tableRows(block, "BLOCKED_KINDS"), key: (kind: string) => kind, seedsOf: blockedKindSeed },
  ],
  run: bounced,
  closed: (isBounced) => isBounced,
});
