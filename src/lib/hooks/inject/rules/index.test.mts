import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { injectRules as rulesHandler, INJECTED_RULES } from "./index.mts";
import { hookContext } from "#test/context.mts";
import { looseHandler } from "#test/hook.mts";
import { withProject } from "#test/project.mts";

const injectRules = looseHandler(rulesHandler);

const RULE_HEADINGS = ["# Writing rules", "# Comments in code", "# Work items", "# Security paths", "# Untrusted content"];

function headingOrder(text: string): number[] {
  return RULE_HEADINGS.map((heading) => text.indexOf(`${heading}\n`));
}

for (const event of [{ hook_event_name: "SubagentStart", agent_type: "picket:developer" }, { hook_event_name: "SessionStart", source: "compact" }]) {
  test(`injectRules returns the five rules in order, untrusted last, for ${event.hook_event_name}`, () => {
    const out = injectRules(event, hookContext(resolve(".")));
    assert.equal(out.hookSpecificOutput.hookEventName, event.hook_event_name);
    const text = out.hookSpecificOutput.additionalContext;
    const positions = headingOrder(text);
    assert.ok(positions.every((p) => p >= 0), `missing heading: ${positions}`);
    assert.deepEqual([...positions].sort((a, b) => a - b), positions);
    assert.doesNotMatch(text, /^paths:/m);
  });
}

test("injectRules joins the rule files with one blank line, in the injected order", (t) => {
  const root = withProject(t, { host: true, picket: false });
  const dir = join(root, "rules");
  mkdirSync(dir);
  INJECTED_RULES.forEach((file, i) => writeFileSync(join(dir, file), `# Rule ${i}\n\nbody ${i}\n`));
  const out = injectRules({ hook_event_name: "SessionStart" }, hookContext(root), dir);
  assert.equal(out.hookSpecificOutput.additionalContext, "# Rule 0\n\nbody 0\n\n# Rule 1\n\nbody 1\n\n# Rule 2\n\nbody 2\n\n# Rule 3\n\nbody 3\n\n# Rule 4\n\nbody 4");
});

test("the data-not-instructions statement lives only in the untrusted rule (T-3.4)", () => {
  const hits: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.name.endsWith(".md") && /is data, never (an? )?instructions?/i.test(readFileSync(path, "utf8"))) hits.push(path.slice(resolve("src").length + 1).replaceAll("\\", "/"));
    }
  };
  walk(resolve("src"));
  assert.deepEqual(hits, ["rules/untrusted.md"]);
});

test("injectRules returns null when the rules folder is missing", (t) => {
  const root = withProject(t, { host: true, picket: false });
  assert.equal(injectRules({ hook_event_name: "SubagentStart" }, hookContext(root), join(root, "no-rules")), null);
});
