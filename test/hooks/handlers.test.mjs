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

const HOOKS = resolve(".claude/hooks");
const HANDLERS = resolve(".claude/lib/hooks");
const SHELLS = {
  "emit.ledger.mjs": "emitLedger",
  "inject.state.mjs": "injectState",
  "lint.schema.mjs": "lintSchema",
  "monitor.context.mjs": "monitorContext",
  "observe.drive.mjs": "observeDrive",
  "route.verdict.mjs": "routeVerdict",
};
const MAX_SHELL_LINES = 5;

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

test("each of the six shells imports only runHook and its handler, in at most five lines (T-6.1)", () => {
  for (const [file, handler] of Object.entries(SHELLS)) {
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

test("no helper is left under .claude/hooks/lib; all four live in .claude/lib (T-6.4)", () => {
  const oldHome = resolve(".claude/hooks/lib");
  assert.deepEqual(existsSync(oldHome) ? readdirSync(oldHome) : [], []);
  for (const helper of ["transcript.mjs", "turn-block.mjs", "source-paths.mjs", "drive-evidence.mjs"]) assert.equal(existsSync(resolve(".claude/lib", helper)), true, helper);
});
