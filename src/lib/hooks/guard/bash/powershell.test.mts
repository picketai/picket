import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { gitIn } from "#test/git.mts";
import { decision, guardOutput } from "#test/hook.mts";
import { withProject, writeConfig } from "#test/project.mts";

const project = (t: TestContext) => withProject(t, { host: true, picket: false });

test("guardBash under PowerShell denies destructive cmdlets, aliases and hidden segments, and leaves a worktree teardown to the prompt", (t) => {
  const root = project(t);
  const decide = (command: string) => decision(command, { root, tool: "PowerShell" });
  for (const command of ["Remove-Item -Recurse -Force build", "del build", "rd /s build", "Get-ChildItem; git push", "& git push", "Stop-Process -Name node", "Get-ChildItem | ForEach-Object { Remove-Item $_ }", "$r = git push origin main 2>&1", "$null = Remove-Item -Recurse x"]) {
    assert.equal(decide(command), "deny", command);
  }
  assert.equal(decide("Remove-Item -Recurse -Force '.worktrees/feat'"), null);
});

test("the PowerShell deny reason names the user's own route and never the bash marker", (t) => {
  const root = project(t);
  const out = guardOutput("Remove-Item -Recurse build", { root, tool: "PowerShell" });
  assert.ok(out);
  assert.match(out.permissionDecisionReason, /destructive sub-command/);
  assert.match(out.permissionDecisionReason, /! Remove-Item -Recurse build/);
  assert.equal(out.permissionDecisionReason.includes('PICKET_ESCALATE="<why>"'), false);
});

test("guardBash under PowerShell denies a write into a source and lets a read through to the prompt", (t) => {
  const root = project(t);
  const source = join(root, "analysis");
  gitIn(root, "init", "-q", source);
  writeConfig(root, { version: 1, sources: { analysis: { env: "PICKET_TEST_SOURCE_ANALYSIS" } } });
  process.env.PICKET_TEST_SOURCE_ANALYSIS = source;
  try {
    const src = source.replaceAll("\\", "/");
    const outcome = (command: string) => guardOutput(command, { root, tool: "PowerShell" });
    const write = outcome(`Set-Content ${src}/a.md x`);
    assert.equal(write?.permissionDecision, "deny");
    assert.match(write?.permissionDecisionReason ?? "", /inside source analysis, which is read-only/);
    assert.equal(outcome(`echo x > ${src}/a.md`)?.permissionDecision, "deny");
    assert.equal(outcome(`Set-Location ${src}; Remove-Item a.md`)?.permissionDecision, "deny");
    assert.notEqual(outcome(`Get-Content ${src}/a.md`)?.permissionDecision, "deny");
    assert.notEqual(outcome(`cat ${src}/a.md`)?.permissionDecision, "deny");
  } finally {
    delete process.env.PICKET_TEST_SOURCE_ANALYSIS;
  }
});
