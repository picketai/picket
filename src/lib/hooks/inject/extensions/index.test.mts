import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { injectExtensions as extensionsHandler } from "./index.mts";
import { hookContext } from "#test/context.mts";
import { looseHandler } from "#test/hook.mts";
import { withProject, writeConfig } from "#test/project.mts";

const injectExtensions = looseHandler(extensionsHandler);

type ExtensionFixture = { manifest: Record<string, unknown>; files?: Record<string, string> };

function extensionProject(t: TestContext, extensions: string[], manifests: Record<string, ExtensionFixture>): string {
  const root = withProject(t, { picket: false });
  mkdirSync(join(root, ".picket", "extensions"), { recursive: true });
  writeConfig(root, { version: 1, extensions });
  for (const [name, { manifest, files }] of Object.entries(manifests)) {
    const dir = join(root, ".picket", "extensions", name);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "extension.json"), JSON.stringify({ name, version: "0.1.0", schema: 1, ...manifest }));
    for (const [path, text] of Object.entries(files ?? {})) writeFileSync(join(dir, path), text);
  }
  return root;
}

function roleTexts(name: string): ExtensionFixture {
  return {
    manifest: { rules: ["rules.md"], agents: { lead: ["lead.md"], developer: ["developer.md"], reviewer: ["reviewer.md"] } },
    files: { "rules.md": `${name} rule`, "lead.md": `${name} lead`, "developer.md": `${name} developer`, "reviewer.md": `${name} reviewer` },
  };
}

function extensionText(event: object, root: string): string | null {
  return injectExtensions(event, hookContext(root))?.hookSpecificOutput.additionalContext ?? null;
}

test("SessionStart gets each extension's rules then its lead text, in config order", (t) => {
  const root = extensionProject(t, ["acme", "local"], { acme: roleTexts("acme"), local: roleTexts("local") });
  const text = extensionText({ hook_event_name: "SessionStart" }, root);
  assert.equal(text, "## Extension acme 0.1.0\n\nacme rule\n\nacme lead\n\n## Extension local 0.1.0\n\nlocal rule\n\nlocal lead");
  assert.equal(text?.includes("developer"), false);
});

test("SubagentStart gives a role its own additions and any other agent the rules only", (t) => {
  const root = extensionProject(t, ["acme"], { acme: roleTexts("acme") });
  assert.equal(extensionText({ hook_event_name: "SubagentStart", agent_type: "picket:developer" }, root), "## Extension acme 0.1.0\n\nacme rule\n\nacme developer");
  assert.equal(extensionText({ hook_event_name: "SubagentStart", agent_type: "general-purpose" }, root), "## Extension acme 0.1.0\n\nacme rule");
});

test("extensions past 10,000 characters are left out whole and named", (t) => {
  const big = (name: string): ExtensionFixture => ({ manifest: { rules: ["rules.md"] }, files: { "rules.md": `${name} `.padEnd(4000, "x") } });
  const root = extensionProject(t, ["one", "two", "three"], { one: big("one"), two: big("two"), three: big("three") });
  const text = extensionText({ hook_event_name: "SessionStart" }, root) ?? "";
  assert.ok(text.length <= 10_000, `${text.length}`);
  assert.ok(text.includes("## Extension one") && text.includes("## Extension two"));
  assert.equal(text.includes("## Extension three"), false);
  assert.match(text.split("\n").at(-1) ?? "", /left out.*: three$/);
});

test("a refused extension adds one line and no text; nothing enabled or refused gives no output", (t) => {
  const root = extensionProject(t, ["broken"], { broken: { manifest: { schema: 2, rules: ["rules.md"] }, files: { "rules.md": "should not appear" } } });
  const empty = extensionProject(t, [], {});
  const text = extensionText({ hook_event_name: "SessionStart" }, root);
  assert.equal(text, "Extension broken refused: schema 2 is not supported by this Picket (supports 1)");
  assert.equal(injectExtensions({ hook_event_name: "SessionStart" }, hookContext(empty)), null);
});
