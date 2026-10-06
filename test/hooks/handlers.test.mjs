import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createWork } from "../../.claude/lib/work.mjs";
import { hostPath, statePath, stateRel, STATE_FILES } from "../../.claude/lib/paths.mjs";
import { emitLedger } from "../../.claude/lib/hooks/emit.ledger.mjs";
import { routeVerdict } from "../../.claude/lib/hooks/route.verdict.mjs";
import { injectState } from "../../.claude/lib/hooks/inject.state.mjs";
import { guardBash } from "../../.claude/lib/hooks/guard.bash.mjs";
import { guardScope } from "../../.claude/lib/hooks/guard.scope.mjs";
import { branchingManifestPath } from "../../.claude/lib/paths.mjs";
import { latestHints, spawnHints } from "../../.claude/lib/transcript.mjs";

const HOOKS = resolve(".claude/hooks");
const HANDLERS = resolve(".claude/lib/hooks");
const SHELLS = [
  "emit.ledger.mjs",
  "guard.bash.mjs",
  "guard.block.mjs",
  "guard.comments.mjs",
  "guard.scope.mjs",
  "inject.state.mjs",
  "lint.schema.mjs",
  "monitor.context.mjs",
  "observe.drive.mjs",
  "route.verdict.mjs",
];
const MAX_SHELL_LINES = 5;

function handlerName(shell) {
  const [kind, name] = shell.replace(/\.mjs$/, "").split(".");
  return kind + name[0].toUpperCase() + name.slice(1);
}

function project() {
  const root = mkdtempSync(join(tmpdir(), "harness-handlers-"));
  mkdirSync(hostPath(root), { recursive: true });
  return root;
}

function withProject(fn) {
  const root = project();
  try {
    fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function transcript(root, entries) {
  const path = join(root, "transcript.jsonl");
  const t0 = Date.parse("2026-09-07T10:00:00Z");
  writeFileSync(path, entries.map((e, i) => JSON.stringify({ timestamp: new Date(t0 + i * 1000).toISOString(), ...e })).join("\n") + "\n");
  return path;
}

const user = (text) => ({ type: "user", message: { role: "user", content: text } });
const assistant = (text) => ({ type: "assistant", message: { role: "assistant", model: "claude-opus-5", usage: { input_tokens: 10, output_tokens: 20, cache_read_input_tokens: 1000, cache_creation_input_tokens: 100 }, content: [{ type: "text", text }] } });

test(".claude/hooks holds the ten shells, README.md and no other file (T-7.1)", () => {
  const files = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) walk(join(dir, entry.name));
      else files.push(join(dir, entry.name).slice(HOOKS.length + 1).replaceAll("\\", "/"));
    }
  };
  walk(HOOKS);
  assert.deepEqual(files.sort(), ["README.md", ...SHELLS].sort());
});

test("every shell imports only runHook and its handler, in at most five lines (T-6.1, T-7.1)", () => {
  for (const file of SHELLS) {
    const handler = handlerName(file);
    const lines = readFileSync(join(HOOKS, file), "utf8").split(/\r?\n/).filter((l) => l.trim());
    assert.ok(lines.length <= MAX_SHELL_LINES, `${file}: ${lines.length} lines`);
    const imports = lines.filter((l) => l.startsWith("import "));
    assert.deepEqual(imports, [`import { runHook } from "../lib/hook.mjs";`, `import { ${handler} } from "../lib/hooks/${file}";`], file);
    assert.ok(lines.some((l) => l.includes(`runHook(${handler}`)), file);
  }
});

test("no handler reads stdin, writes stdout or exits the process (T-6.2)", () => {
  for (const file of readdirSync(HANDLERS).filter((f) => f.endsWith(".mjs"))) {
    const code = readFileSync(join(HANDLERS, file), "utf8");
    for (const banned of ["process.exit", "readFileSync(0", "process.stdout"]) assert.equal(code.includes(banned), false, `${file} contains ${banned}`);
  }
});

test("emitLedger called directly appends one v2 row to the ledger (T-6.3)", () => {
  withProject((root) => {
    const tp = transcript(root, [user("hello"), assistant("Done.")]);
    assert.equal(emitLedger({ hook_event_name: "Stop", session_id: "s1", transcript_path: tp, cwd: root }, { root }), null);
    const rows = readFileSync(statePath(root, STATE_FILES.ledger), "utf8").trim().split("\n").map((l) => JSON.parse(l));
    assert.equal(rows.length, 1);
    assert.equal(rows[0].v, 2);
    assert.equal(rows[0].session, "s1");
  });
});

test("routeVerdict on a pull request review keeps the block and names its state path (T-6.3)", () => {
  withProject((root) => {
    const block = "## Review: pr-7287 · pr\n\nApproved.\n\nAlignment: PASS\nFindings: clean\n\nAPPROVED";
    const tp = transcript(root, [user("scope: pr"), assistant(block)]);
    const out = routeVerdict({ hook_event_name: "SubagentStop", session_id: "s3", transcript_path: tp, cwd: root, agent_type: "reviewer" }, { root });
    assert.ok(out.hookSpecificOutput.additionalContext.includes(stateRel("pr-7287.review.md")));
    assert.equal(existsSync(statePath(root, "pr-7287.review.md")), true);
    assert.equal(routeVerdict({ stop_hook_active: true }, { root }), null);
  });
});

