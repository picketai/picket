import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { runCli } from "#test/cli.mts";
import { gitAt } from "#test/git.mts";
import { withProject } from "#test/project.mts";

const TEMPLATE = readFileSync(resolve("src/templates/claude-block.md"), "utf8").replace(/\r\n/g, "\n");

function tempDir(t) {
  return withProject(t, { picket: false });
}

function initRepo(t) {
  const root = tempDir(t);
  gitAt(root)("init", "-q");
  return root;
}

function runInit(t, cwd, { env = {}, args = [] } = {}) {
  const { CLAUDE_PROJECT_DIR, ...base } = process.env;
  const home = "HOME" in env || "USERPROFILE" in env ? null : tempDir(t);
  const homeEnv = home === null ? {} : { HOME: home, USERPROFILE: home };
  const r = runCli(cwd, ["init", "--no-install", ...args], { env: { ...base, ...homeEnv, ...env } });
  return { code: r.status, json: r.stdout.trim().startsWith("{") ? JSON.parse(r.stdout) : null, stdout: r.stdout, stderr: r.stderr };
}

function results(report) {
  return Object.fromEntries(report.steps.map((s) => [s.name, s.result]));
}

function read(root, ...path) {
  return readFileSync(join(root, ...path), "utf8");
}

test("init creates the CLAUDE.md block, the config and the ignore line in a fresh repo", (t) => {
  const root = initRepo(t);
  const r = runInit(t, root);
  assert.equal(r.code, 0, r.stderr);
  assert.deepEqual(results(r.json), { "claude-md": "created", config: "created", gitignore: "created", settings: "created", marketplace: "skipped", plugin: "skipped", status: "skipped", markdown: "skipped" });
  assert.equal(read(root, "CLAUDE.md"), `${TEMPLATE}\n## Project facts\n`);
  assert.deepEqual(JSON.parse(read(root, ".picket", "config.json")), { version: 1 });
  assert.ok(read(root, ".gitignore").split("\n").includes(".picket/state/"));
});

test("a second init reports every step unchanged and leaves the files byte-identical", (t) => {
  const root = initRepo(t);
  runInit(t, root);
  const files = ["CLAUDE.md", ".picket/config.json", ".gitignore", ".claude/settings.json"];
  const before = files.map((p) => read(root, p));
  const r = runInit(t, root);
  assert.equal(r.code, 0, r.stderr);
  assert.deepEqual(results(r.json), { "claude-md": "unchanged", config: "unchanged", gitignore: "unchanged", settings: "unchanged", marketplace: "skipped", plugin: "skipped", status: "skipped", markdown: "skipped" });
  assert.deepEqual(files.map((p) => read(root, p)), before);
});

test("init replaces only the Picket block and keeps the project's own heading and facts", (t) => {
  const root = initRepo(t);
  const app = "# My app\n\nA billing service.\n\n";
  const oldBlock = "# Picket\n\nOld intro.\n\n## Every request\n\n1. Old step.\n2. An extra line a user added.\n\n## Rules\n\nOld rules.\n\n";
  const facts = "## Project facts\n\n- The API listens on 8080.\n";
  writeFileSync(join(root, "CLAUDE.md"), app + oldBlock + facts);
  const r = runInit(t, root);
  assert.equal(results(r.json)["claude-md"], "updated");
  assert.equal(read(root, "CLAUDE.md"), `${app}${TEMPLATE}\n${facts}`);
});

test("init appends the block to a CLAUDE.md without one, and a rerun keeps it", (t) => {
  const root = initRepo(t);
  writeFileSync(join(root, "CLAUDE.md"), "# My app\n\nA billing service.\n");
  assert.equal(results(runInit(t, root).json)["claude-md"], "updated");
  assert.equal(read(root, "CLAUDE.md"), `# My app\n\nA billing service.\n\n${TEMPLATE}`);
  assert.equal(results(runInit(t, root).json)["claude-md"], "unchanged");
});

