import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readdirSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { withProject } from "#test/project.mts";
import type { ProgramRunner } from "../../util/process.mts";
import type { Prompt } from "../../util/prompt.mts";
import { init } from "../init/init.mjs";
import { planUninstall, runUninstall, type UninstallInput, type UninstallReport } from "./uninstall.mts";

type Call = { program: string; args: string[]; cwd: string };

const YES: UninstallInput = { dryRun: false, yes: true, removeWork: false };
const SETTINGS = '{\n  "permissions": {\n    "allow": ["Bash(npm test)"]\n  }\n}\n';
const NO_TERMINAL: Prompt = { interactive: false, ask: async (_question, { fallback }) => fallback };

function recordingRunner(fail: (args: string[]) => boolean = () => false): { exec: ProgramRunner; calls: Call[] } {
  const calls: Call[] = [];
  const exec: ProgramRunner = (program, args, { cwd }) => {
    calls.push({ program, args, cwd });
    if (fail(args)) throw Object.assign(new Error("exit 1"), { stderr: "plugin not found\n" });
    return "";
  };
  return { exec, calls };
}

function project(t: TestContext, files: Record<string, string>): { root: string; home: string } {
  const root = withProject(t, { picket: false });
  const home = withProject(t, { picket: false });
  for (const [rel, text] of Object.entries(files)) {
    mkdirSync(join(root, rel, ".."), { recursive: true });
    writeFileSync(join(root, rel), text);
  }
  return { root, home };
}

function initialized(t: TestContext, files: Record<string, string>): { root: string; home: string } {
  const made = project(t, files);
  init(made.root, { install: false, home: made.home });
  return made;
}

function uninstall(root: string, input: Partial<UninstallInput> = {}, exec = recordingRunner().exec, prompt = NO_TERMINAL): Promise<UninstallReport> {
  return runUninstall(root, { ...YES, ...input }, { exec, prompt });
}

