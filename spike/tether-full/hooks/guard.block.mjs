#!/usr/bin/env node
// Stop + SubagentStop: a turn that opened a contract block must close it with an exact verdict
// token on its last line, and the block must stay within its line budget. Bounces the turn with
// the reason otherwise. Only turns that carry a contract heading are judged.
import { readFileSync } from "node:fs";
import { readTurn, blockLines } from "./lib/transcript.mjs";
import { VERDICTS } from "../lib/route.mjs";

const CONTRACT = /^##\s+(Phase\s+\d+\s+of\s+[a-z0-9-]+|Review:\s+[a-z0-9-]+|(Order|Design|Amendment):\s+[a-z0-9-]+|Report:\s+[a-z0-9-]+)/m;
const BUDGET = 40; // non-empty lines from the heading to the token; findings lines are exempt

let data;
try {
  data = JSON.parse(readFileSync(0, "utf8"));
} catch {
  process.exit(0);
}
if (data.stop_hook_active) process.exit(0);

let text = "";
try {
  text = readTurn(data, { includeToolPayloads: true }).text ?? "";
} catch {
  process.exit(0);
}
const m = text.match(CONTRACT);
if (!m) process.exit(0);

const { nonEmpty, last } = blockLines(text.slice(m.index));
const token = Object.keys(VERDICTS).find((k) => last.replace(/\s+/g, " ") === k);
const problems = [];
if (!token) problems.push(`the last line must be exactly one verdict token (${Object.keys(VERDICTS).join(", ")}); it is "${last.slice(0, 60)}"`);
const counted = nonEmpty.filter((l) => !/^- \[(Critical|Major|Minor|Nit)\]/.test(l.trim())).length;
if (counted > BUDGET) problems.push(`the block is ${counted} non-empty lines; the budget is ${BUDGET}. Move detail into the artifact and keep the block to its fields`);

if (problems.length) {
  process.stdout.write(JSON.stringify({ decision: "block", reason: `guard.block: ${problems.join(". ")}. Re-emit the block only.` }));
  process.exit(0);
}
process.exit(0);
