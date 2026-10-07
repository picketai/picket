import { test } from "node:test";
import assert from "node:assert/strict";
import * as trunk from "../adapters/trunk.mjs";
import * as plugin from "../adapters/plugin.mjs";
import { laneMatches } from "../lib/lanes.mjs";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

test("a plugin install holds only what a project carries: CLAUDE.md, config, work/ and hookless settings", () => {
  const repo = mkdtempSync(join(tmpdir(), "bench-install-"));
  try {
    plugin.install(repo, resolve("."));
    for (const path of ["CLAUDE.md", ".tether/config.json", "work"]) assert.ok(existsSync(join(repo, path)), path);
    const settings = JSON.parse(readFileSync(join(repo, ".claude", "settings.json"), "utf8"));
    assert.equal("hooks" in settings, false);
    assert.equal(settings.outputStyle, "tether:custom");
    for (const path of [".claude/rules", ".claude/skills", "core"]) assert.equal(existsSync(join(repo, path)), false, path);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test("a plugin install refuses a root without the plugin manifest", () => {
  const root = mkdtempSync(join(tmpdir(), "bench-root-"));
  const repo = mkdtempSync(join(tmpdir(), "bench-install-"));
  try {
    assert.throws(() => plugin.install(repo, root), /no plugin manifest/);
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(repo, { recursive: true, force: true });
  }
});

test("the plugin loads from core/ and may call the tether CLI", () => {
  assert.equal(plugin.pluginDir(resolve(".")), join(resolve("."), "core"));
  assert.ok(plugin.allowedTools.includes("Bash(tether *)"));
});

test("only harness-authoring is repository-only", () => {
  const hostDir = resolve(".claude");
  assert.equal(plugin.isRepositoryOnly(join(hostDir, "rules", "harness-authoring.md"), hostDir), true);
  assert.equal(plugin.isRepositoryOnly(join(hostDir, "rules", "prose.md"), hostDir), false);
  assert.equal(plugin.isRepositoryOnly(join(hostDir, "rules"), hostDir), false);
  if (process.platform === "win32") assert.equal(plugin.isRepositoryOnly(`\\\\?\\${join(hostDir, "rules", "harness-authoring.md")}`, hostDir), true, "cpSync's long-path form");
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

test("plugin gate detection reads bracket options and lane headings", () => {
  const packet = "▶ 20260907-csv · phase 1/3 done · CSV module in place\nTests: passed · Lint: passed · Verified: curl → header row\nFiles: src/http/csv.ts\n[a] approve · [r] run through 3 · [x] reject: <why>";
  assert.deepEqual(plugin.gate(packet, {}), { isGate: true, kind: "approval", reply: "r 3" });
  assert.deepEqual(plugin.gate(packet.replace(" · [r] run through 3", ""), {}), { isGate: true, kind: "approval", reply: "a" });
  assert.equal(plugin.gate("## Order closed: 20260907-csv\n\nShipped.\nPhases: 3 · review: APPROVED", {}).isGate, false);
  const s = plugin.signals(["## Expedited: 20260907-fix\n\nDone."], { subagents: 0 });
  assert.equal(s.lane, "fast");
  const d = plugin.signals(["ALIGNED", "## Design closed: x\nPhases: 4 · review: APPROVED\nAPPROVED"], { subagents: 3 });
  assert.equal(d.lane, "design");
  assert.deepEqual(d.verdicts, ["ALIGNED", "APPROVED"]);
});

test("a plugin run is graded on its own lane names, like the rework runs before it", () => {
  const run = (harness, lane, lane_expected) => ({ harness, lane_expected, signals: { lane } });
  assert.equal(laneMatches(run("plugin", "order", "order")), true);
  assert.equal(laneMatches(run("plugin", "pipeline", "order")), false);
  assert.equal(laneMatches(run("rework", "design", "design")), true);
  assert.equal(laneMatches(run("trunk", "pipeline", "order")), true);
  assert.equal(laneMatches(run("trunk", "expedited", "fast")), true);
});

test("plugin signals read the research lane from the packet and closing heading the researching skill prints", () => {
  const packet = "▶ report ready · 20261007-pricing\n  An invoice total is the sum of lines.\n\n[a] accept   [d] deeper pass   [x] reject: <why>";
  const closed = "## Research closed: 20261007-pricing\n\nThe pricing chain has four steps.";
  assert.equal(plugin.signals([packet, closed], { subagents: 1 }).lane, "research");
  assert.equal(plugin.signals([closed], { subagents: 1 }).lane, "research");
  assert.equal(plugin.signals(["▶ outline ready · 20261007-pricing"], { subagents: 1 }).lane, "research");
});
