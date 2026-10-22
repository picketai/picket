import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createWork, writeState } from "../../dist/lib/work.mjs";
import { hostPath, sessionCostPath, statePath, stateRel, STATE_FILES } from "../../dist/lib/paths.mjs";
import { emitLedger } from "../../dist/lib/hooks/emit.ledger.mjs";
import { reviewClasses, routeVerdict } from "../../dist/lib/hooks/route.verdict.mjs";
import { injectState } from "../../dist/lib/hooks/inject.state.mjs";
import { injectRules, INJECTED_RULES } from "../../dist/lib/hooks/inject.rules.mjs";
import { injectExtensions } from "../../dist/lib/hooks/inject.extensions.mjs";
import { guardBash, LEAD_ONLY_VERBS, KERNEL_OTHER_VERBS, KERNEL_READ_SUBVERBS, KERNEL_READ_VERBS, WRAPPING_FLAGS } from "../../dist/lib/hooks/guard.bash.mjs";
import { guardScope } from "../../dist/lib/hooks/guard.scope.mjs";
import { ASKING_MODES, commandKey } from "../../dist/lib/escalation.mjs";
import { observeDrive } from "../../dist/lib/hooks/observe.drive.mjs";
import { notificationCommand, notifyUser } from "../../dist/lib/hooks/notify.user.mjs";
import { branchingManifestPath } from "../../dist/lib/paths.mjs";
import { latestHints, spawnHints } from "../../dist/lib/transcript.mjs";

const HOOKS = resolve("dist/hooks");
const HOOK_SHELLS = resolve("src/hooks");
const HANDLERS = resolve("src/lib/hooks");
const SHELLS = [
  "emit.ledger.mjs",
  "guard.bash.mjs",
  "guard.block.mjs",
  "guard.comments.mjs",
  "guard.scope.mjs",
  "guard.silenced.mjs",
  "inject.extensions.mjs",
  "inject.rules.mjs",
  "inject.state.mjs",
  "lint.schema.mjs",
  "monitor.context.mjs",
  "notify.user.mjs",
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

test("src/hooks holds hooks.json, the hook shells, README.md and no other file (T-7.1)", () => {
  const files = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) walk(join(dir, entry.name));
      else files.push(join(dir, entry.name).slice(HOOK_SHELLS.length + 1).replaceAll("\\", "/"));
    }
  };
  walk(HOOK_SHELLS);
  assert.deepEqual(files.sort(), ["README.md", "hooks.json", ...SHELLS].sort());
});

