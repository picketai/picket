import { agentBlocks, BLOCK_PROBLEM_SEEDS, blockedKindSeed, blockRole, closureTests, loadGuard, loadedExport, tableRows, verdictSeed, type BlockSeed } from "#test/variants.mts";
import { guardBlock } from "./index.mts";

const verdicts = await loadGuard(() => import("../../../shared/verdicts.mjs"), "src/lib/shared/verdicts.mjs");
const block = await loadGuard(() => import("./index.mts"), "src/lib/hooks/guard/block/index.mts");

const VERDICT_AGENTS: Record<string, { agent: string }> = loadedExport(verdicts, "VERDICTS");

const TEST_HEADING = "## Test: 20261116-x · round 1";
const TESTER_SEEDS: BlockSeed[] = [
  { role: "tester", lines: [TEST_HEADING, "", "Report: work/20261116-x/test.md", "", "PHASE DONE"] },
  { role: "tester", lines: [TEST_HEADING, "", "Report: work/20261116-x/test.md", "", "ALIGNED"] },
];

function roleOf(text: string): string {
  return text.startsWith(TEST_HEADING) ? "tester" : blockRole(text);
}

function bounced(text: string): boolean {
  const event = { hook_event_name: "SubagentStop", agent_type: `abcd-${roleOf(text)}`, last_assistant_message: text } as Parameters<typeof guardBlock>[0];
  return guardBlock(event)?.decision === "block";
}

closureTests({
  guard: "guard.block",
  grammar: agentBlocks,
  seeds: [...BLOCK_PROBLEM_SEEDS, ...TESTER_SEEDS],
  rows: [
    { table: tableRows(verdicts, "VERDICTS"), key: (token: string) => token, seedsOf: (token: string) => verdictSeed(token, VERDICT_AGENTS[token].agent) },
    { table: tableRows(verdicts, "TESTER_VERDICTS"), key: (token: string) => token, seedsOf: (token: string) => verdictSeed(token, "tester") },
    { table: tableRows(block, "BLOCKED_KINDS"), key: (kind: string) => kind, seedsOf: blockedKindSeed },
  ],
  run: bounced,
  closed: (isBounced) => isBounced,
});
