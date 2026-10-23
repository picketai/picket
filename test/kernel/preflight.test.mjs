import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { createWork } from "./work-fixture.mjs";
import { onPath } from "../../dist/lib/verbs/preflight/preflight.mjs";

const BIN = resolve("dist/bin/picket.mjs");

function project(extensions, manifests) {
  const root = mkdtempSync(join(tmpdir(), "picket-preflight-"));
  mkdirSync(join(root, ".picket", "extensions"), { recursive: true });
  writeFileSync(join(root, ".picket", "config.json"), JSON.stringify({ version: 1, extensions }));
  for (const [name, preflight] of Object.entries(manifests)) {
    const dir = join(root, ".picket", "extensions", name);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "extension.json"), JSON.stringify({ name, version: "1.2.0", schema: 1, preflight }));
  }
  const id = createWork({ lane: "order", title: "Preflight", root }).id;
  return { root, id };
}

function check(id, kind, value, level = "fail") {
  return { id, kind, value, level, message: `${id} needs ${value}` };
}

function preflightCli(root, id, env = {}) {
  const { CLAUDE_PROJECT_DIR, ...base } = process.env;
  const r = spawnSync("node", [BIN, "preflight", id, "--root", root], { encoding: "utf8", env: { ...base, ...env } });
  const json = JSON.parse(r.stdout);
  return { code: r.status, json, byName: Object.fromEntries(json.checks.map((c) => [c.name, c])) };
}

test("path_exists passes for a present file, fails at its level with its message when gone, and a path leaving the project is refused at load", () => {
  const { root, id } = project(["acme", "escape"], { acme: [check("pkg", "path_exists", "package.json")], escape: [check("out", "path_exists", "../outside")] });
  try {
    writeFileSync(join(root, "package.json"), "{}");
    let r = preflightCli(root, id);
    assert.equal(r.byName["ext:acme:pkg"].level, "ok");
    assert.equal(r.byName["ext:escape"].level, "fail");
    assert.match(r.byName["ext:escape"].detail, /path \.\.\/outside leaves the project/);
    rmSync(join(root, "package.json"));
    r = preflightCli(root, id);
    assert.equal(r.byName["ext:acme:pkg"].level, "fail");
    assert.equal(r.byName["ext:acme:pkg"].detail, "pkg needs package.json");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("env_set passes for a set variable and takes the entry's level for an unset one", () => {
  const { root, id } = project(["acme"], { acme: [check("key", "env_set", "PICKET_PROBE_KEY", "warn"), check("other", "env_set", "PICKET_PROBE_UNSET", "warn")] });
  try {
    const r = preflightCli(root, id, { PICKET_PROBE_KEY: "set" });
    assert.equal(r.byName["ext:acme:key"].level, "ok");
    assert.equal(r.byName["ext:acme:other"].level, "warn");
    assert.equal(r.json.ok, true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("command_on_path finds a program without starting it and reports a missing one at its level", () => {
  const { root, id } = project(["acme"], { acme: [check("node", "command_on_path", "node"), check("spy", "command_on_path", "picket-spy-prog"), check("none", "command_on_path", "nosuchprogram-xyz", "warn")] });
  const bin = mkdtempSync(join(tmpdir(), "picket-spy-"));
  const marker = join(bin, "ran.txt");
  try {
    writeFileSync(join(bin, "picket-spy-prog"), `#!/bin/sh\necho ran > "${marker.replaceAll("\\", "/")}"\n`, { mode: 0o755 });
    writeFileSync(join(bin, "picket-spy-prog.cmd"), `@echo ran > "${marker}"\r\n`);
    const pathKey = Object.keys(process.env).find((k) => k.toUpperCase() === "PATH") ?? "PATH";
    const r = preflightCli(root, id, { [pathKey]: `${bin}${delimiter}${process.env[pathKey]}` });
    assert.equal(r.byName["ext:acme:node"].level, "ok");
    assert.equal(r.byName["ext:acme:spy"].level, "ok");
    assert.equal(existsSync(marker), false, "the lookup started the program");
    assert.equal(r.byName["ext:acme:none"].level, "warn");
    assert.equal(onPath("nosuchprogram-xyz"), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(bin, { recursive: true, force: true });
  }
});

test("a refused extension fails preflight with its reason, an unlisted folder adds nothing, and the extensions line names versions", () => {
  const { root, id } = project(["acme", "future"], { acme: [], future: [] });
  try {
    writeFileSync(join(root, ".picket", "extensions", "future", "extension.json"), JSON.stringify({ name: "future", version: "2.0.0", schema: 2 }));
    mkdirSync(join(root, ".picket", "extensions", "stray"));
    const r = preflightCli(root, id);
    assert.equal(r.code, 2);
    assert.equal(r.json.ok, false);
    assert.equal(r.byName.extensions.detail, "acme@1.2.0");
    assert.match(r.byName["ext:future"].detail, /schema 2 is not supported/);
    assert.equal(Object.keys(r.byName).some((name) => name.includes("stray")), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("preflight warns with each saved allow rule that could approve an escalation, and is ok with none", () => {
  const { root, id } = project([], {});
  const home = mkdtempSync(join(tmpdir(), "picket-preflight-home-"));
  try {
    const homeEnv = { HOME: home, USERPROFILE: home };
    assert.deepEqual(preflightCli(root, id, homeEnv).byName.saved_rules, { name: "saved_rules", level: "ok", detail: "none" });
    mkdirSync(join(root, ".claude"), { recursive: true });
    writeFileSync(join(root, ".claude", "settings.local.json"), JSON.stringify({ permissions: { allow: ["Bash(*)", "Bash(git status)"] } }));
    const saved = preflightCli(root, id, homeEnv).byName.saved_rules;
    assert.equal(saved.level, "warn");
    assert.equal(saved.detail, `Bash(*) in ${join(root, ".claude", "settings.local.json")}`);
    const { CLAUDE_PROJECT_DIR, ...base } = process.env;
    const human = spawnSync("node", [BIN, "preflight", id, "--root", root, "--human"], { encoding: "utf8", env: { ...base, ...homeEnv } }).stdout;
    assert.match(human, /^warn saved_rules: Bash\(\*\) in /m);
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(home, { recursive: true, force: true });
  }
});

test("a malformed package.json turns the tooling check to warn and names the parse error", () => {
  const { root, id } = project([], {});
  try {
    writeFileSync(join(root, "package.json"), '{ "scripts": { "test": "node t.js", }');
    const tooling = preflightCli(root, id).byName.tooling;
    assert.equal(tooling.level, "warn");
    assert.match(tooling.detail, /^no test command detected; package\.json is not valid JSON \(.+\); no npm scripts detected$/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("with no extension the preflight carries one extensions line saying none", () => {
  const { root, id } = project([], {});
  try {
    assert.equal(preflightCli(root, id).byName.extensions.detail, "none");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
