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
  data: /`picket data` shows, approves and runs SQL against a database, so only the lead runs it on the user's word\./,
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

test("picket data, bare or inside picket drive --run, is denied to a spawned developer with its own reason, and the lead's show and approve are left to the lead (T-7.5)", (t) => {
  const root = project(t);
  const outcome = (command: string, agent: string | undefined) => guardOutput(command, { root, tool: "Bash", agent });
  for (const command of ["picket data approve data/a.sql --sha256 aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", 'picket drive --run "picket data show data/a.sql"', "picket data run 20261118-x customer"]) {
    const denied = outcome(command, "abcd-developer");
    assert.equal(denied?.permissionDecision, "deny", command);
    assert.match(denied?.permissionDecisionReason ?? "", LEAD_ONLY_REASONS.data, command);
    if (command.includes("data run")) assert.match(outcome(command, undefined)?.permissionDecisionReason ?? "", /runs only through the permission dialog/, `lead: ${command}`);
    else assert.notEqual(outcome(command, undefined)?.permissionDecision, "deny", `lead: ${command}`);
  }
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

test("the kernel script run directly and npm exec are launchers of a lead-only verb: denied to a spawned agent, no decision for the lead (T-2.2)", (t) => {
  const root = project(t);
  const decide = (command: string, agent?: string) => decision(command, { root, tool: "Bash", agent });
  for (const command of ["dist/bin/picket.mjs waive x", "./dist/bin/picket.mjs comment x", "picket.mjs comment x", "npm exec -- picket reply x", "npm exec picket waive x"]) {
    assert.equal(decide(command, "picket:developer"), "deny", command);
    assert.equal(decide(command), null, `lead: ${command}`);
  }
  assert.notEqual(decide("npm exec -- picket state x", "picket:developer"), "deny", "a read verb through npm exec");
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

test("a Perl write mode and an interpreter value flag before a heredoc are in-place code-write denials for the lead (T-1.5)", (t) => {
  const root = project(t);
  for (const [command, path] of [
    [`perl -e 'open(my $f, ">", "src/a.pl")'`, "src/a.pl"],
    [`perl -e "open(F, '>src/a.pl')"`, "src/a.pl"],
    ["python3 -W ignore <<'EOF'\nopen('src/a.py','w').write('x')\nEOF", "src/a.py"],
    ["node --require ./x.js <<'EOF'\nrequire('fs').writeFileSync('src/a.ts','x')\nEOF", "src/a.ts"],
  ]) {
    const out = guardOutput(command, { root, tool: "Bash", agent: undefined });
    assert.equal(out?.permissionDecision, "deny", command);
    assert.ok(out?.permissionDecisionReason.startsWith(CODE_WRITE_DENIAL(path)), out?.permissionDecisionReason);
  }
});

test("a Perl two-argument write with a space after the mode is an in-place code-write denial for the lead", (t) => {
  const root = project(t);
  for (const command of [`perl -e 'open(F, "> src/a.pl"); print F 1'`, `perl -e 'open(F, ">> src/a.pl")'`]) {
    const out = guardOutput(command, { root, tool: "Bash", agent: undefined });
    assert.equal(out?.permissionDecision, "deny", command);
    assert.ok(out?.permissionDecisionReason.startsWith(CODE_WRITE_DENIAL("src/a.pl")), out?.permissionDecisionReason);
  }
});

test("an interpreter under a versioned or aliased name is an in-place code-write denial for the lead and an agent", (t) => {
  const root = project(t);
  for (const [command, path] of [
    [`python3.14 -c "open('src/a.py','w').write('x')"`, "src/a.py"],
    [`nodejs -e "require('fs').writeFileSync('src/a.ts','x')"`, "src/a.ts"],
  ]) {
    for (const agent of [undefined, "picket:developer"]) {
      const out = guardOutput(command, { root, tool: "Bash", agent });
      assert.equal(out?.permissionDecision, "deny", `${agent ?? "lead"}: ${command}`);
      assert.ok(out?.permissionDecisionReason.startsWith(CODE_WRITE_DENIAL(path)), out?.permissionDecisionReason);
    }
  }
});

test("a php, lua or Rscript inline write is an in-place code-write denial for the lead and an agent", (t) => {
  const root = project(t);
  for (const command of [`php -r 'file_put_contents("src/a.ts", "x");'`, `lua -e 'io.open("src/a.ts","w"):write("x")'`, `Rscript -e 'writeLines("x", "src/a.ts")'`]) {
    for (const agent of [undefined, "picket:developer"]) {
      const out = guardOutput(command, { root, tool: "Bash", agent });
      assert.equal(out?.permissionDecision, "deny", `${agent ?? "lead"}: ${command}`);
      assert.ok(out?.permissionDecisionReason.startsWith(CODE_WRITE_DENIAL("src/a.ts")), out?.permissionDecisionReason);
    }
  }
});

test("a php, lua or gawk program attached to its flag is an in-place code-write denial for the lead and an agent", (t) => {
  const root = project(t);
  for (const command of [
    `php -r'file_put_contents("src/a.ts","x");'`,
    `lua -e'io.open("src/a.ts","w"):write("x")'`,
    `gawk -e'BEGIN { print "x" > "src/a.ts" }'`,
    `gawk --source='BEGIN { print "x" > "src/a.ts" }'`,
    `gawk -e 'BEGIN { print "x" > "src/a.ts" }' -e1`,
    `php -B 'file_put_contents("src/a.ts","x");' -R'echo 1;'`,
    `lua -e 'io.open("src/a.ts","w"):write("x")' -ex=1`,
    `Rscript -e 'writeLines("x", "src/a.ts")' -e1`,
  ]) {
    for (const agent of [undefined, "picket:developer"]) {
      const out = guardOutput(command, { root, tool: "Bash", agent });
      assert.equal(out?.permissionDecision, "deny", `${agent ?? "lead"}: ${command}`);
      assert.ok(out?.permissionDecisionReason.startsWith(CODE_WRITE_DENIAL("src/a.ts")), out?.permissionDecisionReason);
    }
  }
});

test("a php or gawk cluster ending in its program flag is an in-place code-write denial for the lead and an agent (T-1.6)", (t) => {
  const root = project(t);
  for (const command of [`php -nr'file_put_contents("src/a.ts","x");'`, `gawk -be'BEGIN { print "x" > "src/a.ts" }'`]) {
    for (const agent of [undefined, "picket:developer"]) {
      const out = guardOutput(command, { root, tool: "Bash", agent });
      assert.equal(out?.permissionDecision, "deny", `${agent ?? "lead"}: ${command}`);
      assert.ok(out?.permissionDecisionReason.startsWith(CODE_WRITE_DENIAL("src/a.ts")), out?.permissionDecisionReason);
    }
  }
});

test("a gawk or R script read from /dev/stdin in a quoted heredoc is an in-place code-write denial for the lead and an agent", (t) => {
  const root = project(t);
  for (const [command, path] of [
    [`gawk --file=/dev/stdin <<'EOF'\nBEGIN { print "x" > "src/a.ts" }\nEOF`, "src/a.ts"],
    [`R --no-save -f /dev/stdin <<'EOF'\nwriteLines("x", "src/a.R")\nEOF`, "src/a.R"],
  ]) {
    for (const agent of [undefined, "picket:developer"]) {
      const out = guardOutput(command, { root, tool: "Bash", agent });
      assert.equal(out?.permissionDecision, "deny", `${agent ?? "lead"}: ${command}`);
      assert.ok(out?.permissionDecisionReason.startsWith(CODE_WRITE_DENIAL(path)), out?.permissionDecisionReason);
    }
  }
});

test("a python3 or node program read from /dev/stdin in a quoted heredoc is an in-place code-write denial for the lead and an agent (T-2.6)", (t) => {
  const root = project(t);
  for (const [command, path] of [
    ["python3 /dev/stdin <<'EOF'\nopen('src/a.py','w').write('x')\nEOF", "src/a.py"],
    ["node /dev/stdin <<'EOF'\nrequire('fs').writeFileSync('src/a.ts','x')\nEOF", "src/a.ts"],
  ]) {
    for (const agent of [undefined, "picket:developer"]) {
      const out = guardOutput(command, { root, tool: "Bash", agent });
      assert.equal(out?.permissionDecision, "deny", `${agent ?? "lead"}: ${command}`);
      assert.ok(out?.permissionDecisionReason.startsWith(CODE_WRITE_DENIAL(path)), out?.permissionDecisionReason);
    }
  }
});

test("a program echoed or printed into an interpreter, directly or through bash -c, is an in-place code-write denial for the lead and an agent (T-3.4)", (t) => {
  const root = project(t);
  for (const [command, path] of [
    [`echo 'open("src/a.py","w").write("x")' | python3`, "src/a.py"],
    [`bash -c "echo 'open(\\"src/a.py\\",\\"w\\").write(\\"x\\")' | python3"`, "src/a.py"],
    [`printf '%s' 'require("fs").writeFileSync("src/a.ts","x")' | node`, "src/a.ts"],
  ]) {
    for (const agent of [undefined, "picket:developer"]) {
      const out = guardOutput(command, { root, tool: "Bash", agent });
      assert.equal(out?.permissionDecision, "deny", `${agent ?? "lead"}: ${command}`);
      assert.ok(out?.permissionDecisionReason.startsWith(CODE_WRITE_DENIAL(path)), out?.permissionDecisionReason);
    }
  }
});

test("a perl or ruby program attached to a flag cluster, and an echo behind command or a brace group, are in-place code-write denials for the lead and an agent", (t) => {
  const root = project(t);
  for (const [command, path] of [
    [`perl -we'open(F,">src/a.pl"); print F "x"'`, "src/a.pl"],
    [`ruby -we'open("src/a.rb","w"){|f| f.puts 1}'`, "src/a.rb"],
    [`command echo 'open("src/a.py","w").write("x")' | python3`, "src/a.py"],
    [`{ echo 'open("src/a.py","w").write("x")'; } | python3`, "src/a.py"],
  ]) {
    for (const agent of [undefined, "picket:developer"]) {
      const out = guardOutput(command, { root, tool: "Bash", agent });
      assert.equal(out?.permissionDecision, "deny", `${agent ?? "lead"}: ${command}`);
      assert.ok(out?.permissionDecisionReason.startsWith(CODE_WRITE_DENIAL(path)), out?.permissionDecisionReason);
    }
  }
});

test("a program echoed into python3 from PowerShell is denied (T-3.4)", (t) => {
  const out = guardOutput(`echo "open('src/a.py','w').write('x')" | python3`, { root: project(t), tool: "PowerShell" });
  assert.equal(out?.permissionDecision, "deny");
  assert.ok(out?.permissionDecisionReason.startsWith(CODE_WRITE_DENIAL("src/a.py")), out?.permissionDecisionReason);
});

test("an echo beside a python3 script file and a cat piped into python3 are no denial for the lead (T-3.5)", (t) => {
  const root = project(t);
  for (const command of [`echo 'open("src/a.py","w").write("x")' | python3 fix.py`, "cat fix.py | python3"]) {
    assert.notEqual(guardOutput(command, { root, tool: "Bash" })?.permissionDecision, "deny", command);
  }
});

test("an awk redirect, a gawk inplace edit and a tclsh open for writing are in-place code-write denials for the lead and an agent", (t) => {
  const root = project(t);
  for (const command of [`awk 'BEGIN { print "x" > "src/a.ts" }'`, "gawk -i inplace '{ print }' src/a.ts", "tclsh <<'EOF'\nset f [open src/a.ts w]\nEOF"]) {
    for (const agent of [undefined, "picket:developer"]) {
      const out = guardOutput(command, { root, tool: "Bash", agent });
      assert.equal(out?.permissionDecision, "deny", `${agent ?? "lead"}: ${command}`);
      assert.ok(out?.permissionDecisionReason.startsWith(CODE_WRITE_DENIAL("src/a.ts")), out?.permissionDecisionReason);
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

const TESTER_REASON = "guard.bash: the tester runs only picket test, env start, env replay, env status and state, written out plainly; it reads files with Read, and never the item's own files";
const CASE_CALL = "picket test case 20261117-x --criterion T-2.1 --kind normal --intent x <<'EOF'\nrequest GET {orders}/orders\nexpect status 200\nEOF";
const READING_COMMANDS: [string, "allow" | null][] = [
  ["cat src/a.mts", "allow"],
  ["git diff", "allow"],
  ["picket summary 20261117-x", "allow"],
  ['picket drive --run "cat src/a.mts"', null],
  ['picket test note 20261117-x T-2.1 normal blocked --why "$(cat src/a.mts)"', null],
];

test("the tester's case call with a quoted heredoc of steps is not denied (T-4.4)", (t) => {
  assert.notEqual(decision(CASE_CALL, { root: project(t), tool: "Bash", agent: "abcd-tester" }), "deny");
});

test("the tester is denied every reading command with the tester reason (T-4.4)", (t) => {
  const root = project(t);
  for (const [command] of READING_COMMANDS) {
    const out = guardOutput(command, { root, tool: "Bash", agent: "abcd-tester" });
    assert.deepEqual([out?.permissionDecision, out?.permissionDecisionReason], ["deny", TESTER_REASON], command);
  }
});

test("the developer keeps the decision each command had on the base, before the tester guard (T-4.4)", (t) => {
  const root = project(t);
  const base: [string, "allow" | null][] = [...READING_COMMANDS, [CASE_CALL, null]];
  for (const [command, before] of base) assert.equal(decision(command, { root, tool: "Bash", agent: "picket:developer" }), before, command);
});

test("the tester is denied any PowerShell command, even a picket call", (t) => {
  assert.equal(decision("picket state 20261117-x", { root: project(t), tool: "PowerShell", agent: "abcd-tester" }), "deny");
});
