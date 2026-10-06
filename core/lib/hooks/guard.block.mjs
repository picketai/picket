import { readTurn, blockLines } from "../transcript.mjs";
import { VERDICTS } from "../route.mjs";

const CONTRACT = /^##\s+(Phase\s+\d+\s+of\s+[a-z0-9-]+|Review:\s+[a-z0-9-]+|(Order|Design|Amendment):\s+[a-z0-9-]+|Report:\s+[a-z0-9-]+)/m;
const BUDGET = 40;
const FINDING_LINE = /^- \[(Critical|Major|Minor|Nit)\]/;

function turnText(event) {
  try {
    return readTurn(event, { includeToolPayloads: true }).text ?? "";
  } catch {
    return "";
  }
}

function blockProblems(block) {
  const { nonEmpty, last } = blockLines(block);
  const problems = [];
  const token = Object.keys(VERDICTS).find((k) => last.replace(/\s+/g, " ") === k);
  if (!token) problems.push(`the last line must be exactly one verdict token (${Object.keys(VERDICTS).join(", ")}); it is "${last.slice(0, 60)}"`);
  const counted = nonEmpty.filter((l) => !FINDING_LINE.test(l.trim())).length;
  if (counted > BUDGET) problems.push(`the block is ${counted} non-empty lines; the budget is ${BUDGET}. Move detail into the artifact and keep the block to its fields`);
  return problems;
}

export function guardBlock(event) {
  if (event.stop_hook_active) return null;
  const text = turnText(event);
  const m = text.match(CONTRACT);
  if (!m) return null;
  const problems = blockProblems(text.slice(m.index));
  return problems.length ? { decision: "block", reason: `guard.block: ${problems.join(". ")}. Re-emit the block only.` } : null;
}
