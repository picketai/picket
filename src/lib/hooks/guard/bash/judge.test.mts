import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { decision, guardOutput } from "#test/hook.mts";
import { withProject } from "#test/project.mts";

const project = (t: TestContext) => withProject(t, { host: true, picket: false });

test("guardBash judges a command behind leading assignments as deny when it denies and never better than unknown", (t) => {
  const root = project(t);
  const decide = (command: string) => decision(command, { root, tool: "Bash" });
  for (const command of ["FOO=1 git push origin v1", "FOO=1 rm -rf src", 'PICKET_ESCALATE="x" git push origin v1', "A=1 B=2 sudo ls", "FOO=1 ls; FOO=1 git reset --hard"]) {
    assert.equal(decide(command), "deny", command);
  }
  for (const command of ["FOO=1 git status", "PATH=/x ls", "GIT_EXTERNAL_DIFF=x git diff", "FOO=1 picket state x", "ls && FOO=1 cat a"]) {
    assert.equal(decide(command), null, command);
  }
  assert.equal(decide('FOO=1 picket drive --run "rm -rf src"'), "deny");
  assert.equal(decide("a=1 b=2; ls"), "allow");
});

test("a command wrapped in a picket verb is judged past its leading assignments", (t) => {
  const root = project(t);
  const home = withProject(t, { picket: false });
  for (const command of ['picket drive --run "FOO=1 git push"', 'picket drive --run "PICKET_ESCALATE=x git push"']) {
    const out = guardOutput(command, { root, tool: "Bash", session: "s1", mode: "default", home });
    assert.equal(out?.permissionDecision, "deny", command);
    assert.match(out?.permissionDecisionReason ?? "", /the command wrapped in a picket verb/, command);
  }
});
