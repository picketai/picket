import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { gitIn } from "#test/git.mts";
import { guardOutput } from "#test/hook.mts";
import { withProject, writeConfig } from "#test/project.mts";

test("guardBash judges a $(...) body against the sources, in the directory it runs in", (t) => {
  const root = withProject(t, { host: true, picket: false });
  const source = join(root, "analysis");
  gitIn(root, "init", "-q", source);
  writeConfig(root, { version: 1, sources: { analysis: { env: "PICKET_TEST_SOURCE_ANALYSIS" } } });
  process.env.PICKET_TEST_SOURCE_ANALYSIS = source;
  try {
    const outcome = (command: string) => guardOutput(command, { root, tool: "Bash" });
    const src = source.replaceAll("\\", "/");
    const direct = outcome(`echo $(git -C "${src}" tag v1)`);
    assert.equal(direct?.permissionDecision, "deny");
    assert.match(direct?.permissionDecisionReason ?? "", /inside source analysis, which is read-only/);
    assert.equal(outcome(`cd "${src}" && cat $(git tag v1)`)?.permissionDecision, "deny");
    assert.equal(outcome(`cat "$(git -C "${src}" rev-parse --show-toplevel)/README.md"`)?.permissionDecision, "allow");
  } finally {
    delete process.env.PICKET_TEST_SOURCE_ANALYSIS;
  }
});
