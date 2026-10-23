import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { runHookBundle } from "#test/hook.mts";
import { withProject, writeConfig } from "#test/project.mts";

function run(payload, root) {
  const r = runHookBundle("inject.extensions", payload, { root });
  assert.equal(r.status, 0, r.stderr);
  return r.json;
}

function projectWithReviewerExtension(t) {
  const root = withProject(t, { picket: false });
  const dir = join(root, ".picket", "extensions", "acme");
  mkdirSync(dir, { recursive: true });
  writeConfig(root, { version: 1, extensions: ["acme"] });
  writeFileSync(join(dir, "extension.json"), JSON.stringify({ name: "acme", version: "0.2.0", schema: 1, rules: ["rules.md"], agents: { reviewer: ["reviewer.md"] } }));
  writeFileSync(join(dir, "rules.md"), "Use pnpm, never npm.\n");
  writeFileSync(join(dir, "reviewer.md"), "Check every endpoint against openapi.yaml.\n");
  return root;
}

test("the spawned inject.extensions gives a picket:reviewer its addition on SubagentStart and the lead its rules on SessionStart", (t) => {
  const root = projectWithReviewerExtension(t);
  const reviewer = run({ hook_event_name: "SubagentStart", agent_type: "picket:reviewer", cwd: root }, root);
  assert.equal(reviewer.hookSpecificOutput.hookEventName, "SubagentStart");
  assert.match(reviewer.hookSpecificOutput.additionalContext, /## Extension acme 0\.2\.0\n\nUse pnpm, never npm\.\n\nCheck every endpoint against openapi\.yaml\./);
  const lead = run({ hook_event_name: "SessionStart", source: "startup", cwd: root }, root);
  assert.equal(lead.hookSpecificOutput.additionalContext, "## Extension acme 0.2.0\n\nUse pnpm, never npm.");
});
