import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { delimiter, join } from "node:path";
import { onPath } from "../../dist/lib/verbs/preflight/checks.mjs";
import { runCli } from "#test/cli.mts";
import { openItem, withProject, writeConfig } from "#test/project.mts";

function project(t, extensions, manifests) {
  const root = withProject(t, { picket: false });
  mkdirSync(join(root, ".picket", "extensions"), { recursive: true });
  writeConfig(root, { version: 1, extensions });
  for (const [name, preflight] of Object.entries(manifests)) {
    const dir = join(root, ".picket", "extensions", name);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "extension.json"), JSON.stringify({ name, version: "1.2.0", schema: 1, preflight }));
  }
  const id = openItem(root, { lane: "order", title: "Preflight" }).id;
  return { root, id };
}

function check(id, kind, value, level = "fail") {
  return { id, kind, value, level, message: `${id} needs ${value}` };
}

function baseEnv() {
  const { CLAUDE_PROJECT_DIR, ...base } = process.env;
  return base;
}

function preflightCli(root, id, env = {}) {
  const r = runCli(process.cwd(), ["preflight", id, "--root", root], { env: { ...baseEnv(), ...env } });
  const json = JSON.parse(r.stdout);
  return { code: r.status, json, byName: Object.fromEntries(json.checks.map((c) => [c.name, c])) };
}

test("path_exists passes for a present file, fails at its level with its message when gone, and a path leaving the project is refused at load", (t) => {
  const { root, id } = project(t, ["acme", "escape"], { acme: [check("pkg", "path_exists", "package.json")], escape: [check("out", "path_exists", "../outside")] });
  writeFileSync(join(root, "package.json"), "{}");
  let r = preflightCli(root, id);
  assert.equal(r.byName["ext:acme:pkg"].level, "ok");
  assert.equal(r.byName["ext:escape"].level, "fail");
  assert.match(r.byName["ext:escape"].detail, /path \.\.\/outside leaves the project/);
  rmSync(join(root, "package.json"));
  r = preflightCli(root, id);
  assert.equal(r.byName["ext:acme:pkg"].level, "fail");
  assert.equal(r.byName["ext:acme:pkg"].detail, "pkg needs package.json");
});

test("env_set passes for a set variable and takes the entry's level for an unset one", (t) => {
  const { root, id } = project(t, ["acme"], { acme: [check("key", "env_set", "PICKET_PROBE_KEY", "warn"), check("other", "env_set", "PICKET_PROBE_UNSET", "warn")] });
  const r = preflightCli(root, id, { PICKET_PROBE_KEY: "set" });
  assert.equal(r.byName["ext:acme:key"].level, "ok");
  assert.equal(r.byName["ext:acme:other"].level, "warn");
  assert.equal(r.json.ok, true);
});

test("command_on_path finds a program without starting it and reports a missing one at its level", (t) => {
  const { root, id } = project(t, ["acme"], { acme: [check("node", "command_on_path", "node"), check("spy", "command_on_path", "picket-spy-prog"), check("none", "command_on_path", "nosuchprogram-xyz", "warn")] });
  const bin = withProject(t, { picket: false });
  const marker = join(bin, "ran.txt");
  writeFileSync(join(bin, "picket-spy-prog"), `#!/bin/sh\necho ran > "${marker.replaceAll("\\", "/")}"\n`, { mode: 0o755 });
  writeFileSync(join(bin, "picket-spy-prog.cmd"), `@echo ran > "${marker}"\r\n`);
  const pathKey = Object.keys(process.env).find((k) => k.toUpperCase() === "PATH") ?? "PATH";
  const r = preflightCli(root, id, { [pathKey]: `${bin}${delimiter}${process.env[pathKey]}` });
  assert.equal(r.byName["ext:acme:node"].level, "ok");
  assert.equal(r.byName["ext:acme:spy"].level, "ok");
  assert.equal(existsSync(marker), false, "the lookup started the program");
  assert.equal(r.byName["ext:acme:none"].level, "warn");
  assert.equal(onPath("nosuchprogram-xyz", process.env, process.platform), false);
});

test("a refused extension fails preflight with its reason, an unlisted folder adds nothing, and the extensions line names versions", (t) => {
  const { root, id } = project(t, ["acme", "future"], { acme: [], future: [] });
  writeFileSync(join(root, ".picket", "extensions", "future", "extension.json"), JSON.stringify({ name: "future", version: "2.0.0", schema: 2 }));
  mkdirSync(join(root, ".picket", "extensions", "stray"));
  const r = preflightCli(root, id);
  assert.equal(r.code, 2);
  assert.equal(r.json.ok, false);
  assert.equal(r.byName.extensions.detail, "acme@1.2.0");
  assert.match(r.byName["ext:future"].detail, /schema 2 is not supported/);
  assert.equal(Object.keys(r.byName).some((name) => name.includes("stray")), false);
});

test("preflight warns with each saved allow rule that could approve an escalation, and is ok with none", (t) => {
  const { root, id } = project(t, [], {});
  const home = withProject(t, { picket: false });
  const homeEnv = { HOME: home, USERPROFILE: home };
  assert.deepEqual(preflightCli(root, id, homeEnv).byName.saved_rules, { name: "saved_rules", level: "ok", detail: "none" });
  mkdirSync(join(root, ".claude"), { recursive: true });
  writeFileSync(join(root, ".claude", "settings.local.json"), JSON.stringify({ permissions: { allow: ["Bash(*)", "Bash(git status)"] } }));
  const saved = preflightCli(root, id, homeEnv).byName.saved_rules;
  assert.equal(saved.level, "warn");
  assert.equal(saved.detail, `Bash(*) in ${join(root, ".claude", "settings.local.json")}`);
  const human = runCli(process.cwd(), ["preflight", id, "--root", root, "--human"], { env: { ...baseEnv(), ...homeEnv } }).stdout;
  assert.match(human, /^warn saved_rules: Bash\(\*\) in /m);
});

test("a malformed package.json turns the tooling check to warn and names the parse error", (t) => {
  const { root, id } = project(t, [], {});
  writeFileSync(join(root, "package.json"), '{ "scripts": { "test": "node t.js", }');
  const tooling = preflightCli(root, id).byName.tooling;
  assert.equal(tooling.level, "warn");
  assert.match(tooling.detail, /^no test command detected; package\.json is not valid JSON \(.+\); no npm scripts detected$/);
});

test("with no extension the preflight carries one extensions line saying none", (t) => {
  const { root, id } = project(t, [], {});
  assert.equal(preflightCli(root, id).byName.extensions.detail, "none");
});