test("init leaves an existing config and an ignore file that already holds the state line", (t) => {
  const root = initRepo(t);
  mkdirSync(join(root, ".picket"));
  const config = JSON.stringify({ version: 1, sources: { analysis: { env: "SRC_ANALYSIS" } } }, null, 2) + "\n";
  writeFileSync(join(root, ".picket", "config.json"), config);
  writeFileSync(join(root, ".gitignore"), "node_modules/\n.picket/state/\n");
  const r = runInit(t, root);
  assert.equal(results(r.json).config, "unchanged");
  assert.equal(results(r.json).gitignore, "unchanged");
  assert.equal(read(root, ".picket", "config.json"), config);
  assert.equal(read(root, ".gitignore"), "node_modules/\n.picket/state/\n");
});

test("init writes at the git top level from a subfolder, in the cwd outside git, and refuses the home folder", (t) => {
  const repo = initRepo(t);
  const plain = tempDir(t);
  const home = tempDir(t);
  mkdirSync(join(repo, "src"));
  assert.equal(runInit(t, join(repo, "src")).code, 0);
  assert.ok(existsSync(join(repo, "CLAUDE.md")));
  assert.equal(existsSync(join(repo, "src", "CLAUDE.md")), false);

  assert.equal(runInit(t, plain).code, 0);
  assert.ok(existsSync(join(plain, "CLAUDE.md")));

  const refused = runInit(t, home, { env: { HOME: home, USERPROFILE: home } });
  assert.equal(refused.code, 2);
  assert.match(refused.json.error, /home folder/);
  assert.deepEqual(readdirSync(home), []);
});

const INIT_SETTINGS = {
  env: { CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: "1" },
  permissions: {
    allow: ["Bash(picket *)", "PowerShell(picket *)", "Read(~/.claude/plugins/cache/picketai/**)"],
    ask: ["PowerShell(picket drive *)", "PowerShell(picket check *)"],
  },
  statusLine: { type: "command", command: "picket statusline" },
};

function writeSettings(root, text, file = "settings.json") {
  mkdirSync(join(root, ".claude"), { recursive: true });
  writeFileSync(join(root, ".claude", file), text);
}

function settingsStep(report) {
  return report.steps.find((s) => s.name === "settings");
}

function settingsDetail(report) {
  return settingsStep(report).detail;
}

test("init creates .claude/settings.json with the env key, the picket allow and ask rules, then the status line (T-3.1)", (t) => {
  const root = initRepo(t);
  assert.equal(runInit(t, root).code, 0);
  const text = read(root, ".claude", "settings.json");
  assert.deepEqual(JSON.parse(text), INIT_SETTINGS);
  assert.deepEqual(Object.keys(JSON.parse(text)), ["env", "permissions", "statusLine"]);
  assert.ok(text.endsWith("}\n"));
});

test("init keeps a project status line of its own and names the file (T-3.3)", (t) => {
  const root = initRepo(t);
  const own = { type: "command", command: "my-line" };
  writeSettings(root, JSON.stringify({ statusLine: own }));
  const r = runInit(t, root);
  assert.deepEqual(JSON.parse(read(root, ".claude", "settings.json")).statusLine, own);
  assert.equal(settingsDetail(r.json), `statusLine already set in ${settingsStep(r.json).path}`);
});

test("a status line in the local or the user settings keeps init from writing one, and init names that file (T-3.4)", (t) => {
  const local = initRepo(t);
  const user = initRepo(t);
  const home = tempDir(t);
  const localText = JSON.stringify({ statusLine: { type: "command", command: "local-line" } });
  writeSettings(local, localText, "settings.local.json");
  const localRun = runInit(t, local);
  assert.equal("statusLine" in JSON.parse(read(local, ".claude", "settings.json")), false);
  assert.equal(settingsDetail(localRun.json), `statusLine already set in ${join(dirname(settingsStep(localRun.json).path), "settings.local.json")}`);
  assert.equal(read(local, ".claude", "settings.local.json"), localText);

  const userText = JSON.stringify({ statusLine: { type: "command", command: "user-line" } });
  writeSettings(home, userText);
  const userRun = runInit(t, user, { env: { HOME: home, USERPROFILE: home } });
  assert.equal("statusLine" in JSON.parse(read(user, ".claude", "settings.json")), false);
  assert.equal(settingsDetail(userRun.json), `statusLine already set in ${join(home, ".claude", "settings.json")}`);
  assert.equal(read(home, ".claude", "settings.json"), userText);
});

