import { test } from "node:test";
import assert from "node:assert/strict";
import * as trunk from "../adapters/trunk.mjs";
import * as rework from "../adapters/rework.mjs";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const SHIPPED_RULES = ["comments.md", "prose.md", "security-paths.md", "work-items.md"];

test("a rework install holds the four shipped rules and not the repository-only harness-authoring rule", () => {
  const repo = mkdtempSync(join(tmpdir(), "bench-install-"));
  try {
    rework.install(repo, resolve("."));
    assert.deepEqual(readdirSync(join(repo, "core", "rules")).sort(), SHIPPED_RULES);
    const everyFile = readdirSync(repo, { recursive: true }).map((p) => String(p).replaceAll("\\", "/"));
    assert.deepEqual(everyFile.filter((p) => p.endsWith("harness-authoring.md")), []);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test("only harness-authoring is repository-only", () => {
  const hostDir = resolve(".claude");
  assert.equal(rework.isRepositoryOnly(join(hostDir, "rules", "harness-authoring.md"), hostDir), true);
  assert.equal(rework.isRepositoryOnly(join(hostDir, "rules", "prose.md"), hostDir), false);
  assert.equal(rework.isRepositoryOnly(join(hostDir, "rules"), hostDir), false);
  if (process.platform === "win32") assert.equal(rework.isRepositoryOnly(`\\\\?\\${join(hostDir, "rules", "harness-authoring.md")}`, hostDir), true, "cpSync's long-path form");
});

test("trunk gate detection sees the lead's own wording, not only the developer block", () => {
  const lead = "Phase 1 of the plan is complete and waiting for your `approved`. The developer's block above carries the evidence.\n\nReply `approved`, `rejected: <reason>`, or with a question.";
  assert.deepEqual(trunk.gate(lead, {}), { isGate: true, kind: "approval", reply: "approved" });
  const block = "## Phase 2 Complete — Route\n\n**Tests:** passed\n\n---\nRequesting approval from: USER\n**Run offer:** phases 3–4 are run-eligible — reply `approved through 4`";
  assert.deepEqual(trunk.gate(block, {}), { isGate: true, kind: "approval", reply: "approved through 4" });
  assert.equal(trunk.gate("## Expedited — fix\n\nDone. Files: a", {}).isGate, false);
  assert.equal(trunk.gate("## Phase 3 Stalled — cannot satisfy T-3.2", {}).isGate, false);
  assert.equal(trunk.gate("Result: ASK: which port should the server use?", { answer: "8090" }).reply, "8090");
  const prose = "Still waiting on your decision about the Phase 2 runtime drive. Nothing has changed since my last message: grant the drive, allowlist `npm start` and `curl`, or gate Phase 2 on tests alone.";
  assert.deepEqual(trunk.gate(prose, {}), { isGate: true, kind: "ask", reply: "Proceed with your recommended option; do not ask again unless blocked." });
  const irreversible = "Phase 3 is built and needs your confirmation for the one irreversible step: running the migration against the real `data/invoices.json`.\n\nReply `confirmed` (or similar, in your own words) to run it, or `stop` to leave the store as is.";
  assert.deepEqual(trunk.gate(irreversible, {}), { isGate: true, kind: "irreversible", reply: "confirmed, proceed" });
});

test("rework gate detection reads bracket options and lane headings", () => {
  const packet = "▶ 20260907-csv · phase 1/3 done · CSV module in place\nTests: passed · Lint: passed · Verified: curl → header row\nFiles: src/http/csv.ts\n[a] approve · [r] run through 3 · [x] reject: <why>";
  assert.deepEqual(rework.gate(packet, {}), { isGate: true, kind: "approval", reply: "r 3" });
  assert.deepEqual(rework.gate(packet.replace(" · [r] run through 3", ""), {}), { isGate: true, kind: "approval", reply: "a" });
  assert.equal(rework.gate("## Order closed: 20260907-csv\n\nShipped.\nPhases: 3 · review: APPROVED", {}).isGate, false);
  const s = rework.signals(["## Expedited: 20260907-fix\n\nDone."], { subagents: 0 });
  assert.equal(s.lane, "fast");
  const d = rework.signals(["ALIGNED", "## Design closed: x\nPhases: 4 · review: APPROVED\nAPPROVED"], { subagents: 3 });
  assert.equal(d.lane, "design");
  assert.deepEqual(d.verdicts, ["ALIGNED", "APPROVED"]);
});
