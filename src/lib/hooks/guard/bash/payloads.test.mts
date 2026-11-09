import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { isLeadOnly } from "./kernel.mts";
import { VERB_NAMES } from "../../../verbs.mts";
import { decision, guardOutput } from "#test/hook.mts";
import { withProject } from "#test/project.mts";

const project = (t: TestContext) => withProject(t, { host: true, picket: false });

const LEAD_ONLY_REASONS: Record<string, RegExp> = {
  comment: /`picket comment` records the user's approval, so only the lead runs it/,
  waive: /`picket waive` records the user's approval, so only the lead runs it/,
  reply: /`picket reply` records the user's approval, so only the lead runs it/,
  uninstall: /`picket uninstall` removes Picket from the project, so it is the user's to run\./,
};

test("only the lead and the user run picket waive and picket comment; a spawned agent is denied", (t) => {
  const root = project(t);
  const outcome = (command: string, agent: string | undefined, tool = "Bash") => guardOutput(command, { root, tool, agent });
  for (const verb of Object.keys(VERB_NAMES).filter(isLeadOnly)) {
    const command = `picket ${verb} 20261018-x --path test/a.test.ts --text "it.skip("`;
    for (const agent of ["picket:developer", "developer", "reviewer", "picket:architect"]) {
      const out = outcome(command, agent);
      assert.equal(out?.permissionDecision, "deny", `${agent} ${verb}`);
      assert.ok(verb in LEAD_ONLY_REASONS, `no reason pinned for ${verb}`);
      assert.match(out?.permissionDecisionReason ?? "", LEAD_ONLY_REASONS[verb]);
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
    assert.match(out?.permissionDecisionReason ?? "", /expansion in the verb position/, hidden);
  }
  assert.equal(outcome("$V = 'waive'; picket $V x", "picket:developer", "PowerShell")?.permissionDecision, "deny", "PowerShell variable verb");
  assert.notEqual(outcome("picket $(echo waive) x", undefined)?.permissionDecision, "deny", "the lead is not refused");
  assert.notEqual(outcome("picket state 20261018-x", "picket:developer")?.permissionDecision, "deny");
});

test("every launcher form of a lead-only verb is denied to a spawned agent", (t) => {
  const root = project(t);
  const outcome = (command: string, agent: string | undefined) => guardOutput(command, { root, tool: "Bash", agent });
  const forms = (verb: string) => [
    `npx picket ${verb} x`,
    `npx --yes picket ${verb} x`,
    `picket.cmd ${verb} x`,
    `C:/tools/picket.cmd ${verb} x`,
    `picket.ps1 ${verb} x`,
    `picket --human ${verb} x`,
    `picket --pretty --json ${verb} x`,
    `node core/bin/picket.mjs --human ${verb} x`,
  ];
  for (const verb of Object.keys(VERB_NAMES).filter(isLeadOnly)) {
    for (const command of forms(verb)) {
      const denied = outcome(command, "picket:developer");
      assert.equal(denied?.permissionDecision, "deny", command);
      assert.match(denied?.permissionDecisionReason ?? "", LEAD_ONLY_REASONS[verb], command);
    }
  }
  assert.notEqual(outcome("npx picket state x", "picket:developer")?.permissionDecision, "deny", "a read verb through npx");
});

test("a variable standing for picket is never allowed to a spawned agent", (t) => {
  const root = project(t);
  for (const command of ["p=picket; $p uninstall --yes", "$P uninstall --yes"]) {
    assert.notEqual(decision(command, { root, tool: "Bash", agent: "picket:developer" }), "allow", command);
  }
});

test("a spawned agent is denied picket uninstall, in any form; the lead is not", (t) => {
  const root = project(t);
  const outcome = (command: string, agent: string | undefined) => guardOutput(command, { root, tool: "Bash", agent });
  for (const command of ["picket uninstall --yes", "picket uninstall --dry-run", `picket --root ${root} uninstall --yes --remove-work`]) {
    const denied = outcome(command, "picket:developer");
    assert.equal(denied?.permissionDecision, "deny", command);
    assert.match(denied?.permissionDecisionReason ?? "", LEAD_ONLY_REASONS.uninstall, command);
    assert.doesNotMatch(denied?.permissionDecisionReason ?? "", /records the user's approval/, command);
    assert.equal(outcome(command, "reviewer")?.permissionDecision, "deny", command);
    assert.notEqual(outcome(command, undefined)?.permissionDecision, "deny", `lead: ${command}`);
  }
});

const WAIVE = "picket waive 20261018-x --path p --text t";

test("the lead-only rule reaches inside eval, shell -c, argv wrappers, PowerShell hosts and cmd /c (T-2.1)", (t) => {
  const root = project(t);
  const outcome = (command: string, tool = "Bash") => guardOutput(command, { root, tool, agent: "picket:developer" });
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
    assert.match(out?.permissionDecisionReason ?? "", /picket waive|picket comment/, command);
  }
});

test("an unreadable payload that mentions picket is denied for an agent; ordinary wrappers keep their decision (T-2.2, T-2.3)", (t) => {
  const root = project(t);
  const decide = (command: string, agent?: string) => decision(command, { root, tool: "Bash", agent });
  const hidden = `CMD="${WAIVE}"; bash -c "$CMD"`;
  assert.equal(decide(hidden, "picket:developer"), "deny");
  assert.equal(decide(`bash -c "$(echo picket) waive x"`, "picket:developer"), "deny");
  for (const command of ["bash -c 'npm test'", "timeout 30 npm test", 'bash -c "echo $HOME"']) assert.equal(decide(command, "picket:developer"), null, command);
  for (const command of [`eval ${WAIVE}`, `bash -c '${WAIVE}'`, hidden]) assert.equal(decide(command, undefined), null, `lead: ${command}`);
  assert.equal(decide("bash -c 'for f in .picket/state/scratch/*.mjs; do node $f; done'", "picket:developer"), null, "a .picket/ path is not a mention of the picket command");
  assert.equal(decide("bash -c 'node dist/bin/picket.mjs $VERB x'", "picket:developer"), "deny", "the kernel script is a mention");
  assert.equal(decide("command -v picket", "picket:developer"), null, "a lookup of the picket command is not a call");
});

const CODE_WRITE_DENIAL = (path: string) => `guard.bash: ${path} is code; a shell write skips guard.comments and guard.silenced. Write it with the Edit or Write tool.`;
const IN_PLACE_EDITS = new Set(["sed -i 's/a/b/' src/a.cs", "sed -i.bak -e 's/a/b/' src/b.cs", 'sh -c "sed -i s/a/b/ src/a.ts"']);

test("a spawned agent's shell write to a code or test file is denied, naming the path and the Write tool; the lead is denied only an in-place edit (T-2.4)", (t) => {
  const root = project(t);
  const outcome = (command: string, agent: string | undefined, tool = "Bash") => guardOutput(command, { root, tool, agent });
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
    assert.ok(out?.permissionDecisionReason.startsWith(CODE_WRITE_DENIAL(path)), out?.permissionDecisionReason);
    const lead = outcome(command, undefined, tool);
    if (IN_PLACE_EDITS.has(command)) assert.ok(lead?.permissionDecisionReason.startsWith(CODE_WRITE_DENIAL(path)), `lead: ${command}`);
    else assert.equal(lead, null, `lead: ${command}`);
  }
});

