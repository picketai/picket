import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { INJECTED_RULES } from "../../dist/lib/hooks/inject/rules/index.mjs";
import { hookProject, runHookBundle } from "#test/hook.mts";
import { withProject, writeConfig } from "#test/project.mts";

function run(payload, root) {
  const r = runHookBundle("inject.rules", payload, { root });
  assert.equal(r.status, 0, r.stderr);
  return r;
}

for (const payload of [{ hook_event_name: "SubagentStart", agent_type: "picket:developer" }, { hook_event_name: "SessionStart", source: "compact" }]) {
  test(`inject.rules prints the four rules in order, without frontmatter, on ${payload.hook_event_name}`, (t) => {
    const { root } = hookProject(t);
    const text = run({ ...payload, cwd: root }, root).json.hookSpecificOutput.additionalContext;
    const positions = ["# Writing rules", "# Comments in code", "# Work items", "# Security paths"].map((h) => text.indexOf(`${h}\n`));
    assert.ok(positions.every((p, i) => p >= 0 && (i === 0 || p > positions[i - 1])), `heading positions ${positions}`);
    assert.doesNotMatch(text, /^paths:/m);
  });
}

test("the inject.rules shell spawned for SubagentStart carries the untrusted rule (T-3.2)", () => {
  const r = runHookBundle("inject.rules", { hook_event_name: "SubagentStart", agent_type: "picket:analyst" });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.json.hookSpecificOutput.additionalContext, /^# Untrusted content$/m);
  assert.equal(INJECTED_RULES.at(-1), "untrusted.md");
});

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

test("the core rules hook prints the same bytes with and without an extension enabled", (t) => {
  const plain = withProject(t, { picket: false });
  const extended = projectWithReviewerExtension(t);
  const event = (root) => ({ hook_event_name: "SubagentStart", agent_type: "picket:reviewer", cwd: root });
  const rulesOut = (root) => run(event(root), root).stdout;
  assert.equal(rulesOut(extended), rulesOut(plain));
});
