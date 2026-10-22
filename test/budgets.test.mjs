// Static prompt budgets. Every byte under .claude/ that is loaded into a model's context is paid on
// every turn or every spawn, so the caps are enforced here rather than remembered. Raising a cap
// needs a one-line rationale next to the number.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { joinedRules } from "../dist/lib/hooks/inject.rules.mjs";
import { skillDescriptions } from "./skills/routing.mjs";

const ROOT = resolve(".");
const BUDGETS = {
  claude_md_bytes: 2048, // loaded on every turn of every session and every spawn
  agent_lines: 120, // agent shells: identity, constraints, dispatch; procedure lives in step files
  skill_lines: 150, // SKILL.md: description, when, steps index; detail lives in steps/ and templates/
  step_lines: 80, // one step file is one screen
  rule_lines: 60,
  hook_cold_ms: 200, // a hook runs on every matching tool call
  inject_chars: 10000,
};

const RULE_FOLDERS = [join(ROOT, ".claude", "rules"), join(ROOT, "src", "rules")];

function lines(p) {
  return readFileSync(p, "utf8").split(/\r?\n/).length;
}
function walk(dir, pred) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p, pred));
    else if (pred(p)) out.push(p);
  }
  return out;
}
const rel = (p) => p.slice(ROOT.length + 1).replaceAll("\\", "/");

test("CLAUDE.md stays under the always-on budget", { skip: !existsSync(join(ROOT, ".claude", "rules")) && "phase 2 not landed" }, () => {
  const size = statSync(join(ROOT, "CLAUDE.md")).size;
  assert.ok(size <= BUDGETS.claude_md_bytes, `CLAUDE.md is ${size} bytes, budget ${BUDGETS.claude_md_bytes}`);
});

test("agent shells, skills, step files and rules stay within their line budgets", { skip: !existsSync(join(ROOT, ".claude", "rules")) && "phase 2 not landed" }, () => {
  const over = [];
  for (const p of walk(join(ROOT, "src", "agents"), (f) => f.endsWith(".md"))) if (lines(p) > BUDGETS.agent_lines) over.push(`${rel(p)}: ${lines(p)} > ${BUDGETS.agent_lines}`);
  for (const p of walk(join(ROOT, "src", "skills"), (f) => f.endsWith("SKILL.md"))) if (lines(p) > BUDGETS.skill_lines) over.push(`${rel(p)}: ${lines(p)} > ${BUDGETS.skill_lines}`);
  for (const p of walk(join(ROOT, "src", "skills"), (f) => /[\\/]steps[\\/].*\.md$/.test(f))) if (lines(p) > BUDGETS.step_lines) over.push(`${rel(p)}: ${lines(p)} > ${BUDGETS.step_lines}`);
  for (const p of RULE_FOLDERS.flatMap((dir) => walk(dir, (f) => f.endsWith(".md")))) if (lines(p) > BUDGETS.rule_lines) over.push(`${rel(p)}: ${lines(p)} > ${BUDGETS.rule_lines}`);
  assert.deepEqual(over, []);
});

test("every skill has a description with a 'Use when' trigger and one declared route", { skip: !existsSync(join(ROOT, ".claude", "rules")) && "phase 2 not landed" }, () => {
  const problems = [];
  for (const { path: p, description: desc } of skillDescriptions(ROOT)) {
    if (desc === null) {
      problems.push(`${rel(p)}: no frontmatter`);
      continue;
    }
    if (!/use when/i.test(desc)) problems.push(`${rel(p)}: description lacks "Use when"`);
    if (desc.length > 1024) problems.push(`${rel(p)}: description ${desc.length} chars > 1024`);
  }
  assert.deepEqual(problems, []);
});

test("hooks start cold under the budget", { skip: !existsSync(join(ROOT, "dist", "hooks", "route.verdict.mjs")) && "phase 3 not landed" }, () => {
  const slow = [];
  // Best of three: the budget is the hook's own start-up, not the machine's load while the other
  // test files run in parallel (a single start measured 180 ms alone and 260 ms inside npm test).
  for (const p of walk(join(ROOT, "dist", "hooks"), (f) => f.endsWith(".mjs"))) {
    let best = Infinity;
    for (let i = 0; i < 3; i++) {
      const t0 = Date.now();
      try {
        execFileSync("node", [p], { input: "{}", stdio: ["pipe", "ignore", "ignore"], timeout: 5000, env: { ...process.env, CLAUDE_PROJECT_DIR: ROOT } });
      } catch {}
      best = Math.min(best, Date.now() - t0);
    }
    if (best > BUDGETS.hook_cold_ms) slow.push(`${rel(p)}: ${best} ms`);
  }
  assert.deepEqual(slow, []);
});

function injectionOverBudget(text) {
  return text.length > BUDGETS.inject_chars ? `${text.length} chars > ${BUDGETS.inject_chars}` : null;
}

test("the injected rule text fits one hook's additionalContext limit", () => {
  const text = joinedRules();
  assert.ok(text, "dist/rules holds no injected rule");
  assert.equal(injectionOverBudget(text), null);
});

test("the injection budget check flags text past the limit", () => {
  assert.equal(injectionOverBudget("x".repeat(BUDGETS.inject_chars)), null);
  assert.equal(injectionOverBudget("x".repeat(BUDGETS.inject_chars + 1)), `${BUDGETS.inject_chars + 1} chars > ${BUDGETS.inject_chars}`);
});

test("inject.extensions starts cold under the budget with three extensions enabled", () => {
  const root = mkdtempSync(join(tmpdir(), "picket-ext-budget-"));
  try {
    const names = ["acme", "local", "team"];
    mkdirSync(join(root, ".picket", "extensions"), { recursive: true });
    writeFileSync(join(root, ".picket", "config.json"), JSON.stringify({ version: 1, extensions: names }));
    for (const name of names) {
      const dir = join(root, ".picket", "extensions", name);
      mkdirSync(dir);
      writeFileSync(join(dir, "rules.md"), `Rule text for ${name}.\n`);
      writeFileSync(join(dir, "reviewer.md"), `Reviewer text for ${name}.\n`);
      writeFileSync(join(dir, "extension.json"), JSON.stringify({ name, version: "0.1.0", schema: 1, rules: ["rules.md"], agents: { reviewer: ["reviewer.md"] } }));
    }
    const input = JSON.stringify({ hook_event_name: "SubagentStart", agent_type: "picket:reviewer", cwd: root });
    let best = Infinity;
    for (let i = 0; i < 3; i++) {
      const t0 = Date.now();
      execFileSync("node", [join(ROOT, "dist", "hooks", "inject.extensions.mjs")], { input, stdio: ["pipe", "ignore", "ignore"], timeout: 5000, env: { ...process.env, CLAUDE_PROJECT_DIR: root } });
      best = Math.min(best, Date.now() - t0);
    }
    assert.ok(best <= BUDGETS.hook_cold_ms, `inject.extensions with three extensions: ${best} ms`);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