function read(root: string, rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

function results(report: UninstallReport): Record<string, string> {
  return Object.fromEntries(report.changes.map((change) => [change.id, change.result]));
}

function snapshot(root: string): Record<string, string> {
  const files = readdirSync(root, { recursive: true, withFileTypes: true }).filter((entry) => entry.isFile());
  return Object.fromEntries(files.map((entry) => [join(entry.parentPath, entry.name), readFileSync(join(entry.parentPath, entry.name), "utf8")]));
}

test("init then uninstall --yes gives back CLAUDE.md byte for byte, settings as JSON, no .picket or .gitignore, and work/ untouched (T-5.1)", async (t) => {
  const { root } = initialized(t, { "CLAUDE.md": "# My project\n", ".claude/settings.json": SETTINGS, "work/x/state.yaml": "id: x\n" });
  assert.ok(existsSync(join(root, ".picket", "config.json")));
  const report = await uninstall(root);
  assert.deepEqual(results(report), { settings: "removed", "claude-md": "removed", gitignore: "removed", config: "removed", work: "kept" });
  assert.equal(read(root, "CLAUDE.md"), "# My project\n");
  assert.deepEqual(JSON.parse(read(root, ".claude/settings.json")), JSON.parse(SETTINGS));
  assert.equal(existsSync(join(root, ".gitignore")), false);
  assert.equal(existsSync(join(root, ".picket")), false);
  assert.equal(read(root, "work/x/state.yaml"), "id: x\n");
});

test("a CRLF CLAUDE.md and a .gitignore holding node_modules/ come back byte for byte (T-5.1)", async (t) => {
  const crlf = "# My project\r\n\r\nNotes.\r\n";
  const { root } = initialized(t, { "CLAUDE.md": crlf, ".gitignore": "node_modules/\n" });
  assert.notEqual(read(root, "CLAUDE.md"), crlf);
  await uninstall(root);
  assert.equal(read(root, "CLAUDE.md"), crlf);
  assert.equal(read(root, ".gitignore"), "node_modules/\n");
});

test("files without a final newline, and empty files, come back byte for byte", async (t) => {
  for (const [claudeMdText, gitignoreText] of [["# My project", "node_modules"], ["", ""], ["# My project\n\n\n", "node_modules\n\n"]]) {
    const { root } = initialized(t, { "CLAUDE.md": claudeMdText, ".gitignore": gitignoreText });
    assert.ok(read(root, "CLAUDE.md").includes("# Picket"));
    assert.ok(read(root, ".gitignore").includes(".picket/state/"));
    await uninstall(root);
    assert.equal(read(root, "CLAUDE.md"), claudeMdText, JSON.stringify(claudeMdText));
    assert.equal(read(root, ".gitignore"), gitignoreText, JSON.stringify(gitignoreText));
  }
});

function linkedFolder(t: TestContext, root: string, name: string, files: Record<string, string>): string {
  const outside = withProject(t, { picket: false });
  for (const [rel, text] of Object.entries(files)) {
    mkdirSync(join(outside, rel, ".."), { recursive: true });
    writeFileSync(join(outside, rel), text);
  }
  symlinkSync(outside, join(root, name), "junction");
  return outside;
}

test("a .picket that links outside the project keeps everything behind the link", async (t) => {
  const { root } = project(t, { "CLAUDE.md": "# My project\n" });
  const outside = linkedFolder(t, root, ".picket", { "config.json": '{"version":1}\n', "extensions/local/extension.json": "{}", "state/keep.txt": "x" });
  const before = snapshot(outside);
  const report = await uninstall(root);
  assert.equal(results(report).config, "kept");
  assert.equal(results(report).state, "kept");
  assert.match(report.changes.find((change) => change.id === "config")?.detail ?? "", /outside the project/);
  assert.deepEqual(snapshot(outside), before);
});

test("a .claude that links outside the project keeps its settings.json", async (t) => {
  const { root } = project(t, {});
  const settings = `${JSON.stringify({ permissions: { allow: ["Bash(picket *)"] }, env: { CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: "1" } }, null, 2)}\n`;
  const outside = linkedFolder(t, root, ".claude", { "settings.json": settings });
  const report = await uninstall(root);
  assert.equal(results(report).settings, "kept");
  assert.equal(readFileSync(join(outside, "settings.json"), "utf8"), settings);
});

test("a CLAUDE.md init created goes, and the project facts the user added stay", async (t) => {
  const { root } = initialized(t, {});
  await uninstall(root);
  assert.equal(existsSync(join(root, "CLAUDE.md")), false);
  const kept = initialized(t, {});
  writeFileSync(join(kept.root, "CLAUDE.md"), `${read(kept.root, "CLAUDE.md")}- builds with make\n`);
  await uninstall(kept.root);
  assert.equal(read(kept.root, "CLAUDE.md"), "## Project facts\n- builds with make\n");
});

function withPlugins(enabled: string[], marketplace: boolean): string {
  const enabledPlugins = Object.fromEntries(enabled.map((id) => [id, true]));
  return JSON.stringify({ enabledPlugins, ...(marketplace ? { extraKnownMarketplaces: { picketai: { source: { source: "directory", path: "/x" } } } } : {}) });
}

test("plugins uninstall the mods before picket@picketai, then the marketplace, each from the root (T-5.2)", async (t) => {
  const { root } = project(t, { ".claude/settings.json": withPlugins(["picket@picketai", "picket-status@picketai", "picket-session@picketai"], true) });
  const runner = recordingRunner();
  const report = await uninstall(root, {}, runner.exec);
  assert.equal(results(report).plugins, "removed");
  assert.deepEqual(
    runner.calls.map(({ args }) => args.join(" ")),
    [
      "plugin uninstall picket-status@picketai --scope project",
      "plugin uninstall picket-session@picketai --scope project",
      "plugin uninstall picket@picketai --scope project",
      "plugin marketplace remove picketai --scope project",
    ],
  );
  assert.ok(runner.calls.every(({ program, cwd }) => program === "claude" && cwd === root));
});

test("no plugin listed means no call; a failing call fails plugins with the commands by hand and the rest still run (T-5.2)", async (t) => {
  const none = initialized(t, {});
  const quiet = recordingRunner();
  await uninstall(none.root, {}, quiet.exec);
  assert.deepEqual(quiet.calls, []);
  const { root } = project(t, { ".claude/settings.json": withPlugins(["picket@picketai"], true), ".gitignore": ".picket/state/\n" });
  const failing = recordingRunner((args) => args[1] === "uninstall");
  const report = await uninstall(root, {}, failing.exec);
  assert.equal(results(report).plugins, "failed");
  const detail = report.changes.find((change) => change.id === "plugins")?.detail ?? "";
  assert.match(detail, /plugin not found; run by hand: claude plugin uninstall picket@picketai --scope project, then claude plugin marketplace remove picketai --scope project/);
  assert.equal(results(report).gitignore, "removed");
});

test("the user's own rules, env key and status line survive, and deny is untouched (T-5.3)", async (t) => {
  const deny = ["Bash(picket *)", "Bash(rm -rf *)"];
  const own = {
    permissions: { allow: ["Bash(npm test)"], ask: ["Bash(git push)"], deny },
    env: { MY_FLAG: "1" },
    statusLine: { type: "command", command: "my-line" },
  };
  const { root } = initialized(t, { ".claude/settings.json": JSON.stringify(own, null, 2) });
  await uninstall(root);
  const after = JSON.parse(read(root, ".claude/settings.json"));
  assert.deepEqual(after, own);
  assert.deepEqual(after.permissions.deny, deny);
});

test("a dry run calls nothing and changes no file; no terminal without --yes changes nothing (T-5.4)", async (t) => {
  const { root } = initialized(t, { "CLAUDE.md": "# My project\n", ".claude/settings.json": withPlugins(["picket@picketai"], false) });
  const before = snapshot(root);
  const runner = recordingRunner();
  const dry = await uninstall(root, { dryRun: true }, runner.exec);
  assert.ok(dry.changes.every((change) => change.result === "planned"));
  assert.deepEqual(runner.calls, []);
  assert.deepEqual(snapshot(root), before);
  const quiet = await uninstall(root, { yes: false }, runner.exec);
  assert.ok(quiet.changes.every((change) => change.result === "declined"));
  assert.match(quiet.manual.join("\n"), /pass --yes/);
  assert.deepEqual(runner.calls, []);
  assert.deepEqual(snapshot(root), before);
});

test("--yes keeps work/ and --remove-work removes it (T-5.4)", async (t) => {
  const { root } = initialized(t, { "work/x/state.yaml": "id: x\n" });
  assert.equal(planUninstall(root, { removeWork: false }).find((group) => group.id === "work")?.chosen, false);
  await uninstall(root);
  assert.ok(existsSync(join(root, "work", "x", "state.yaml")));
  await uninstall(root, { removeWork: true });
  assert.equal(existsSync(join(root, "work")), false);
});

test("with an extension, --yes keeps .picket/config.json and the extension (T-5.4)", async (t) => {
  const { root } = initialized(t, { ".picket/extensions/local/extension.json": "{}" });
  const report = await uninstall(root);
  assert.equal(results(report).config, "kept");
  assert.ok(existsSync(join(root, ".picket", "config.json")));
  assert.ok(existsSync(join(root, ".picket", "extensions", "local", "extension.json")));
});

test("an answer per group decides it, with the group's default when the answer is empty", async (t) => {
  const { root } = initialized(t, { "CLAUDE.md": "# My project\n", "work/x/state.yaml": "id: x\n" });
  const prompt: Prompt = { interactive: true, ask: async (question, { fallback }) => (question.includes("CLAUDE.md") ? "no" : fallback) };
  const report = await uninstall(root, { yes: false }, recordingRunner().exec, prompt);
  assert.equal(results(report)["claude-md"], "kept");
  assert.equal(results(report).settings, "removed");
  assert.equal(results(report).work, "kept");
  assert.ok(read(root, "CLAUDE.md").includes("# Picket"));
});