test("a user settings file that is not JSON fails no step and holds no status line (T-3.5)", (t) => {
  const root = initRepo(t);
  const home = tempDir(t);
  writeSettings(home, "{ not json");
  const r = runInit(t, root, { env: { HOME: home, USERPROFILE: home } });
  assert.equal(r.code, 0, r.stderr);
  assert.equal(r.json.steps.some((s) => s.result === "failed"), false);
  assert.deepEqual(JSON.parse(read(root, ".claude", "settings.json")).statusLine, INIT_SETTINGS.statusLine);
});

test("init keeps existing settings in value and order and appends what is missing after them", (t) => {
  const root = initRepo(t);
  writeSettings(root, JSON.stringify({ outputStyle: "Explanatory", permissions: { allow: ["Read", "Bash(npm test*)"] }, env: { FOO: "1" } }, null, 2));
  const r = runInit(t, root);
  assert.equal(results(r.json).settings, "updated");
  const settings = JSON.parse(read(root, ".claude", "settings.json"));
  assert.deepEqual(Object.keys(settings), ["outputStyle", "permissions", "env", "statusLine"]);
  assert.equal(settings.outputStyle, "Explanatory");
  assert.deepEqual(settings.permissions.allow, ["Read", "Bash(npm test*)", "Bash(picket *)", "PowerShell(picket *)", "Read(~/.claude/plugins/cache/picketai/**)"]);
  assert.deepEqual(settings.permissions.ask, INIT_SETTINGS.permissions.ask);
  assert.deepEqual(settings.env, { FOO: "1", CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: "1" });

  const before = read(root, ".claude", "settings.json");
  assert.equal(results(runInit(t, root).json).settings, "unchanged");
  assert.equal(read(root, ".claude", "settings.json"), before);
});

test("init does not allow a rule the project denies, and says so", (t) => {
  const root = initRepo(t);
  writeSettings(root, JSON.stringify({ permissions: { deny: ["PowerShell(picket *)"] } }));
  const r = runInit(t, root, { args: ["--human"] });
  assert.equal(r.code, 0, r.stderr);
  const settings = JSON.parse(read(root, ".claude", "settings.json"));
  assert.deepEqual(settings.permissions.allow, ["Bash(picket *)", "Read(~/.claude/plugins/cache/picketai/**)"]);
  assert.deepEqual(settings.permissions.deny, ["PowerShell(picket *)"]);
  const line = r.stdout.split("\n").find((l) => l.startsWith("settings: "));
  assert.match(line, /WARNING: permissions\.deny holds PowerShell\(picket \*\)/);
});

test("a settings file that is not JSON fails its step, stays as is, and the other steps still run", (t) => {
  const root = initRepo(t);
  writeSettings(root, "{ not json");
  const r = runInit(t, root);
  assert.equal(r.code, 2);
  assert.deepEqual(results(r.json), { "claude-md": "created", config: "created", gitignore: "created", settings: "failed", marketplace: "skipped", plugin: "skipped", status: "skipped", markdown: "skipped" });
  assert.equal(read(root, ".claude", "settings.json"), "{ not json");
});

test("the CLI exits 2 when a step fails", (t) => {
  const root = initRepo(t);
  mkdirSync(join(root, ".claude"));
  writeFileSync(join(root, ".claude", "settings.json"), "{ not json");
  assert.equal(runInit(t, root).code, 2);
});

test("init writes the plugin cache read rule once, and a rerun keeps it once", (t) => {
  const root = initRepo(t);
  runInit(t, root);
  runInit(t, root);
  const allow = JSON.parse(read(root, ".claude", "settings.json")).permissions.allow;
  assert.equal(allow.filter((rule) => rule === "Read(~/.claude/plugins/cache/picketai/**)").length, 1);
});