const BENCH_SKIP_EDIT = `sed -i 's/^describe("JsonInvoiceRepository"/describe.skip("JsonInvoiceRepository"/; s/^describe("MemoryInvoiceRepository"/describe.skip("MemoryInvoiceRepository"/' test/repository.test.ts && git diff --stat && picket check --human`;
const PYTHON_HEREDOC_EDIT = [
  "python3 - <<'EOF'",
  "p='src/mods/status/hooks/index.test.tsx'",
  "s=open(p,encoding='utf-8').read()",
  "open(p,'w',encoding='utf-8').write(s.replace('a','b'))",
  "EOF",
].join("\n");

test("an in-place shell edit of a code file is denied to the lead and to an agent, naming the path (T-3.1, T-3.2, T-3.3)", (t) => {
  const root = project(t);
  const cases: [string, string, (string | undefined)[]][] = [
    [BENCH_SKIP_EDIT, "test/repository.test.ts", [undefined, "picket:developer"]],
    [PYTHON_HEREDOC_EDIT, "src/mods/status/hooks/index.test.tsx", [undefined, "picket:developer"]],
    ["perl -pi -e 's/a/b/' src/a.ts", "src/a.ts", [undefined]],
    [`node -e "require('fs').writeFileSync('src/a.mts', 'x')"`, "src/a.mts", [undefined]],
    [`python3 -c "open('src/a.py', 'w').write('x')"`, "src/a.py", [undefined]],
    ['sh -c "sed -i s/a/b/ src/a.ts"', "src/a.ts", [undefined]],
    [`node --eval="require('fs').writeFileSync('src/a.ts','x')"`, "src/a.ts", [undefined]],
    [`node -pe "require('fs').writeFileSync('src/a.ts','x')"`, "src/a.ts", [undefined]],
    [`python3 -Bc "open('src/a.py','w').write('x')"`, "src/a.py", [undefined]],
    ["python3 -X utf8 - <<'EOF'\nopen('src/a.py','w').write('x')\nEOF", "src/a.py", [undefined, "picket:developer"]],
    [`python3 <<< "open('src/a.py','w').write('x')"`, "src/a.py", [undefined, "picket:developer"]],
  ];
  for (const [command, path, agents] of cases) {
    for (const agent of agents) {
      const out = guardOutput(command, { root, tool: "Bash", agent });
      assert.equal(out?.permissionDecision, "deny", `${agent ?? "lead"}: ${command}`);
      assert.ok(out?.permissionDecisionReason.startsWith(CODE_WRITE_DENIAL(path)), out?.permissionDecisionReason);
    }
  }
});

