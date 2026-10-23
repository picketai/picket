import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { ROOTS } from "./rules.mts";
import { CANONICAL_GROUPS } from "../../../shared/shell/powershell.mts";
import { gitIn } from "#test/git.mts";
import { decision, guardOutput } from "#test/hook.mts";
import { withProject, writeConfig } from "#test/project.mts";

const project = (t: TestContext) => withProject(t, { host: true, picket: false });

test("a git global option that can set config or run a program sends a read-only subcommand to the prompt", (t) => {
  const root = project(t);
  for (const command of ["git -c core.pager='sh -c x' log", "git -c alias.l='!sh -c x' l", "git --config-env=core.pager=X log", "git -c diff.external=x diff", "git --exec-path=/tmp/x status", "git -p log"]) {
    assert.equal(decision(command, { root, tool: "Bash" }), null, command);
  }
  for (const command of ["git -C sub status", "git --no-pager log --oneline -3", "git --git-dir=.git --work-tree=. status"]) assert.equal(decision(command, { root, tool: "Bash" }), "allow", command);
  assert.equal(decision("git -c user.name=x push", { root, tool: "Bash" }), "deny");
});

const B1_FORMS = ["find . -fprint out.txt", "find . -fls x", "tree -o out.txt", "rg --pre ./x foo", "git log --output=x", "git diff --output=x", "git show --output=x HEAD"];

test("the B1 forms that write a file or run a program fall through, and inside a source they are denied (T-6.1)", (t) => {
  const root = project(t);
  for (const command of B1_FORMS) assert.equal(decision(command, { root, tool: "Bash" }), null, command);
  const source = join(root, "analysis");
  gitIn(root, "init", "-q", source);
  writeConfig(root, { version: 1, sources: { analysis: { env: "PICKET_TEST_SOURCE_ANALYSIS" } } });
  const env = { ...process.env, PICKET_TEST_SOURCE_ANALYSIS: source };
  for (const command of B1_FORMS) {
    const out = guardOutput(command, { root, tool: "Bash", cwd: source, env });
    assert.equal(out?.permissionDecision, "deny", command);
    assert.match(out?.permissionDecisionReason ?? "", /inside source analysis/, command);
  }
});

test("project tools fall through to the permission prompt, directly or through an npm script (T-6.2)", (t) => {
  const root = project(t);
  for (const command of ["prettier --write src", "eslint --fix src", "tsc", "vitest run"]) assert.equal(decision(command, { root, tool: "Bash" }), null, command);
  writeFileSync(join(root, "package.json"), JSON.stringify({ scripts: { test: "vitest run" } }));
  assert.equal(decision("npm test", { root, tool: "Bash" }), null);
});

test("read-only forms stay allowed and only print-only sed scripts pass the one sed checker (T-6.3)", (t) => {
  const root = project(t);
  for (const command of ["cat a.txt | head -5", "find . -name x", "rg foo src", "tree -L 2", "git log --oneline -5", "sed -n '$p' a.txt", "sed -n -e 1p a.txt"]) {
    assert.equal(decision(command, { root, tool: "Bash" }), "allow", command);
  }
  for (const command of ["sed -n 's/a/b/w out' a.txt", "sed -i 1p a.txt", "sed -n 1p -i a.txt"]) assert.equal(decision(command, { root, tool: "Bash" }), null, command);
});

test("every mixed-case root in the rule table is the canonical name of a PowerShell command group (T-6.4)", () => {
  const canonical = new Set(CANONICAL_GROUPS.map(([name]) => name));
  const mixed = Object.keys(ROOTS).filter((root) => /[A-Z]/.test(root));
  assert.ok(mixed.includes("Remove-Item"), mixed.join(", "));
  assert.deepEqual(mixed.filter((root) => !canonical.has(root)), []);
});