test("injectState with an empty event lists the open work items (T-6.3)", () => {
  withProject((root) => {
    const s = createWork({ lane: "order", title: "Csv export", root });
    const out = injectState({}, { root });
    assert.equal(out.hookSpecificOutput.hookEventName, "SessionStart");
    assert.match(out.hookSpecificOutput.additionalContext, new RegExp(`# Open work items\\n- ${s.id} · order · open`));
  });
});

test("guardBash called directly decides, falls through, and traces once per call (T-7.2)", () => {
  withProject((root) => {
    const decision = (command) => guardBash({ hook_event_name: "PreToolUse", tool_name: "Bash", tool_input: { command }, cwd: root }, { root })?.hookSpecificOutput.permissionDecision ?? null;
    assert.equal(decision("rm -rf x"), "deny");
    assert.equal(decision("git status"), "allow");
    writeFileSync(join(root, "package.json"), JSON.stringify({ scripts: { test: "vitest run" } }));
    assert.equal(decision(`npm test > ${stateRel("p.log")} 2>&1`), "allow");
    assert.equal(decision("cat a > b"), null);
    const trace = readFileSync(statePath(root, STATE_FILES.guardLog), "utf8").trim().split("\n");
    assert.equal(trace.length, 4);
    assert.deepEqual(trace.map((l) => JSON.parse(l).outcome), ["deny", "allow", "allow", "fallthrough:write-redirect"]);
  });
});

test("guardScope called directly guards kernel and hook state but lets the branching manifest through (T-7.3)", () => {
  withProject((root) => {
    const s = createWork({ lane: "order", title: "Scope", root });
    const write = (file_path) => guardScope({ hook_event_name: "PreToolUse", tool_name: "Write", tool_input: { file_path }, cwd: root }, { root })?.hookSpecificOutput.permissionDecision ?? null;
    assert.equal(write(join(root, "work", s.id, "state.yaml")), "deny");
    assert.equal(write(statePath(root, STATE_FILES.ledger)), "deny");
    assert.equal(write(branchingManifestPath(root)), null);
  });
});

test("guardScope denies the legacy state folder and hook state in any case, not look-alikes (T-1.1, T-1.2, T-1.3)", () => {
  withProject((root) => {
    const guard = (tool_name, rel) => guardScope({ hook_event_name: "PreToolUse", tool_name, tool_input: { file_path: join(root, rel) }, cwd: root }, { root })?.hookSpecificOutput ?? null;
    for (const [tool_name, rel] of [["Write", ".claude/ledger/drive-log.jsonl"], ["Edit", ".claude/ledger/drive-log.jsonl"], ["Write", ".claude/ledger/ledger.jsonl"]]) {
      const out = guard(tool_name, rel);
      assert.equal(out?.permissionDecision, "deny", `${tool_name} ${rel}`);
      assert.match(out.permissionDecisionReason, /\.claude\/ledger\//);
      assert.match(out.permissionDecisionReason, /harness migrate/);
    }
    assert.equal(guard("Write", ".Claude/Ledger/drive-log.jsonl")?.permissionDecision, "deny");
    assert.equal(guard("Write", ".TETHER/State/drive-log.jsonl")?.permissionDecision, "deny");
    assert.equal(guard("Write", ".tether/state/branching.yaml"), null);
    assert.equal(guard("Write", ".Tether/State/Branching.yaml"), null);
    assert.equal(guard("Write", ".claude/ledger-notes.md"), null);
  });
});

const continuation = (id) => `The coordinator sent a message while you were working:\nCheckpoint review of phases 1 to 4.\n\nwork: ${id}\nscope: checkpoint\nphase: 4`;

test("latestHints reads the continuation, spawnHints keeps the spawn message (T-2.1, T-2.2)", () => {
  withProject((root) => {
    const id = "20261006-csv";
    const tp = transcript(root, [user(`work: ${id}\nscope: crosscheck`), assistant("ALIGNED"), user(continuation(id))]);
    assert.deepEqual(latestHints(tp), { work_id: id, phase: 4, lane: null, scope: "checkpoint" });
    assert.deepEqual(spawnHints(tp), { work_id: id, phase: null, lane: null, scope: "crosscheck" });
  });
});

test("latestHints skips a later message without a work line (T-2.3)", () => {
  withProject((root) => {
    const id = "20261006-csv";
    const skillBody = "Review the phase named by `phase: <n>`.\nscope: checkpoint\nphase: 9";
    const tp = transcript(root, [user(`work: ${id}\nscope: crosscheck`), user(continuation(id)), user(skillBody)]);
    assert.deepEqual(latestHints(tp), { work_id: id, phase: 4, lane: null, scope: "checkpoint" });
  });
});

test("no helper is left under .claude/hooks/lib; all four live in .claude/lib (T-6.4)", () => {
  const oldHome = resolve(".claude/hooks/lib");
  assert.deepEqual(existsSync(oldHome) ? readdirSync(oldHome) : [], []);
  for (const helper of ["transcript.mjs", "turn-block.mjs", "source-paths.mjs", "drive-evidence.mjs"]) assert.equal(existsSync(resolve(".claude/lib", helper)), true, helper);
});