test("a redirect, tee or PowerShell writer to a code file stays denied to an agent only (T-3.4)", (t) => {
  const root = project(t);
  for (const [command, tool] of [["echo x >> src/a.ts"], ["printf x | tee -a src/a.py"], ["cat > test/kernel/x.test.mjs <<'EOF'\nx\nEOF"], ["Set-Content src/a.ts x", "PowerShell"]]) {
    assert.equal(guardOutput(command, { root, tool: tool ?? "Bash", agent: undefined }), null, `lead: ${command}`);
    assert.equal(decision(command, { root, tool: tool ?? "Bash", agent: "picket:developer" }), "deny", `developer: ${command}`);
  }
});

test("reads, test runs and writes of state or notes are not in-place code-write denials (T-3.5)", (t) => {
  const root = project(t);
  const notes = "python3 - <<'EOF'\np='.claude/agent-memory/picket-developer/notes.md'\nopen(p,'w').write(open(p).read())\nEOF";
  for (const command of [`python3 -c "import json,sys; print(json.load(sys.stdin))"`, "node --test test/cli/close.test.mjs", notes, `node -e "require('fs').writeFileSync('.picket/state/scratch/a.mjs', 'x')"`, "sed -n '1,5p' src/a.ts"]) {
    for (const agent of [undefined, "picket:developer"]) {
      const reason = guardOutput(command, { root, tool: "Bash", agent })?.permissionDecisionReason ?? "";
      assert.doesNotMatch(reason, /is code; a shell write/, `${agent ?? "lead"}: ${command}`);
    }
  }
});

test("the lead's escalated sed -i gets the decision an agent's escalated sed -i gets (T-3.6)", (t) => {
  const root = project(t);
  const command = `PICKET_ESCALATE="the user asked" sed -i 's/a/b/' src/a.ts`;
  const developer = guardOutput(command, { root, tool: "Bash", agent: "picket:developer" });
  assert.equal(developer, null);
  assert.deepEqual(guardOutput(command, { root, tool: "Bash", agent: undefined }), developer);
});

test("a delete wrapped in cmd or a PowerShell host is denied from the Bash tool with the destructive denial of rm", (t) => {
  const root = project(t);
  const reason = (command: string) => guardOutput(command, { root, tool: "Bash", agent: "picket:developer" });
  const rm = reason("rm a.txt");
  assert.equal(rm?.permissionDecision, "deny");
  for (const command of ["cmd //c del a.txt", "cmd.exe /c erase a.txt", 'cmd /c "rd /s /q build"', "pwsh -Command Remove-Item a.txt", 'powershell -c "ri a.txt"', 'cmd /c "dir & del a.txt"']) {
    const out = reason(command);
    assert.equal(out?.permissionDecision, "deny", command);
    assert.equal(out?.permissionDecisionReason, rm?.permissionDecisionReason, command);
  }
});

test("a wrapped delete behind a group, an echo-off @ or a PowerShell script block is still denied", (t) => {
  const root = project(t);
  for (const command of ['cmd /c "(del a.txt)"', "cmd /c @del a.txt", 'pwsh -Command "& { Remove-Item a.txt }"']) {
    assert.equal(decision(command, { root, tool: "Bash", agent: "picket:developer" }), "deny", command);
  }
});

test("cmd /c del from the PowerShell tool is denied with the PowerShell destructive denial", (t) => {
  const root = project(t);
  const out = guardOutput("cmd /c del a.txt", { root, tool: "PowerShell", agent: "picket:developer" });
  assert.equal(out?.permissionDecision, "deny");
  assert.match(out?.permissionDecisionReason ?? "", /^guard\.bash: PowerShell command contains a destructive sub-command/);
});

test("a wrapper that runs no delete keeps its decision", (t) => {
  const root = project(t);
  for (const command of ["cmd //c mklink b a", "cmd /c dir", "pwsh -c Get-ChildItem"]) {
    assert.equal(decision(command, { root, tool: "Bash", agent: "picket:developer" }), null, command);
  }
});

test("an escalated wrapped delete gets the same decision as an escalated rm", (t) => {
  const root = project(t);
  const outcome = (command: string) => decision(command, { root, tool: "Bash", agent: "picket:developer" });
  assert.equal(outcome('PICKET_ESCALATE="you asked" cmd //c del a.txt'), outcome('PICKET_ESCALATE="you asked" rm a.txt'));
});

test("state files, docs, discards, stream plumbing and code outside the project are not shell-write denials (T-2.5)", (t) => {
  const root = project(t);
  const reason = (command: string) => guardOutput(command, { root, tool: "Bash", agent: "picket:developer" })?.permissionDecisionReason ?? "";
  const outside = join(tmpdir(), "elsewhere", "a.ts").replaceAll("\\", "/");
  for (const command of ["echo x > .picket/state/scratch/a.mjs", "echo x > notes.md", "node gen.mjs > /dev/null", "npm test 2>&1 | tail -5", `echo x > '${outside}'`, "sed -n '1,5p' src/a.ts", "tee notes.txt"]) {
    assert.doesNotMatch(reason(command), /is code; a shell write/, command);
  }
});