test("every shell imports only runHook and its handler, in at most five lines (T-6.1, T-7.1)", () => {
  for (const file of SHELLS) {
    const handler = handlerName(file);
    const lines = readFileSync(join(HOOK_SHELLS, file), "utf8").split(/\r?\n/).filter((l) => l.trim());
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

const RULE_HEADINGS = ["# Writing rules", "# Comments in code", "# Work items", "# Security paths", "# Untrusted content"];

function headingOrder(text) {
  return RULE_HEADINGS.map((heading) => text.indexOf(`${heading}\n`));
}

for (const event of [{ hook_event_name: "SubagentStart", agent_type: "picket:developer" }, { hook_event_name: "SessionStart", source: "compact" }]) {
  test(`injectRules returns the five rules in order, untrusted last, for ${event.hook_event_name}`, () => {
    const out = injectRules(event);
    assert.equal(out.hookSpecificOutput.hookEventName, event.hook_event_name);
    const text = out.hookSpecificOutput.additionalContext;
    const positions = headingOrder(text);
    assert.ok(positions.every((p) => p >= 0), `missing heading: ${positions}`);
    assert.deepEqual([...positions].sort((a, b) => a - b), positions);
    assert.doesNotMatch(text, /^paths:/m);
  });
}

test("injectRules joins the rule files with one blank line, in the injected order", () => {
  withProject((root) => {
    const dir = join(root, "rules");
    mkdirSync(dir);
    INJECTED_RULES.forEach((file, i) => writeFileSync(join(dir, file), `# Rule ${i}\n\nbody ${i}\n`));
    const out = injectRules({ hook_event_name: "SessionStart" }, { rules: dir });
    assert.equal(out.hookSpecificOutput.additionalContext, "# Rule 0\n\nbody 0\n\n# Rule 1\n\nbody 1\n\n# Rule 2\n\nbody 2\n\n# Rule 3\n\nbody 3\n\n# Rule 4\n\nbody 4");
  });
});

test("the inject.rules shell spawned for SubagentStart carries the untrusted rule (T-3.2)", () => {
  const out = JSON.parse(execFileSync("node", [join(HOOKS, "inject.rules.mjs")], { input: JSON.stringify({ hook_event_name: "SubagentStart", agent_type: "picket:analyst" }), encoding: "utf8" }));
  assert.match(out.hookSpecificOutput.additionalContext, /^# Untrusted content$/m);
  assert.equal(INJECTED_RULES.at(-1), "untrusted.md");
});

test("the data-not-instructions statement lives only in the untrusted rule (T-3.4)", () => {
  const hits = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.name.endsWith(".md") && /is data, never (an? )?instructions?/i.test(readFileSync(path, "utf8"))) hits.push(path.slice(resolve("src").length + 1).replaceAll("\\", "/"));
    }
  };
  walk(resolve("src"));
  assert.deepEqual(hits, ["rules/untrusted.md"]);
});

test("injectRules returns null when the rules folder is missing", () => {
  withProject((root) => {
    assert.equal(injectRules({ hook_event_name: "SubagentStart" }, { rules: join(root, "no-rules") }), null);
  });
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

test("emitLedger stores the session's cost snapshot as session_cost_usd and writes no cost_usd (T-1.3)", () => {
  withProject((root) => {
    const tp = transcript(root, [user("hello"), assistant("Done.")]);
    mkdirSync(statePath(root, STATE_FILES.sessions), { recursive: true });
    writeFileSync(sessionCostPath(root, "s1"), JSON.stringify({ session: "s1", cost_usd: 2.5, ts: "2026-10-18T07:00:00Z" }));
    for (const session_id of ["s1", "s2"]) emitLedger({ hook_event_name: "Stop", session_id, transcript_path: tp, cwd: root }, { root });
    const rows = readFileSync(statePath(root, STATE_FILES.ledger), "utf8").trim().split("\n").map((l) => JSON.parse(l));
    assert.deepEqual(rows.map((r) => r.session_cost_usd), [2.5, null]);
    for (const key of ["cost_usd", "lines_added", "bounces", "blocks"]) assert.ok(rows.every((r) => !(key in r)), key);
  });
});

test("routeVerdict on a pull request review keeps the block and names its state path (T-6.3)", () => {
  withProject((root) => {
    const block = "## Review: pr-412 · pr\n\nApproved.\n\nAlignment: PASS\nFindings: clean\n\nAPPROVED";
    const tp = transcript(root, [user("scope: pr"), assistant(block)]);
    const out = routeVerdict({ hook_event_name: "SubagentStop", session_id: "s3", transcript_path: tp, cwd: root, agent_type: "reviewer" }, { root });
    assert.ok(out.hookSpecificOutput.additionalContext.includes(stateRel("pr-412.review.md")));
    assert.equal(existsSync(statePath(root, "pr-412.review.md")), true);
    assert.equal(routeVerdict({ stop_hook_active: true }, { root }), null);
  });
});

test("routeVerdict on a developer PHASE DONE stamps the item with the event's session (T-2.5)", () => {
  withProject((root) => {
    const s = createWork({ lane: "order", title: "Claimed", session: "s1", root });
    writeFileSync(join(root, "work", s.id, "order.md"), "---\nlane: order\n---\n# O\n\n## Phase 1: A\n\nt\n");
    const block = `## Phase 1 of ${s.id}: A\n\nA works.\n\nFiles: a.mjs\nTests: passed\nLint: none detected\nVerified: no drivable surface: test\nDecisions: none\nComments: none\nCommit: feat: a\n\nPHASE DONE`;
    const tp = transcript(root, [user(`work: ${s.id}\nphase: 1`), assistant(block)]);
    const out = routeVerdict({ hook_event_name: "SubagentStop", session_id: "s3", transcript_path: tp, cwd: root, agent_type: "picket:developer" }, { root });
    assert.match(out.hookSpecificOutput.additionalContext, /PHASE DONE applied/);
    assert.match(readFileSync(join(root, "work", s.id, "state.yaml"), "utf8"), /^session: s3$/m);
  });
});

test("routeVerdict stores a reviewer's Classes on a CHANGES REQUIRED entry and nothing for none (T-9.3)", () => {
  withProject((root) => {
    const s = createWork({ lane: "order", title: "Classed", root });
    writeFileSync(join(root, "work", s.id, "order.md"), "---\nlane: order\n---\n# O\n\n## Phase 1: A\n\nt\n");
    const review = (classes, verdict) => `## Review: ${s.id} · cumulative\n\nOne gap.\n\nAlignment: PASS\nFindings: 0 critical, 2 major, 0 minor\n- [Major] a.mjs:1 — x. y. z.\n${classes}\n\n${verdict}`;
    const routeBlock = (block, session) => routeVerdict({ hook_event_name: "SubagentStop", session_id: session, transcript_path: transcript(root, [user(`work: ${s.id}\nscope: cumulative`), assistant(block)]), cwd: root, agent_type: "picket:reviewer" }, { root });
    routeBlock(review("Classes: Ts4, Cm1", "CHANGES REQUIRED"), "s1");
    routeBlock(review("Classes: none", "CHANGES REQUIRED"), "s2");
    routeBlock(review("", "CHANGES REQUIRED"), "s3");
    const entries = readFileSync(join(root, "work", s.id, "verdicts.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
    assert.deepEqual(entries.map((e) => e.classes ?? null), [["Ts4", "Cm1"], null, null]);
    assert.deepEqual(reviewClasses("Classes: Ts4,Cm1 Ts4, and more"), ["Ts4", "Cm1"]);
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

test("injectState lists open and blocked items and leaves a done item out (T-4.2)", () => {
  withProject((root) => {
    const open = createWork({ lane: "order", title: "Open one", root }).id;
    const blocked = createWork({ lane: "order", title: "Blocked one", root });
    writeState({ ...blocked, status: "blocked", blocked_reason: "waiting" }, root);
    const done = createWork({ lane: "order", title: "Done one", root });
    writeState({ ...done, status: "done" }, root);
    const context = injectState({}, { root }).hookSpecificOutput.additionalContext;
    assert.ok(context.includes(`- ${open} · order · open`));
    assert.ok(context.includes(`- ${blocked.id} · order · blocked`));
    assert.equal(context.includes(done.id), false);
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

const decisionUnder = (root, tool_name) => (command) => guardBash({ hook_event_name: "PreToolUse", tool_name, tool_input: { command }, cwd: root }, { root })?.hookSpecificOutput.permissionDecision ?? null;

test("a destructive command denies under both the Bash and the PowerShell tool", () => {
  withProject((root) => {
    for (const tool_name of ["Bash", "PowerShell"]) {
      for (const command of ["git push origin trunk", "git reset --hard", "rm -rf build", "git -C sub push"]) {
        assert.equal(decisionUnder(root, tool_name)(command), "deny", `${tool_name}: ${command}`);
      }
    }
  });
});

test("guardBash under PowerShell denies destructive cmdlets, aliases and hidden segments, and leaves a worktree teardown to the prompt", () => {
  withProject((root) => {
    const decision = decisionUnder(root, "PowerShell");
    for (const command of ["Remove-Item -Recurse -Force build", "del build", "rd /s build", "Get-ChildItem; git push", "& git push", "Stop-Process -Name node", "Get-ChildItem | ForEach-Object { Remove-Item $_ }", "$r = git push origin main 2>&1", "$null = Remove-Item -Recurse x"]) {
      assert.equal(decision(command), "deny", command);
    }
    assert.equal(decision("Remove-Item -Recurse -Force '.worktrees/feat'"), null);
  });
});

test("guardBash never allows under PowerShell, while Bash keeps its allows and an unnamed tool reads as Bash", () => {
  withProject((root) => {
    for (const command of ["Get-ChildItem", "git status", "picket state x"]) {
      assert.equal(decisionUnder(root, "PowerShell")(command), null, command);
      assert.equal(decisionUnder(root, "Bash")(command), "allow", command);
    }
    assert.equal(decisionUnder(root, undefined)("git status"), "allow");
    const rows = readFileSync(statePath(root, STATE_FILES.guardLog), "utf8").trim().split("\n").map((l) => JSON.parse(l));
    assert.deepEqual(rows.map((r) => r.tool), ["PowerShell", "Bash", "PowerShell", "Bash", "PowerShell", "Bash", "Bash"]);
    assert.equal(rows[0].outcome, "fallthrough:powershell:[safe]");
  });
});

test("the PowerShell deny reason names the user's own route and never the bash marker", () => {
  withProject((root) => {
    const out = guardBash({ hook_event_name: "PreToolUse", tool_name: "PowerShell", tool_input: { command: "Remove-Item -Recurse build" }, cwd: root }, { root }).hookSpecificOutput;
    assert.match(out.permissionDecisionReason, /destructive sub-command/);
    assert.match(out.permissionDecisionReason, /! Remove-Item -Recurse build/);
    assert.equal(out.permissionDecisionReason.includes('PICKET_ESCALATE="<why>"'), false);
  });
});

test("guardBash under PowerShell denies a write into a source and lets a read through to the prompt", () => {
  withProject((root) => {
    const source = join(root, "analysis");
    execFileSync("git", ["init", "-q", source]);
    mkdirSync(join(root, ".picket"), { recursive: true });
    writeFileSync(join(root, ".picket", "config.json"), JSON.stringify({ version: 1, sources: { analysis: { env: "PICKET_TEST_SOURCE_ANALYSIS" } } }));
    process.env.PICKET_TEST_SOURCE_ANALYSIS = source;
    try {
      const src = source.replaceAll("\\", "/");
      const outcome = (command) => guardBash({ hook_event_name: "PreToolUse", tool_name: "PowerShell", tool_input: { command }, cwd: root }, { root })?.hookSpecificOutput ?? null;
      const write = outcome(`Set-Content ${src}/a.md x`);
      assert.equal(write?.permissionDecision, "deny");
      assert.match(write.permissionDecisionReason, /inside source analysis, which is read-only/);
      assert.equal(outcome(`echo x > ${src}/a.md`)?.permissionDecision, "deny");
      assert.equal(outcome(`Set-Location ${src}; Remove-Item a.md`)?.permissionDecision, "deny");
      assert.notEqual(outcome(`Get-Content ${src}/a.md`)?.permissionDecision, "deny");
      assert.notEqual(outcome(`cat ${src}/a.md`)?.permissionDecision, "deny");
    } finally {
      delete process.env.PICKET_TEST_SOURCE_ANALYSIS;
    }
  });
});

test("guardScope called directly guards kernel and hook state but lets the branching manifest through (T-7.3)", () => {
  withProject((root) => {
    const s = createWork({ lane: "order", title: "Scope", root });
    const write = (file_path) => guardScope({ hook_event_name: "PreToolUse", tool_name: "Write", tool_input: { file_path }, cwd: root }, { root })?.hookSpecificOutput.permissionDecision ?? null;
    assert.equal(write(join(root, "work", s.id, "state.yaml")), "deny");
    assert.equal(write(join(root, "work", s.id, "left.jsonl")), "deny");
    assert.equal(write(statePath(root, STATE_FILES.ledger)), "deny");
    assert.equal(write(branchingManifestPath(root)), null);
  });
});

test("guardScope decides the same whatever form the root and the target path take", () => {
  withProject((root) => {
    const s = createWork({ lane: "order", title: "Forms", root });
    const longRoot = realpathSync.native(root);
    const decide = (rootForm, file_path) => guardScope({ hook_event_name: "PreToolUse", tool_name: "Write", tool_input: { file_path }, cwd: rootForm }, { root: rootForm })?.hookSpecificOutput.permissionDecision ?? null;
    assert.equal(decide(root, join(longRoot, "work", s.id, "state.yaml")), "deny");
    assert.equal(decide(longRoot, join(root, "work", s.id, "state.yaml")), "deny");
    assert.equal(decide(root, join(longRoot, ".picket", "extensions", "acme", "extension.json")), "ask");
    assert.equal(decide(root, join(longRoot, "src", "new", "file.ts")), null);
    if (process.platform === "win32") assert.equal(decide(root, join(root, "Work", s.id, "State.yaml")), "deny");
  });
});

test("guardScope denies the legacy state folder and hook state in any case, not look-alikes (T-1.1, T-1.2, T-1.3)", () => {
  withProject((root) => {
    const guard = (tool_name, rel) => guardScope({ hook_event_name: "PreToolUse", tool_name, tool_input: { file_path: join(root, rel) }, cwd: root }, { root })?.hookSpecificOutput ?? null;
    for (const [tool_name, rel] of [["Write", ".claude/ledger/drive-log.jsonl"], ["Edit", ".claude/ledger/drive-log.jsonl"], ["Write", ".claude/ledger/ledger.jsonl"]]) {
      const out = guard(tool_name, rel);
      assert.equal(out?.permissionDecision, "deny", `${tool_name} ${rel}`);
      assert.match(out.permissionDecisionReason, /\.claude\/ledger\//);
      assert.match(out.permissionDecisionReason, /picket migrate/);
    }
    assert.equal(guard("Write", ".Claude/Ledger/drive-log.jsonl")?.permissionDecision, "deny");
    assert.equal(guard("Write", ".PICKET/State/drive-log.jsonl")?.permissionDecision, "deny");
    assert.equal(guard("Write", ".picket/state/branching.yaml"), null);
    assert.equal(guard("Write", ".Picket/State/Branching.yaml"), null);
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

test("no helper is left under .claude/hooks/lib; all four live in src/lib (T-6.4)", () => {
  const oldHome = resolve(".claude/hooks/lib");
  assert.deepEqual(existsSync(oldHome) ? readdirSync(oldHome) : [], []);
  for (const helper of ["transcript.mjs", "turn-block.mjs", "source-paths.mjs", "drive-evidence.mjs"]) assert.equal(existsSync(resolve("src/lib", helper)), true, helper);
});

test("guardBash allows a compound of read-only pieces and bare picket calls that wrap nothing", () => {
  withProject((root) => {
    const decision = (command) => guardBash({ hook_event_name: "PreToolUse", tool_name: "Bash", tool_input: { command }, cwd: root }, { root })?.hookSpecificOutput.permissionDecision ?? null;
    assert.equal(decision("picket next x; cat work/x/order.md | head -40"), "allow");
    assert.equal(decision("cd sub && picket state x 2>&1"), "allow");
    assert.equal(decision("picket state x"), "allow", "a lone read-only picket call stands alone");
    assert.equal(decision("picket route x --verdict APPROVED --agent user"), null, "a lone mutating picket call is left to the project's allow rule");

    assert.equal(decision('API_KEY=k picket drive --hit "GET /h"'), null);
    assert.equal(decision("node dist/bin/picket.mjs next x; ls"), null);
    assert.equal(decision("/usr/local/bin/picket next x; ls"), null);
    assert.equal(decision('picket drive --run "npm start"; ls'), null);

    assert.equal(decision("picket next x > out.txt"), null);
    assert.equal(decision('picket admit --text "$(whoami)"'), null);
    assert.equal(decision('picket drive --run "rm -rf src"'), "deny");
  });
});

test("every flag whose value drive or check executes is a wrapping flag guard.bash inspects", () => {
  const executed = ["src/lib/drive.mjs", "src/lib/check.mjs"].flatMap((file) =>
    [...readFileSync(resolve(file), "utf8").matchAll(/assertNotDestructive\(o\.\w+, "picket \w+ (--[\w-]+)"\)/g)].map((m) => m[1]),
  );
  assert.deepEqual(executed.sort(), ["--only", "--run", "--start"]);
  for (const flag of executed) assert.ok(WRAPPING_FLAGS.has(flag), flag);
});

test("every picket verb is placed in exactly one of the read and other verb sets", () => {
  const list = readFileSync(resolve("src/bin/dispatch.mjs"), "utf8").match(/^const VERBS = \[([^\]]+)\];$/m)[1];
  const verbs = [...list.matchAll(/"([\w-]+)"/g)].map((m) => m[1]);
  assert.ok(verbs.length > 10, verbs.join(" "));
  for (const verb of verbs) {
    assert.ok(
      KERNEL_READ_VERBS.has(verb) !== KERNEL_OTHER_VERBS.has(verb),
      `picket ${verb} must be in exactly one set: KERNEL_READ_VERBS only when it writes nothing and runs no project code, KERNEL_OTHER_VERBS otherwise`,
    );
  }
  for (const verb of Object.keys(KERNEL_READ_SUBVERBS)) assert.ok(KERNEL_OTHER_VERBS.has(verb), `${verb} has read sub-verbs, so it belongs in KERNEL_OTHER_VERBS`);
  assert.ok(KERNEL_OTHER_VERBS.has("source"));
});

test("only the lead and the user run picket waive and picket comment; a spawned agent is denied", () => {
  withProject((root) => {
    const outcome = (command, agent_type, tool_name = "Bash") => guardBash({ hook_event_name: "PreToolUse", tool_name, tool_input: { command }, cwd: root, agent_type }, { root })?.hookSpecificOutput ?? null;
    for (const verb of LEAD_ONLY_VERBS) {
      const command = `picket ${verb} 20261018-x --path test/a.test.ts --text "it.skip("`;
      for (const agent of ["picket:developer", "developer", "reviewer", "picket:architect"]) {
        const out = outcome(command, agent);
        assert.equal(out?.permissionDecision, "deny", `${agent} ${verb}`);
        assert.match(out.permissionDecisionReason, new RegExp(`picket ${verb}\` records the user's approval`));
      }
      assert.notEqual(outcome(command, undefined)?.permissionDecision, "deny", `lead ${verb}`);
      assert.equal(outcome(`cd ${root} && ${command}`, "picket:developer")?.permissionDecision, "deny", `compound ${verb}`);
      assert.equal(outcome(`picket drive --run '${command}'`, "picket:developer")?.permissionDecision, "deny", `wrapped ${verb}`);
      assert.equal(outcome(command, "picket:developer", "PowerShell")?.permissionDecision, "deny", `PowerShell ${verb}`);
      const args = command.slice("picket ".length);
      for (const form of [`picket --root ${root} ${args}`, `picket --human --root . ${args}`, `node dist/bin/picket.mjs --root . ${args}`]) {
        assert.equal(outcome(form, "picket:developer")?.permissionDecision, "deny", form);
      }
    }
    assert.notEqual(outcome("picket --root . state waive", "picket:developer")?.permissionDecision, "deny", "waive as an argument of another verb");
    for (const hidden of ["V=waive; picket $V x --path a --text b", "picket $(echo waive) x --path a --text b", "picket `echo waive` x", "picket --root . ${V} x"]) {
      const out = outcome(hidden, "picket:developer");
      assert.equal(out?.permissionDecision, "deny", hidden);
      assert.match(out.permissionDecisionReason, /expansion in the verb position/, hidden);
    }
    assert.equal(outcome("$V = 'waive'; picket $V x", "picket:developer", "PowerShell")?.permissionDecision, "deny", "PowerShell variable verb");
    assert.notEqual(outcome("picket $(echo waive) x", undefined)?.permissionDecision, "deny", "the lead is not refused");
    assert.notEqual(outcome("picket state 20261018-x", "picket:developer")?.permissionDecision, "deny");
  });
});

const WAIVE = "picket waive 20261018-x --path p --text t";

test("the lead-only rule reaches inside eval, shell -c, argv wrappers, PowerShell hosts and cmd /c (T-2.1)", () => {
  withProject((root) => {
    const outcome = (command, tool_name = "Bash") => guardBash({ hook_event_name: "PreToolUse", tool_name, tool_input: { command }, cwd: root, agent_type: "picket:developer" }, { root })?.hookSpecificOutput ?? null;
    for (const [command, tool] of [
      [`eval ${WAIVE}`],
      ["bash -c 'picket waive 20261018-x --path p --text t'"],
      [`sh -c "picket comment 20261018-x --path p --text t"`],
      [`bash -lc '${WAIVE}'`],
      [`timeout 5 ${WAIVE}`],
      [`env FOO=1 ${WAIVE}`],
      [`timeout 5 bash -c '${WAIVE}'`],
      [`echo 20261018-x | xargs picket`],
      [`cmd /c ${WAIVE}`],
      [`Invoke-Expression '${WAIVE}'`, "PowerShell"],
      [`iex '${WAIVE}'`, "PowerShell"],
      [`pwsh -c "${WAIVE}"`, "PowerShell"],
      [`powershell -Command "${WAIVE}"`, "PowerShell"],
      [`cmd /c ${WAIVE}`, "PowerShell"],
      [`command ${WAIVE}`],
      [`exec ${WAIVE}`],
      [`nice -n 5 ${WAIVE}`],
    ]) {
      const out = outcome(command, tool);
      assert.equal(out?.permissionDecision, "deny", `${tool ?? "Bash"}: ${command}`);
      assert.match(out.permissionDecisionReason, /picket waive|picket comment/, command);
    }
  });
});

test("an unreadable payload that mentions picket is denied for an agent; ordinary wrappers keep their decision (T-2.2, T-2.3)", () => {
  withProject((root) => {
    const decision = (command, agent_type) => guardBash({ hook_event_name: "PreToolUse", tool_name: "Bash", tool_input: { command }, cwd: root, agent_type }, { root })?.hookSpecificOutput?.permissionDecision ?? null;
    const hidden = `CMD="${WAIVE}"; bash -c "$CMD"`;
    assert.equal(decision(hidden, "picket:developer"), "deny");
    assert.equal(decision(`bash -c "$(echo picket) waive x"`, "picket:developer"), "deny");
    for (const command of ["bash -c 'npm test'", "timeout 30 npm test", 'bash -c "echo $HOME"']) assert.equal(decision(command, "picket:developer"), null, command);
    for (const command of [`eval ${WAIVE}`, `bash -c '${WAIVE}'`, hidden]) assert.equal(decision(command, undefined), null, `lead: ${command}`);
    assert.equal(decision("bash -c 'for f in .picket/state/scratch/*.mjs; do node $f; done'", "picket:developer"), null, "a .picket/ path is not a mention of the picket command");
    assert.equal(decision("bash -c 'node dist/bin/picket.mjs $VERB x'", "picket:developer"), "deny", "the kernel script is a mention");
    assert.equal(decision("command -v picket", "picket:developer"), null, "a lookup of the picket command is not a call");
  });
});

test("a spawned agent's shell write to a code or test file is denied, naming the path and the Write tool; the lead's is unchanged (T-2.4)", () => {
  withProject((root) => {
    const outcome = (command, agent_type, tool_name = "Bash") => guardBash({ hook_event_name: "PreToolUse", tool_name, tool_input: { command }, cwd: root, agent_type }, { root })?.hookSpecificOutput ?? null;
    for (const [command, path, tool] of [
      ["cat > test/kernel/x.test.mjs <<'EOF'\nimport x from 'y';\nEOF", "test/kernel/x.test.mjs"],
      ["echo x >> src/a.ts", "src/a.ts"],
      ["printf x | tee -a src/a.py", "src/a.py"],
      ["sed -i 's/a/b/' src/a.cs", "src/a.cs"],
      ["sed -i.bak -e 's/a/b/' src/b.cs", "src/b.cs"],
      ["Set-Content src/a.ts x", "src/a.ts", "PowerShell"],
      ['"x" | Out-File src/a.ts', "src/a.ts", "PowerShell"],
      ["Add-Content -Value x -Path src/c.ts", "src/c.ts", "PowerShell"],
      ["echo x > src/a.ts", "src/a.ts", "PowerShell"],
      ["bash -c 'cat > test/x.test.mjs <<EOF\nit.skip(1)\nEOF'", "test/x.test.mjs"],
      ['sh -c "sed -i s/a/b/ src/a.ts"', "src/a.ts"],
      ["eval 'echo x >> src/e.ts'", "src/e.ts"],
      ["timeout 5 tee src/t.ts", "src/t.ts"],
      ["pwsh -c \"Set-Content src/p.ts x\"", "src/p.ts", "PowerShell"],
      ["echo x >| src/clobber.ts", "src/clobber.ts"],
      ["sc src/s.ts x", "src/s.ts", "PowerShell"],
      ["ac src/s.ts x", "src/s.ts", "PowerShell"],
      ["Set-Content -Path:src/colon.ts x", "src/colon.ts", "PowerShell"],
    ]) {
      const out = outcome(command, "picket:developer", tool);
      assert.equal(out?.permissionDecision, "deny", command);
      assert.ok(out.permissionDecisionReason.startsWith(`guard.bash: ${path} is code; a shell write skips guard.comments and guard.silenced. Write it with the Edit or Write tool.`), out.permissionDecisionReason);
      assert.equal(outcome(command, undefined, tool), null, `lead: ${command}`);
    }
  });
});

test("state files, docs, discards, stream plumbing and code outside the project are not shell-write denials (T-2.5)", () => {
  withProject((root) => {
    const reason = (command) => guardBash({ hook_event_name: "PreToolUse", tool_name: "Bash", tool_input: { command }, cwd: root, agent_type: "picket:developer" }, { root })?.hookSpecificOutput?.permissionDecisionReason ?? "";
    const outside = join(tmpdir(), "elsewhere", "a.ts").replaceAll("\\", "/");
    for (const command of ["echo x > .picket/state/scratch/a.mjs", "echo x > notes.md", "node gen.mjs > /dev/null", "npm test 2>&1 | tail -5", `echo x > '${outside}'`, "sed -n '1,5p' src/a.ts", "tee notes.txt"]) {
      assert.doesNotMatch(reason(command), /is code; a shell write/, command);
    }
  });
});

test("guardBash allows a lone read-only picket verb and leaves a mutating one to the allow rule", () => {
  withProject((root) => {
    const decision = (command) => guardBash({ hook_event_name: "PreToolUse", tool_name: "Bash", tool_input: { command }, cwd: root }, { root })?.hookSpecificOutput.permissionDecision ?? null;

    for (const command of ["picket verify 20261012-touring-deleteorder-blank-input-returns-500 1", "picket state x", "picket next x", "picket packet x", "picket review-summary x", "picket source grep analysis foo", "picket source find analysis Foo", "picket verify x 1 2>&1 | tail -20"]) {
      assert.equal(decision(command), "allow", command);
    }

    for (const command of ["picket route x --verdict APPROVED --agent user", "picket set x status=done", "picket new --lane fast --title t", "picket source add x ref", "picket source pick x", "picket source", "picket pr https://h/pr/1 --post f.md", "picket constructor x", 'picket drive --run "node .picket/state/scratch/drive-x.mjs" 2>&1 | tail -20']) {
      assert.equal(decision(command), null, command);
    }
    assert.equal(decision("picket next x; ls"), "allow");
  });
});

test("guardBash allows a lone picket verify only when the test command it would run is itself safe", () => {
  withProject((root) => {
    const decision = (command) => guardBash({ hook_event_name: "PreToolUse", tool_name: "Bash", tool_input: { command }, cwd: root }, { root })?.hookSpecificOutput.permissionDecision ?? null;
    const decisionIn = (cwd, command) => guardBash({ tool_input: { command }, cwd }, { root })?.hookSpecificOutput.permissionDecision ?? null;
    assert.equal(decision("picket verify x 1"), "allow");
    assert.equal(decisionIn(join(root, "..", "other"), "picket verify x 1"), null);
    assert.equal(decisionIn(join(root, "sub"), "picket verify x 1"), null);
    assert.equal(decisionIn(join(root, "..", "other"), "picket verify x 1 --no-tests"), "allow");

    writeFileSync(join(root, "package.json"), JSON.stringify({ scripts: { test: "node scripts/test.mjs" } }));
    assert.equal(decision("picket verify x 1"), null);
    assert.equal(decision("cd sub && picket verify x 1"), null);
    assert.equal(decision("picket next x; picket verify x 1"), null);
    assert.equal(decision("cd sub && picket verify x 1 --no-tests"), "allow");
    assert.equal(decision(`picket verify x 1 --root ${join(root, "other")}`), null);
    assert.equal(decision("picket verify x 1 --no-tests"), "allow");

    mkdirSync(join(root, ".picket"), { recursive: true });
    writeFileSync(join(root, ".picket", "config.json"), JSON.stringify({ version: 1, commands: { test: "dotnet test" } }));
    assert.equal(decision("picket verify x 1"), "allow");
  });
});

function extensionProject(extensions, manifests) {
  const root = mkdtempSync(join(tmpdir(), "picket-ext-hook-"));
  mkdirSync(join(root, ".picket", "extensions"), { recursive: true });
  writeFileSync(join(root, ".picket", "config.json"), JSON.stringify({ version: 1, extensions }));
  for (const [name, { manifest, files }] of Object.entries(manifests)) {
    const dir = join(root, ".picket", "extensions", name);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "extension.json"), JSON.stringify({ name, version: "0.1.0", schema: 1, ...manifest }));
    for (const [path, text] of Object.entries(files ?? {})) writeFileSync(join(dir, path), text);
  }
  return root;
}

function roleTexts(name) {
  return {
    manifest: { rules: ["rules.md"], agents: { lead: ["lead.md"], developer: ["developer.md"], reviewer: ["reviewer.md"] } },
    files: { "rules.md": `${name} rule`, "lead.md": `${name} lead`, "developer.md": `${name} developer`, "reviewer.md": `${name} reviewer` },
  };
}

function extensionText(event, root) {
  return injectExtensions(event, { root })?.hookSpecificOutput.additionalContext ?? null;
}

test("SessionStart gets each extension's rules then its lead text, in config order", () => {
  const root = extensionProject(["acme", "local"], { acme: roleTexts("acme"), local: roleTexts("local") });
  try {
    const text = extensionText({ hook_event_name: "SessionStart" }, root);
    assert.equal(text, "## Extension acme 0.1.0\n\nacme rule\n\nacme lead\n\n## Extension local 0.1.0\n\nlocal rule\n\nlocal lead");
    assert.equal(text.includes("developer"), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("SubagentStart gives a role its own additions and any other agent the rules only", () => {
  const root = extensionProject(["acme"], { acme: roleTexts("acme") });
  try {
    assert.equal(extensionText({ hook_event_name: "SubagentStart", agent_type: "picket:developer" }, root), "## Extension acme 0.1.0\n\nacme rule\n\nacme developer");
    assert.equal(extensionText({ hook_event_name: "SubagentStart", agent_type: "general-purpose" }, root), "## Extension acme 0.1.0\n\nacme rule");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("extensions past 10,000 characters are left out whole and named", () => {
  const big = (name) => ({ manifest: { rules: ["rules.md"] }, files: { "rules.md": `${name} `.padEnd(4000, "x") } });
  const root = extensionProject(["one", "two", "three"], { one: big("one"), two: big("two"), three: big("three") });
  try {
    const text = extensionText({ hook_event_name: "SessionStart" }, root);
    assert.ok(text.length <= 10_000, `${text.length}`);
    assert.ok(text.includes("## Extension one") && text.includes("## Extension two"));
    assert.equal(text.includes("## Extension three"), false);
    assert.match(text.split("\n").at(-1), /left out.*: three$/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a refused extension adds one line and no text; nothing enabled or refused gives no output", () => {
  const root = extensionProject(["broken"], { broken: { manifest: { schema: 2, rules: ["rules.md"] }, files: { "rules.md": "should not appear" } } });
  const empty = extensionProject([], {});
  try {
    const text = extensionText({ hook_event_name: "SessionStart" }, root);
    assert.equal(text, "Extension broken refused: schema 2 is not supported by this Picket (supports 1)");
    assert.equal(injectExtensions({ hook_event_name: "SessionStart" }, { root: empty }), null);
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(empty, { recursive: true, force: true });
  }
});

test("guardScope asks before an edit to extension content or the config, and keeps its denials first", () => {
  withProject((root) => {
    const decide = (tool_name, rel) => guardScope({ hook_event_name: "PreToolUse", tool_name, tool_input: { file_path: join(root, rel) }, cwd: root }, { root })?.hookSpecificOutput ?? null;
    const extension = decide("Write", ".picket/extensions/acme/rules/a.md");
    assert.equal(extension.permissionDecision, "ask");
    assert.match(extension.permissionDecisionReason, /\.picket\/extensions\/acme\/rules\/a\.md is extension content/);
    const config = decide("Edit", ".picket/config.json");
    assert.equal(config.permissionDecision, "ask");
    assert.match(config.permissionDecisionReason, /\.picket\/config\.json changes what the kernel loads/);
    assert.equal(decide("Write", ".picket/state/ledger.jsonl").permissionDecision, "deny");
    assert.equal(decide("Write", "src/a.ts"), null);
    if (process.platform === "win32") assert.equal(decide("Write", ".PICKET/Extensions/acme/x.md").permissionDecision, "ask");
  });
});

test("guardBash never allows a heredoc redirect into an extension file", () => {
  withProject((root) => {
    const command = "cat > .picket/extensions/x/rules/a.md <<'EOF'\nUse pnpm.\nEOF";
    const decision = guardBash({ hook_event_name: "PreToolUse", tool_name: "Bash", tool_input: { command }, cwd: root }, { root })?.hookSpecificOutput.permissionDecision ?? null;
    assert.notEqual(decision, "allow");
  });
});

test("guardBash reads each line as its own command and a heredoc body as data", () => {
  withProject((root) => {
    const decision = (command) => guardBash({ hook_event_name: "PreToolUse", tool_name: "Bash", tool_input: { command }, cwd: root }, { root })?.hookSpecificOutput.permissionDecision ?? null;
    assert.equal(decision("ls\nrm -rf x"), "deny");
    assert.equal(decision("echo hi\ngit push"), "deny");
    assert.equal(decision("ls # note\nrm -rf x"), "deny");
    assert.equal(decision("ls \\\n  -la"), "allow");
    assert.equal(decision("echo \"<<'X'\"\ngit push\nX"), "deny");
    assert.equal(decision("echo $'a\\'b'\nrm -rf x"), "deny");

    assert.equal(decision("picket admit --request - --human <<'END'\nShip it; git push origin trunk | npm publish\nEND"), "allow");
    assert.equal(decision("picket route x --verdict APPROVED --agent user <<'END'\nShip it\nEND"), null);
    assert.equal(decision("cat <<'END'\nnotes; rm -rf src\nEND\nls"), "allow");
    assert.equal(decision("cat <<-'END'\n\tnotes; rm -rf src\n\tEND\nls"), "allow");
    assert.equal(decision("cat <<'END'\n`code` and $(text)\nEND"), "allow");
    assert.equal(decision("cat <<'END'\nnotes\nEND\nrm -rf x"), "deny");

    assert.equal(decision("cat <<END\n$(whoami)\nEND"), null);
    assert.equal(decision("cat <<'END'\nno terminator; git push"), null);
    assert.equal(decision("bash <<'END'\ngit push\nEND"), null);
  });
});

test("guardBash treats a redirect into /dev/null as a discard and splits commands at |& and ;;", () => {
  withProject((root) => {
    const decision = (command) => guardBash({ hook_event_name: "PreToolUse", tool_name: "Bash", tool_input: { command }, cwd: root }, { root })?.hookSpecificOutput.permissionDecision ?? null;
    const lastOutcome = () => JSON.parse(readFileSync(statePath(root, STATE_FILES.guardLog), "utf8").trim().split("\n").at(-1)).outcome;

    for (const command of ["ls x 2>/dev/null", "grep -n a f >/dev/null", "ls x &>/dev/null", "ls x >/dev/null 2>&1", "ls x &>>/dev/null", "ls .claude/settings.local.json 2>/dev/null && grep -n 'hooks' .claude/settings.local.json"]) {
      assert.equal(decision(command), "allow", command);
    }

    for (const command of ["echo x > out.txt", "echo x 2>/dev/null > out.txt", "ls x &> out.log", "ls x &>> out.log", "echo x > /dev/sda", "ls x &>2", "ls x > /dev/null/x"]) {
      assert.equal(decision(command), null, command);
      assert.equal(lastOutcome(), "fallthrough:write-redirect", command);
    }

    assert.equal(decision("ls x & >/dev/null"), null);
    assert.equal(lastOutcome(), "fallthrough:background");
    assert.equal(decision('grep "a&>b" f'), "allow");

    assert.equal(decision("cat x |& rm -rf y"), "deny");
    assert.equal(decision("ls |& head"), "allow");
    assert.equal(decision("cat x ;; rm -rf y"), "deny");
  });
});

test("guardBash classifies each $(...) body and lets its output reach only inert roots", () => {
  withProject((root) => {
    const decision = (command) => guardBash({ hook_event_name: "PreToolUse", tool_name: "Bash", tool_input: { command }, cwd: root }, { root })?.hookSpecificOutput.permissionDecision ?? null;
    const lastOutcome = () => JSON.parse(readFileSync(statePath(root, STATE_FILES.guardLog), "utf8").trim().split("\n").at(-1)).outcome;

    for (const command of ['grep -rn "Headers" $(grep -rln "class AuthorizeApiKey" --include=*.cs . | grep -v /obj/) | head', 'cat "$(git rev-parse --show-toplevel)/package.json"', "grep '$(x)' f", 'echo "$(echo "$(ls)")"']) {
      assert.equal(decision(command), "allow", command);
    }

    for (const command of ["echo $(rm -rf x)", "ls $(git push)", 'cat "$(echo ")"; rm -rf x)"']) {
      assert.equal(decision(command), "deny", command);
    }

    for (const command of ["echo $(curl -s u)", "echo $(echo x > f)", "$(git rev-parse --show-toplevel)/x", "$(echo x)/ls", "find . $(grep -l a b)", "rg $(echo x) y", 'cd "$(git rev-parse --show-toplevel)" && ls']) {
      assert.equal(decision(command), null, command);
    }

    assert.equal(decision('cat "${HOME}/x" "${X:-a}" "${X:-${Y}}" "${X:-${Y:-${Z}}}" "${X:-a/b.c}"'), "allow");
    const opaqueParameters = [
      `echo "\${X:-$(echo })"'"}" $(rm -rf ~) "'"`,
      `echo "\${X:-\`echo }\`}"'"}" $(rm -rf ~) "'"`,
      'echo "${X:-(}" $(rm -rf ~)',
      'echo "${X:-\\}}" $(rm -rf ~)',
      'echo "${X:-a" $(rm -rf ~)',
    ];
    for (const command of opaqueParameters) {
      assert.equal(decision(command), null, command);
      assert.equal(lastOutcome(), "fallthrough:hidden-execution", command);
    }
    for (const nested of ["${Y}", "${Y:-${Z}}", "${Y:-${Z:-${W}}}"]) {
      for (const hidden of ["$(rm -rf ~)", "`rm -rf ~`"]) {
        const command = `echo "\${X:-${nested}"'"}" ${hidden} "'"`;
        assert.equal(decision(command), null, command);
        assert.equal(lastOutcome(), "fallthrough:hidden-execution", command);
      }
    }
    for (const command of ["echo `ls`", "diff <(ls a) <(ls b)", "echo $((1+2))", "echo $(echo $(echo $(ls)))", "cat <<END\n$(whoami)\nEND", "echo $(ls", `echo "\${X:-"'"}" $(rm -rf ~) "'"`, `echo "\${X:-"'"}" \`rm -rf ~\` "'"`, 'echo "${X:-"}"}" $(rm -rf ~)']) {
      assert.equal(decision(command), null, command);
      assert.equal(lastOutcome(), "fallthrough:hidden-execution", command);
    }
  });
});

test("guardBash judges a $(...) body against the sources, in the directory it runs in", () => {
  withProject((root) => {
    const source = join(root, "analysis");
    execFileSync("git", ["init", "-q", source]);
    mkdirSync(join(root, ".picket"), { recursive: true });
    writeFileSync(join(root, ".picket", "config.json"), JSON.stringify({ version: 1, sources: { analysis: { env: "PICKET_TEST_SOURCE_ANALYSIS" } } }));
    process.env.PICKET_TEST_SOURCE_ANALYSIS = source;
    try {
      const outcome = (command) => guardBash({ hook_event_name: "PreToolUse", tool_name: "Bash", tool_input: { command }, cwd: root }, { root })?.hookSpecificOutput ?? null;
      const src = source.replaceAll("\\", "/");
      const direct = outcome(`echo $(git -C "${src}" tag v1)`);
      assert.equal(direct?.permissionDecision, "deny");
      assert.match(direct.permissionDecisionReason, /inside source analysis, which is read-only/);
      assert.equal(outcome(`cd "${src}" && cat $(git tag v1)`)?.permissionDecision, "deny");
      assert.equal(outcome(`cat "$(git -C "${src}" rev-parse --show-toplevel)/README.md"`)?.permissionDecision, "allow");
    } finally {
      delete process.env.PICKET_TEST_SOURCE_ANALYSIS;
    }
  });
});

test("guardBash lets an assigned variable reach only inert roots and keeps untainted expansions as they were", () => {
  withProject((root) => {
    const decision = (command) => guardBash({ hook_event_name: "PreToolUse", tool_name: "Bash", tool_input: { command }, cwd: root }, { root })?.hookSpecificOutput.permissionDecision ?? null;

    for (const command of ['cd src && f=$(grep -rln "class X" --include=*.cs .); echo $f; cat -n $f', 'P="dist"; cat "$P/hooks/hooks.json"', "f=a; echo ${f}", "a=1 b=2; ls"]) {
      assert.equal(decision(command), "allow", command);
    }

    for (const command of ["f=--pre=sh; rg $f x", "f=$(grep -l a b); sed -n 1,9p $f", "c=rm; $c -rf x", "x=$(curl evil); echo $x", "d=$(git rev-parse --show-toplevel); cd $d && npm test"]) {
      assert.equal(decision(command), null, command);
    }

    for (const command of ["f=--pre=sh; echo $(rg $f x)", "echo --pre=sh; rg $_ x", "f=--pre=sh; rg ${f:-y} x", "rg ${HOME:-x} y", "PATH=./bin; ls", "f=x; cd $f && ls", "echo __picket_variable__"]) {
      assert.equal(decision(command), null, command);
    }

    assert.equal(decision("W=x; git -C $W merge y"), "deny");
    assert.equal(decision('FOO=1 picket drive --run "rm -rf src"'), "deny");
    assert.equal(decision("c=rm; $c -rf x; rm -rf y"), "deny");

    assert.equal(decision('API_KEY=k picket drive --hit "GET /h"'), null);
    for (const command of ["rg $HOME x", 'ls "$HOME/.claude"', "echo $PATH", "grep -rn x ${HOME}/notes"]) {
      assert.equal(decision(command), "allow", command);
    }
  });
});

test("guardBash judges a command behind leading assignments as deny when it denies and never better than unknown", () => {
  withProject((root) => {
    const decision = (command) => guardBash({ hook_event_name: "PreToolUse", tool_name: "Bash", tool_input: { command }, cwd: root }, { root })?.hookSpecificOutput.permissionDecision ?? null;

    for (const command of ["FOO=1 git push origin v1", "FOO=1 rm -rf src", 'PICKET_ESCALATE="x" git push origin v1', "A=1 B=2 sudo ls", "FOO=1 ls; FOO=1 git reset --hard"]) {
      assert.equal(decision(command), "deny", command);
    }
    for (const command of ["FOO=1 git status", "PATH=/x ls", "GIT_EXTERNAL_DIFF=x git diff", "FOO=1 picket state x", "ls && FOO=1 cat a"]) {
      assert.equal(decision(command), null, command);
    }
    assert.equal(decision('FOO=1 picket drive --run "rm -rf src"'), "deny");
    assert.equal(decision("a=1 b=2; ls"), "allow");
  });
});

const PUSH = "git push origin v1.0.0-alpha.2";
const ESCALATED_PUSH = `PICKET_ESCALATE="you asked me to push the release tag" ${PUSH}`;

function withEscalationProject(fn) {
  withProject((root) => {
    const home = mkdtempSync(join(tmpdir(), "harness-home-"));
    try {
      const judge = (command, extra = {}) => guardBash({ hook_event_name: "PreToolUse", tool_name: "Bash", tool_input: { command }, cwd: root, session_id: "s1", permission_mode: "default", ...extra }, { root, home })?.hookSpecificOutput ?? null;
      const escalationRows = () => (existsSync(statePath(root, STATE_FILES.ledger)) ? readFileSync(statePath(root, STATE_FILES.ledger), "utf8").trim().split("\n").map((l) => JSON.parse(l)).filter((r) => r.event === "escalation") : []);
      fn({ root, home, judge, escalationRows });
    } finally {
      rmSync(home, { recursive: true, force: true });
    }
  });
}

test("ASKING_MODES holds default, acceptEdits and auto, each proven by a headless ask cell, and auto only while its interactive dialog is shown", () => {
  const record = JSON.parse(readFileSync(resolve("bench/results/ask-probe.json"), "utf8"));
  assert.deepEqual([...ASKING_MODES].sort(), ["acceptEdits", "auto", "default"]);
  for (const mode of ASKING_MODES) {
    const cell = record.cells.find((c) => c.scenario === "ask" && c.hook_permission_mode === mode);
    assert.ok(cell?.prompt_tool_called && !cell.error, `${mode} needs a headless ask cell that called the prompt tool`);
  }
  assert.equal(record.interactive?.auto_dialog, "shown", "auto is in ASKING_MODES, so the interactive probe must record its dialog as shown");
});

test("a marked push asks in default, acceptEdits and auto only, and denies for the mode everywhere else", () => {
  withEscalationProject(({ judge, escalationRows }) => {
    for (const mode of ["default", "acceptEdits", "auto"]) {
      assert.equal(judge(ESCALATED_PUSH, { permission_mode: mode, session_id: `asks-${mode}` }).permissionDecision, "ask", mode);
    }
    for (const mode of [undefined, "plan", "bypassPermissions", "dontAsk"]) {
      const out = judge(ESCALATED_PUSH, { permission_mode: mode, session_id: `denies-${mode}` });
      assert.equal(out.permissionDecision, "deny", String(mode));
      assert.ok(out.permissionDecisionReason.endsWith(`! ${PUSH}`), out.permissionDecisionReason);
    }
    assert.deepEqual(escalationRows().map((r) => r.why), [null, null, null, "mode", "mode", "mode", "mode"]);
  });
});

test("a marked destructive command asks in a proven mode, quoting the reason, and never allows", () => {
  withEscalationProject(({ judge, escalationRows }) => {
    const asked = judge(ESCALATED_PUSH, { agent_type: "picket:developer" });
    assert.equal(asked.permissionDecision, "ask");
    assert.match(asked.permissionDecisionReason, /escalation by developer: "you asked me to push the release tag"\. Approving runs this one command once; nothing carries over\./);
    assert.match(judge(ESCALATED_PUSH, { session_id: "s2" }).permissionDecisionReason, /escalation by main:/);
    for (const mode of [undefined, "auto", "plan", "default", "acceptEdits", "bypassPermissions", "dontAsk"]) {
      for (const command of [ESCALATED_PUSH, "PICKET_ESCALATE=x ls", "PICKET_ESCALATE=x git status"]) {
        assert.notEqual(judge(command, { permission_mode: mode, session_id: `mode-${mode}` })?.permissionDecision, "allow", `${mode} ${command}`);
      }
    }
    const rows = escalationRows();
    assert.equal(rows[0].outcome, "ask");
    assert.equal(rows[0].why, null);
    assert.equal(rows[0].command, PUSH);
    assert.equal(rows[0].reason, "you asked me to push the release tag");
    assert.equal(rows[0].agent, "developer");
    assert.equal(rows[0].session, "s1");
    assert.match(rows[0].key, /^[0-9a-f]{64}$/);
  });
});

test("a marked push in an absent or unlisted permission mode denies with the mode and the user's own route", () => {
  withEscalationProject(({ judge, escalationRows }) => {
    for (const permission_mode of [undefined, "plan", "bypassPermissions", "dontAsk"]) {
      const out = judge(ESCALATED_PUSH, { permission_mode });
      assert.equal(out.permissionDecision, "deny");
      assert.match(out.permissionDecisionReason, new RegExp(`permission mode ${permission_mode ?? "unknown"}`));
      assert.ok(out.permissionDecisionReason.endsWith(`run it yourself: ! ${PUSH}`), out.permissionDecisionReason);
    }
    assert.deepEqual(escalationRows().map((r) => [r.outcome, r.why]), [["denied", "mode"], ["denied", "mode"], ["denied", "mode"], ["denied", "mode"]]);
  });
});

test("a marker that is not one command alone with a literal reason denies with the shape cause", () => {
  withEscalationProject(({ judge, escalationRows }) => {
    const shapes = [
      "PICKET_ESCALATE=x git push && ls",
      "FOO=1 PICKET_ESCALATE=x git push",
      'PICKET_ESCALATE="$HOME" git push',
      "PICKET_ESCALATE= git push",
      "PICKET_ESCALATE=x; git push",
      "PICKET_ESCALATE=x git push > out.txt",
      "PICKET_ESCALATE=\"`whoami`\" git push",
      `PICKET_ESCALATE="${"y".repeat(201)}" git push`,
    ];
    for (const command of shapes) {
      const out = judge(command);
      assert.equal(out?.permissionDecision, "deny", command);
      assert.match(out.permissionDecisionReason, /escalate one command, alone/, command);
      assert.match(out.permissionDecisionReason, /run it yourself: ! /, command);
    }
    assert.equal(escalationRows().length, shapes.length);
    assert.ok(escalationRows().every((r) => r.outcome === "denied" && r.why === "shape"));
    for (const [index, command] of [`PICKET_ESCALATE='it'"'"'s the tag' git push`, 'PICKET_ESCALATE="say \\"go\\"" git push'].entries()) {
      assert.equal(judge(command, { session_id: `quotes-${index}` })?.permissionDecision, "ask", command);
    }
    assert.equal(escalationRows().at(-1).reason, 'say "go"');
  });
});

test("a marker on a command that does not deny falls through and records nothing; an unmarked command records nothing", () => {
  withEscalationProject(({ judge, escalationRows }) => {
    assert.equal(judge("PICKET_ESCALATE=x ls"), null);
    assert.equal(judge(PUSH).permissionDecision, "deny");
    assert.match(judge(PUSH).permissionDecisionReason, /run it alone as `PICKET_ESCALATE="<why>" <command>`/);
    assert.match(judge(PUSH).permissionDecisionReason, /never escalated: record it with `picket leave <id> --command "<command>"`/);
    assert.notEqual(judge('picket leave x --command "git push origin v1"')?.permissionDecision, "deny");
    assert.equal(judge("ls").permissionDecision, "allow");
    assert.deepEqual(escalationRows(), []);
  });
});

test("an approved escalation that failed counts as ran, so the next one asks fresh", () => {
  withEscalationProject(({ root, judge, escalationRows }) => {
    assert.equal(judge(ESCALATED_PUSH).permissionDecision, "ask");
    observeDrive({ hook_event_name: "PostToolUseFailure", tool_name: "Bash", tool_input: { command: ESCALATED_PUSH }, session_id: "s1" }, { root });
    assert.equal(judge(`PICKET_ESCALATE="the remote is fixed now" ${PUSH}`).permissionDecision, "ask");
    assert.deepEqual(escalationRows().map((r) => [r.outcome, r.why]), [["ask", null], ["ran", "failed"], ["ask", null]]);
  });
});

test("a command wrapped in a picket verb is judged past its leading assignments", () => {
  withEscalationProject(({ judge }) => {
    for (const command of ['picket drive --run "FOO=1 git push"', 'picket drive --run "PICKET_ESCALATE=x git push"']) {
      const out = judge(command);
      assert.equal(out?.permissionDecision, "deny", command);
      assert.match(out.permissionDecisionReason, /the command wrapped in a picket verb/, command);
    }
  });
});

test("the marker never reaches the source deny or the wrapped picket verb deny", () => {
  withEscalationProject(({ root, judge, escalationRows }) => {
    const source = join(root, "analysis");
    execFileSync("git", ["init", "-q", source]);
    mkdirSync(join(root, ".picket"), { recursive: true });
    writeFileSync(join(root, ".picket", "config.json"), JSON.stringify({ version: 1, sources: { analysis: { env: "PICKET_TEST_SOURCE_ANALYSIS" } } }));
    process.env.PICKET_TEST_SOURCE_ANALYSIS = source;
    try {
      const inSource = judge(`PICKET_ESCALATE=x git -C "${source.replaceAll("\\", "/")}" push`);
      assert.equal(inSource.permissionDecision, "deny");
      assert.match(inSource.permissionDecisionReason, /inside source analysis, which is read-only/);
      const wrapped = judge('PICKET_ESCALATE=x picket drive --run "rm -rf src"');
      assert.equal(wrapped.permissionDecision, "deny");
      assert.match(wrapped.permissionDecisionReason, /the command wrapped in a picket verb/);
      assert.deepEqual(escalationRows().map((r) => [r.outcome, r.why, r.reason]), [["denied", "source", "x"], ["denied", "wrapped_verb", "x"]]);
      judge(`git -C "${source.replaceAll("\\", "/")}" push`);
      assert.equal(escalationRows().length, 2);
    } finally {
      delete process.env.PICKET_TEST_SOURCE_ANALYSIS;
    }
  });
});

test("a saved allow rule that could approve the marked command turns the escalation into a deny naming the rule and its file", () => {
  for (const rule of ["Bash(*)", "Bash(PICKET_ESCALATE=*)"]) {
    withEscalationProject(({ root, judge, escalationRows }) => {
      mkdirSync(join(root, ".claude"), { recursive: true });
      const file = join(root, ".claude", "settings.local.json");
      writeFileSync(file, JSON.stringify({ permissions: { allow: [rule] } }));
      const out = judge(ESCALATED_PUSH);
      assert.equal(out.permissionDecision, "deny", rule);
      assert.ok(out.permissionDecisionReason.includes(`${rule} in ${file}`), out.permissionDecisionReason);
      assert.ok(out.permissionDecisionReason.endsWith(`run it yourself: ! ${PUSH}`));
      assert.deepEqual(escalationRows().map((r) => r.why), ["saved_rule"]);
    });
  }
});

test("an ask that never ran is not asked again in its session; one that ran gets a fresh ask; another session starts clean", () => {
  withEscalationProject(({ root, judge, escalationRows }) => {
    const ran = (command, session_id = "s1") => observeDrive({ hook_event_name: "PostToolUse", tool_name: "Bash", tool_input: { command }, session_id }, { root });
    assert.equal(judge(ESCALATED_PUSH).permissionDecision, "ask");
    const refused = judge(`PICKET_ESCALATE="a better reason this time" ${PUSH}`);
    assert.equal(refused.permissionDecision, "deny");
    assert.match(refused.permissionDecisionReason, /did not run \(refused, interrupted or failed\)/);
    assert.ok(refused.permissionDecisionReason.endsWith(`run it yourself: ! ${PUSH}`));
    assert.equal(judge(ESCALATED_PUSH, { session_id: "s2" }).permissionDecision, "ask");
    assert.equal(judge("PICKET_ESCALATE=x git push origin other-tag").permissionDecision, "ask");

    withEscalationProject(({ root: fresh, judge: freshJudge, escalationRows: freshRows }) => {
      assert.equal(freshJudge(ESCALATED_PUSH).permissionDecision, "ask");
      observeDrive({ hook_event_name: "PostToolUse", tool_name: "Bash", tool_input: { command: ESCALATED_PUSH }, session_id: "s1" }, { root: fresh });
      const again = freshJudge(`PICKET_ESCALATE="push it again" ${PUSH}`);
      assert.equal(again.permissionDecision, "ask");
      assert.deepEqual(freshRows().map((r) => r.outcome), ["ask", "ran", "ask"]);
    });

    ran("ls");
    assert.deepEqual(escalationRows().map((r) => [r.session, r.outcome, r.why]), [["s1", "ask", null], ["s1", "denied", "refused_before"], ["s2", "ask", null], ["s1", "ask", null]]);
  });
});

const POWERSHELL_ESCALATED_PUSH = `$env:PICKET_ESCALATE = "you asked me to push the release tag"; ${PUSH}`;

test("the escalation key is the same for the bash marker, both PowerShell marker quotes and the bare command", () => {
  const key = commandKey("git push");
  assert.equal(commandKey("$env:PICKET_ESCALATE='a'; git push"), key);
  assert.equal(commandKey('$env:PICKET_ESCALATE="b"; git push'), key);
  assert.equal(commandKey('PICKET_ESCALATE="c" git push'), key);
});

test("a PowerShell-marked push asks in default, acceptEdits and auto, denies for the mode in bypassPermissions, and is not asked twice when it never ran", () => {
  withEscalationProject(({ judge, escalationRows }) => {
    const powerShell = (command, extra = {}) => judge(command, { tool_name: "PowerShell", ...extra });
    for (const mode of ["default", "acceptEdits", "auto"]) {
      assert.equal(powerShell(POWERSHELL_ESCALATED_PUSH, { permission_mode: mode, session_id: `ps-${mode}` }).permissionDecision, "ask", mode);
    }
    const bypass = powerShell(POWERSHELL_ESCALATED_PUSH, { permission_mode: "bypassPermissions", session_id: "ps-bypassPermissions" });
    assert.equal(bypass.permissionDecision, "deny");
    assert.ok(bypass.permissionDecisionReason.endsWith(`run it yourself: ! ${PUSH}`), bypass.permissionDecisionReason);
    assert.equal(powerShell(POWERSHELL_ESCALATED_PUSH, { session_id: "ps-default" }).permissionDecision, "deny");
    assert.deepEqual(escalationRows().map((r) => [r.outcome, r.why]), [["ask", null], ["ask", null], ["ask", null], ["denied", "mode"], ["denied", "refused_before"]]);
    assert.equal(escalationRows()[0].command, PUSH);
  });
});

test("a PowerShell marker that is not first or stands before two commands denies on shape", () => {
  withEscalationProject(({ judge, escalationRows }) => {
    for (const command of [`git status; $env:PICKET_ESCALATE = "x"; ${PUSH}`, `$env:PICKET_ESCALATE = "x"; git status; ${PUSH}`, `$env:PICKET_ESCALATE = "x"; ${PUSH} > out.txt`]) {
      const out = judge(command, { tool_name: "PowerShell" });
      assert.equal(out?.permissionDecision, "deny", command);
      assert.match(out.permissionDecisionReason, /escalate one command, alone/, command);
    }
    assert.ok(escalationRows().every((r) => r.why === "shape"));
  });
});

test("a saved PowerShell rule that could approve the escalation turns it into a deny, and a Bash rule does not", () => {
  withEscalationProject(({ root, judge }) => {
    mkdirSync(join(root, ".claude"), { recursive: true });
    writeFileSync(join(root, ".claude", "settings.local.json"), JSON.stringify({ permissions: { allow: ["Bash(git *)", "PowerShell(picket *)"] } }));
    assert.equal(judge(POWERSHELL_ESCALATED_PUSH, { tool_name: "PowerShell" }).permissionDecision, "ask");
    writeFileSync(join(root, ".claude", "settings.local.json"), JSON.stringify({ permissions: { allow: ["PowerShell(git *)"] } }));
    const out = judge(POWERSHELL_ESCALATED_PUSH, { tool_name: "PowerShell", session_id: "s2" });
    assert.equal(out.permissionDecision, "deny");
    assert.match(out.permissionDecisionReason, /saved allow rule PowerShell\(git \*\)/);
  });
});

test("the PowerShell deny names the PowerShell marker form and the Bash deny keeps its text", () => {
  withEscalationProject(({ judge }) => {
    assert.match(judge(PUSH, { tool_name: "PowerShell" }).permissionDecisionReason, /\$env:PICKET_ESCALATE = "<why>"; <command>/);
    assert.equal(
      judge(PUSH).permissionDecisionReason,
      'guard.bash: command contains a destructive sub-command (e.g. rm, sudo, git push/reset/rebase/checkout/merge/clean). If the user asked for this action in this session or the work cannot continue without it, run it alone as `PICKET_ESCALATE="<why>" <command>` and the user decides in the dialog. Cleanup after the work is never escalated: record it with `picket leave <id> --command "<command>"` and it is listed when the item closes.',
    );
  });
});

test("the spawned guard.bash hook prints the ask for a marked push", () => {
  withProject((root) => {
    const home = mkdtempSync(join(tmpdir(), "harness-home-"));
    try {
      const event = { hook_event_name: "PreToolUse", tool_name: "Bash", tool_input: { command: ESCALATED_PUSH }, cwd: root, session_id: "s1", permission_mode: "default" };
      const out = execFileSync("node", [join(HOOKS, "guard.bash.mjs")], { input: JSON.stringify(event), encoding: "utf8", env: { ...process.env, CLAUDE_PROJECT_DIR: root, HOME: home, USERPROFILE: home } });
      assert.equal(JSON.parse(out).hookSpecificOutput.permissionDecision, "ask");
    } finally {
      rmSync(home, { recursive: true, force: true });
    }
  });
});

test("the spawned guard.bash hook allows reading the files an assigned substitution lists", () => {
  withProject((root) => {
    const command = 'cd src && f=$(grep -rln "class X" --include=*.cs .); echo $f; cat -n $f';
    const out = execFileSync("node", [join(HOOKS, "guard.bash.mjs")], { input: JSON.stringify({ tool_input: { command } }), encoding: "utf8", env: { ...process.env, CLAUDE_PROJECT_DIR: root } });
    assert.equal(JSON.parse(out).hookSpecificOutput.permissionDecision, "allow");
    const rows = readFileSync(statePath(root, STATE_FILES.guardLog), "utf8").trim().split("\n").map((l) => JSON.parse(l));
    assert.deepEqual(rows.map((r) => r.outcome), ["allow"]);
  });
});

test("the spawned guard.bash hook allows a grep over the files a substitution lists", () => {
  withProject((root) => {
    const command = 'grep -rn "Headers" $(grep -rln "class AuthorizeApiKey" --include=*.cs . | grep -v /obj/) | head';
    const out = execFileSync("node", [join(HOOKS, "guard.bash.mjs")], { input: JSON.stringify({ tool_input: { command } }), encoding: "utf8", env: { ...process.env, CLAUDE_PROJECT_DIR: root } });
    assert.equal(JSON.parse(out).hookSpecificOutput.permissionDecision, "allow");
    const rows = readFileSync(statePath(root, STATE_FILES.guardLog), "utf8").trim().split("\n").map((l) => JSON.parse(l));
    assert.deepEqual(rows.map((r) => r.outcome), ["allow"]);
  });
});

test("the spawned guard.bash hook allows a stderr discard and traces the allow", () => {
  withProject((root) => {
    const out = execFileSync("node", [join(HOOKS, "guard.bash.mjs")], { input: JSON.stringify({ tool_input: { command: "ls x 2>/dev/null" } }), encoding: "utf8", env: { ...process.env, CLAUDE_PROJECT_DIR: root } });
    assert.equal(JSON.parse(out).hookSpecificOutput.permissionDecision, "allow");
    const rows = readFileSync(statePath(root, STATE_FILES.guardLog), "utf8").trim().split("\n").map((l) => JSON.parse(l));
    assert.deepEqual(rows.map((r) => r.outcome), ["allow"]);
  });
});

function recordedNotifications(event, { platform = "win32", env = {} } = {}) {
  const calls = [];
  const result = notifyUser(event, { spawn: (command, args, options) => calls.push({ command, args, options }), platform, env });
  return { result, calls };
}

const PERMISSION_PROMPT = { hook_event_name: "Notification", notification_type: "permission_prompt", message: "  Claude needs your permission to use Bash  ", cwd: join("work", "shop") };
const decodedScript = (args) => Buffer.from(args[args.indexOf("-EncodedCommand") + 1], "base64").toString("utf16le");

test("notifyUser starts one detached, silent notifier for a permission or idle prompt and prints nothing", () => {
  for (const notification_type of ["permission_prompt", "idle_prompt"]) {
    const { result, calls } = recordedNotifications({ ...PERMISSION_PROMPT, notification_type }, { env: { PATH: "p" } });
    assert.equal(result, null);
    assert.equal(calls.length, 1, notification_type);
    const [{ command, options }] = calls;
    assert.equal(command, "cmd.exe");
    assert.deepEqual({ detached: options.detached, stdio: options.stdio, windowsHide: options.windowsHide }, { detached: true, stdio: "ignore", windowsHide: true });
    assert.deepEqual(options.env, { PATH: "p", PICKET_NOTIFY_TITLE: "Picket: shop", PICKET_NOTIFY_BODY: "Claude needs your permission to use Bash" });
  }
});

test("notifyUser starts nothing for another notification type, PICKET_NOTIFY=off, or a platform without a notifier", () => {
  assert.deepEqual(recordedNotifications({ ...PERMISSION_PROMPT, notification_type: "auth_success" }).calls, []);
  assert.deepEqual(recordedNotifications(PERMISSION_PROMPT, { env: { PICKET_NOTIFY: "off" } }).calls, []);
  assert.deepEqual(recordedNotifications(PERMISSION_PROMPT, { platform: "aix" }).calls, []);
  assert.equal(recordedNotifications(PERMISSION_PROMPT, { platform: "aix" }).result, null);
});

test("notifyUser titles a notification without a cwd Picket and fills an empty message", () => {
  const { calls } = recordedNotifications({ notification_type: "idle_prompt", message: " " });
  assert.equal(calls[0].options.env.PICKET_NOTIFY_TITLE, "Picket");
  assert.equal(calls[0].options.env.PICKET_NOTIFY_BODY, "Claude Code is waiting for you");
});

test("notifyUser cuts a long message to 200 characters", () => {
  const { calls } = recordedNotifications({ ...PERMISSION_PROMPT, message: "x".repeat(250) });
  assert.equal(calls[0].options.env.PICKET_NOTIFY_BODY, "x".repeat(200));
});

test("the Windows notifier launches powershell.exe through cmd.exe with constant arguments cmd cannot misread", () => {
  const { command, args } = notificationCommand("win32", { title: "50% off & more", body: "a|b<c>d^\"e" });
  assert.equal(command, "cmd.exe");
  assert.deepEqual(args.slice(0, -1), ["/d", "/c", "powershell.exe", "-NoProfile", "-NonInteractive", "-WindowStyle", "Hidden", "-EncodedCommand"]);
  assert.equal(args.some((arg) => /[%^&|<>"]/.test(arg)), false);
});

test("the Windows notifier runs one constant encoded script and carries the texts only in its environment", () => {
  const hostile = notificationCommand("win32", { title: "Picket: shop", body: "a\"b'$(x)" });
  const plain = notificationCommand("win32", { title: "other", body: "text" });
  assert.equal(decodedScript(hostile.args), decodedScript(plain.args));
  assert.match(decodedScript(hostile.args), /CreateTextNode\(\$env:PICKET_NOTIFY_TITLE\)/);
  assert.deepEqual(hostile.env, { PICKET_NOTIFY_TITLE: "Picket: shop", PICKET_NOTIFY_BODY: "a\"b'$(x)" });
  assert.equal(hostile.args.some((arg) => arg.includes("$(x)") || arg.includes("Picket: shop")), false);
});

test("the macOS and Linux notifiers pass the title and body as their own trailing arguments", () => {
  const texts = { title: "Picket: shop", body: "a\"b'$(x)" };
  const mac = notificationCommand("darwin", texts);
  const linux = notificationCommand("linux", texts);
  assert.equal(mac.command, "osascript");
  assert.deepEqual(mac.args.slice(-2), [texts.title, texts.body]);
  const scripts = mac.args.filter((_, i) => mac.args[i - 1] === "-e");
  assert.equal(scripts.some((line) => line.includes(texts.title) || line.includes(texts.body)), false);
  assert.equal(linux.command, "notify-send");
  assert.deepEqual(linux.args, ["--app-name=Picket", "--", texts.title, texts.body]);
  assert.equal(notificationCommand("aix", texts), null);
});

test("guardScope asks for the moved config and extensions, keeps .picket/state hook-only, and has no rule for any other folder", () => {
  withProject((root) => {
    const decide = (rel) => guardScope({ hook_event_name: "PreToolUse", tool_name: "Write", tool_input: { file_path: join(root, rel) }, cwd: root }, { root })?.hookSpecificOutput ?? null;
    assert.equal(decide(".picket/config.json").permissionDecision, "ask");
    assert.equal(decide(".picket/extensions/a/rules/r.md").permissionDecision, "ask");
    assert.equal(decide(".picket/state/ledger.jsonl").permissionDecision, "deny");
    assert.equal(decide("notes/config.json"), null);
  });
});
