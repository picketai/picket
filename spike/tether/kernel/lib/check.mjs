// harness check: run the project's test and lint (and build, on request) commands, log each to
// .claude/ledger/check-<name>.log, and print the tail only when a step fails. One allow-listed
// command replaces `npm test > log 2>&1; echo $?; tail log`, a shape that costs a permission
// prompt every time, and it stops at the first failing step.
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { projectRoot } from "./work.mjs";
import { detectTooling } from "./preflight.mjs";
import { assertNotDestructive } from "./unsafe.mjs";

const ORDER = ["test", "lint", "build"];

/**
 * @param {object} o
 * @param {string[]} [o.steps]   subset of test, lint, build; default test and lint
 * @param {string} [o.only]      run this one command instead of the detected ones
 * @param {number} [o.timeoutMs] per step, default 300000
 * @param {string} [o.root]
 */
export function check(o = {}) {
  const root = o.root ?? projectRoot();
  const tooling = detectTooling(root);
  const wanted = o.steps?.length ? o.steps : ["test", "lint"];
  if (o.only) assertNotDestructive(o.only, "harness check --only");
  const plan = o.only ? [{ name: "command", command: o.only }] : ORDER.filter((s) => wanted.includes(s)).map((s) => ({ name: s, command: tooling[s] }));
  const dir = join(root, ".claude", "ledger");
  mkdirSync(dir, { recursive: true });
  const steps = [];
  let ok = true;
  for (const step of plan) {
    if (!step.command) {
      steps.push({ name: step.name, command: null, status: "none detected", exit_code: null, ms: 0, log: null, tail: "" });
      continue;
    }
    const t = Date.now();
    // No CI=1: under CI, Jest refuses to write new snapshots and fails instead, so a test that passes
    // for the developer would fail here. Watch-mode runners are the project's problem, not ours.
    const r = spawnSync(step.command, { cwd: root, shell: true, encoding: "utf8", timeout: Number(o.timeoutMs ?? 300_000), windowsHide: true });
    const out = `${r.stdout ?? ""}${r.stderr ?? ""}`;
    const log = join(dir, `check-${step.name}.log`);
    writeFileSync(log, out);
    const code = r.status ?? (r.error ? 1 : 0);
    const passed = code === 0;
    steps.push({
      name: step.name,
      command: step.command,
      status: passed ? "passed" : r.error?.code === "ETIMEDOUT" ? "timed out" : "failed",
      exit_code: code,
      ms: Date.now() - t,
      log: `.claude/ledger/check-${step.name}.log`,
      tail: passed ? "" : out.trim().split(/\r?\n/).slice(-30).join("\n"),
    });
    if (!passed) {
      ok = false;
      break; // fail fast: the first red step is the one to fix
    }
  }
  return { ok, steps, skipped: plan.slice(steps.length).map((s) => s.name) };
}

export function renderCheck(v) {
  const lines = v.steps.map((s) => `${s.name}: ${s.status}${s.command ? ` · ${s.command}` : ""}${s.ms ? ` · ${(s.ms / 1000).toFixed(1)} s` : ""}`);
  for (const s of v.steps) if (s.tail) lines.push(`--- ${s.log} (last lines)`, s.tail);
  if (v.skipped.length) lines.push(`not run: ${v.skipped.join(", ")}`);
  lines.push(v.ok ? "CHECK OK" : "CHECK FAILED");
  return lines.join("\n");
}
