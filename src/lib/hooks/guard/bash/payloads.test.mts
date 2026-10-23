import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { isLeadOnly } from "./kernel.mts";
import { VERB_NAMES } from "../../../verbs.mts";
import { decision, guardOutput } from "#test/hook.mts";
import { withProject } from "#test/project.mts";

const project = (t: TestContext) => withProject(t, { host: true, picket: false });

test("only the lead and the user run picket waive and picket comment; a spawned agent is denied", (t) => {
  const root = project(t);
  const outcome = (command: string, agent: string | undefined, tool = "Bash") => guardOutput(command, { root, tool, agent });
  for (const verb of Object.keys(VERB_NAMES).filter(isLeadOnly)) {
    const command = `picket ${verb} 20261018-x --path test/a.test.ts --text "it.skip("`;
    for (const agent of ["picket:developer", "developer", "reviewer", "picket:architect"]) {
      const out = outcome(command, agent);
      assert.equal(out?.permissionDecision, "deny", `${agent} ${verb}`);
      assert.match(out?.permissionDecisionReason ?? "", new RegExp(`picket ${verb}\` records the user's approval`));
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

test("a spawned agent's shell write to a code or test file is denied, naming the path and the Write tool; the lead's is unchanged (T-2.4)", (t) => {
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
    assert.ok(out?.permissionDecisionReason.startsWith(`guard.bash: ${path} is code; a shell write skips guard.comments and guard.silenced. Write it with the Edit or Write tool.`), out?.permissionDecisionReason);
    assert.equal(outcome(command, undefined, tool), null, `lead: ${command}`);
  }
});

test("state files, docs, discards, stream plumbing and code outside the project are not shell-write denials (T-2.5)", (t) => {
  const root = project(t);
  const reason = (command: string) => guardOutput(command, { root, tool: "Bash", agent: "picket:developer" })?.permissionDecisionReason ?? "";
  const outside = join(tmpdir(), "elsewhere", "a.ts").replaceAll("\\", "/");
  for (const command of ["echo x > .picket/state/scratch/a.mjs", "echo x > notes.md", "node gen.mjs > /dev/null", "npm test 2>&1 | tail -5", `echo x > '${outside}'`, "sed -n '1,5p' src/a.ts", "tee notes.txt"]) {
    assert.doesNotMatch(reason(command), /is code; a shell write/, command);
  }
});
