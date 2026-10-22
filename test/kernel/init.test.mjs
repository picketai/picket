import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { init, marketplaceRoot } from "../../dist/lib/init.mjs";

const BIN = resolve("dist/bin/picket.mjs");
const TEMPLATE = readFileSync(resolve("src/templates/claude-block.md"), "utf8").replace(/\r\n/g, "\n");

function tempDir(prefix = "picket-init-") {
  return mkdtempSync(join(tmpdir(), prefix));
}

function gitRepo() {
  const root = tempDir();
  execFileSync("git", ["-C", root, "init", "-q"]);
  return root;
}

function runInit(cwd, { env = {}, args = [] } = {}) {
  const { CLAUDE_PROJECT_DIR, ...base } = process.env;
  const home = "HOME" in env || "USERPROFILE" in env ? null : tempDir("picket-home-");
  try {
    const homeEnv = home === null ? {} : { HOME: home, USERPROFILE: home };
    const r = spawnSync("node", [BIN, "init", "--no-install", ...args], { cwd, env: { ...base, ...homeEnv, ...env }, encoding: "utf8" });
    return { code: r.status, json: r.stdout.trim().startsWith("{") ? JSON.parse(r.stdout) : null, stdout: r.stdout, stderr: r.stderr };
  } finally {
    if (home !== null) rmSync(home, { recursive: true, force: true });
  }
}

function results(report) {
  return Object.fromEntries(report.steps.map((s) => [s.name, s.result]));
}

function read(root, ...path) {
  return readFileSync(join(root, ...path), "utf8");
}

test("init creates the CLAUDE.md block, the config and the ignore line in a fresh repo", () => {
  const root = gitRepo();
  try {
    const r = runInit(root);
    assert.equal(r.code, 0, r.stderr);
    assert.deepEqual(results(r.json), { "claude-md": "created", config: "created", gitignore: "created", settings: "created", marketplace: "skipped", plugin: "skipped", status: "skipped", markdown: "skipped" });
    assert.equal(read(root, "CLAUDE.md"), `${TEMPLATE}\n## Project facts\n`);
    assert.deepEqual(JSON.parse(read(root, ".picket", "config.json")), { version: 1 });
    assert.ok(read(root, ".gitignore").split("\n").includes(".picket/state/"));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a second init reports every step unchanged and leaves the files byte-identical", () => {
  const root = gitRepo();
  try {
    runInit(root);
    const files = ["CLAUDE.md", ".picket/config.json", ".gitignore", ".claude/settings.json"];
    const before = files.map((p) => read(root, p));
    const r = runInit(root);
    assert.equal(r.code, 0, r.stderr);
    assert.deepEqual(results(r.json), { "claude-md": "unchanged", config: "unchanged", gitignore: "unchanged", settings: "unchanged", marketplace: "skipped", plugin: "skipped", status: "skipped", markdown: "skipped" });
    assert.deepEqual(files.map((p) => read(root, p)), before);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("init replaces only the Picket block and keeps the project's own heading and facts", () => {
  const root = gitRepo();
  try {
    const app = "# My app\n\nA billing service.\n\n";
    const oldBlock = "# Picket\n\nOld intro.\n\n## Every request\n\n1. Old step.\n2. An extra line a user added.\n\n## Rules\n\nOld rules.\n\n";
    const facts = "## Project facts\n\n- The API listens on 8080.\n";
    writeFileSync(join(root, "CLAUDE.md"), app + oldBlock + facts);
    const r = runInit(root);
    assert.equal(results(r.json)["claude-md"], "updated");
    assert.equal(read(root, "CLAUDE.md"), `${app}${TEMPLATE}\n${facts}`);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("init appends the block to a CLAUDE.md without one, and a rerun keeps it", () => {
  const root = gitRepo();
  try {
    writeFileSync(join(root, "CLAUDE.md"), "# My app\n\nA billing service.\n");
    assert.equal(results(runInit(root).json)["claude-md"], "updated");
    assert.equal(read(root, "CLAUDE.md"), `# My app\n\nA billing service.\n\n${TEMPLATE}`);
    assert.equal(results(runInit(root).json)["claude-md"], "unchanged");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("init leaves an existing config and an ignore file that already holds the state line", () => {
  const root = gitRepo();
  try {
    mkdirSync(join(root, ".picket"));
    const config = JSON.stringify({ version: 1, sources: { analysis: { env: "SRC_ANALYSIS" } } }, null, 2) + "\n";
    writeFileSync(join(root, ".picket", "config.json"), config);
    writeFileSync(join(root, ".gitignore"), "node_modules/\n.picket/state/\n");
    const r = runInit(root);
    assert.equal(results(r.json).config, "unchanged");
    assert.equal(results(r.json).gitignore, "unchanged");
    assert.equal(read(root, ".picket", "config.json"), config);
    assert.equal(read(root, ".gitignore"), "node_modules/\n.picket/state/\n");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("init writes at the git top level from a subfolder, in the cwd outside git, and refuses the home folder", () => {
  const repo = gitRepo();
  const plain = tempDir();
  const home = tempDir();
  try {
    mkdirSync(join(repo, "src"));
    assert.equal(runInit(join(repo, "src")).code, 0);
    assert.ok(existsSync(join(repo, "CLAUDE.md")));
    assert.equal(existsSync(join(repo, "src", "CLAUDE.md")), false);

    assert.equal(runInit(plain).code, 0);
    assert.ok(existsSync(join(plain, "CLAUDE.md")));

    const refused = runInit(home, { env: { HOME: home, USERPROFILE: home } });
    assert.equal(refused.code, 2);
    assert.match(refused.json.error, /home folder/);
    assert.deepEqual(readdirSync(home), []);
  } finally {
    for (const dir of [repo, plain, home]) rmSync(dir, { recursive: true, force: true });
  }
});

test("this repository's CLAUDE.md carries the shipped block verbatim, with no repository-only text in it", () => {
  const own = readFileSync(resolve("CLAUDE.md"), "utf8").replace(/\r\n/g, "\n");
  assert.ok(own.startsWith(TEMPLATE), "CLAUDE.md must start with src/templates/claude-block.md");
  assert.equal(TEMPLATE.includes("--plugin-dir"), false);
  assert.equal(TEMPLATE.includes("harness-authoring"), false);
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

test("init creates .claude/settings.json with the env key, the picket allow and ask rules, then the status line (T-3.1)", () => {
  const root = gitRepo();
  try {
    assert.equal(runInit(root).code, 0);
    const text = read(root, ".claude", "settings.json");
    assert.deepEqual(JSON.parse(text), INIT_SETTINGS);
    assert.deepEqual(Object.keys(JSON.parse(text)), ["env", "permissions", "statusLine"]);
    assert.ok(text.endsWith("}\n"));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("init keeps a project status line of its own and names the file (T-3.3)", () => {
  const root = gitRepo();
  try {
    const own = { type: "command", command: "my-line" };
    writeSettings(root, JSON.stringify({ statusLine: own }));
    const r = runInit(root);
    assert.deepEqual(JSON.parse(read(root, ".claude", "settings.json")).statusLine, own);
    assert.equal(settingsDetail(r.json), `statusLine already set in ${settingsStep(r.json).path}`);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a status line in the local or the user settings keeps init from writing one, and init names that file (T-3.4)", () => {
  const local = gitRepo();
  const user = gitRepo();
  const home = tempDir("picket-home-");
  try {
    const localText = JSON.stringify({ statusLine: { type: "command", command: "local-line" } });
    writeSettings(local, localText, "settings.local.json");
    const localRun = runInit(local);
    assert.equal("statusLine" in JSON.parse(read(local, ".claude", "settings.json")), false);
    assert.equal(settingsDetail(localRun.json), `statusLine already set in ${join(dirname(settingsStep(localRun.json).path), "settings.local.json")}`);
    assert.equal(read(local, ".claude", "settings.local.json"), localText);

    const userText = JSON.stringify({ statusLine: { type: "command", command: "user-line" } });
    writeSettings(home, userText);
    const userRun = runInit(user, { env: { HOME: home, USERPROFILE: home } });
    assert.equal("statusLine" in JSON.parse(read(user, ".claude", "settings.json")), false);
    assert.equal(settingsDetail(userRun.json), `statusLine already set in ${join(home, ".claude", "settings.json")}`);
    assert.equal(read(home, ".claude", "settings.json"), userText);
  } finally {
    for (const dir of [local, user, home]) rmSync(dir, { recursive: true, force: true });
  }
});

test("a user settings file that is not JSON fails no step and holds no status line (T-3.5)", () => {
  const root = gitRepo();
  const home = tempDir("picket-home-");
  try {
    writeSettings(home, "{ not json");
    const r = runInit(root, { env: { HOME: home, USERPROFILE: home } });
    assert.equal(r.code, 0, r.stderr);
    assert.equal(r.json.steps.some((s) => s.result === "failed"), false);
    assert.deepEqual(JSON.parse(read(root, ".claude", "settings.json")).statusLine, INIT_SETTINGS.statusLine);
  } finally {
    for (const dir of [root, home]) rmSync(dir, { recursive: true, force: true });
  }
});

test("init keeps existing settings in value and order and appends what is missing after them", () => {
  const root = gitRepo();
  try {
    writeSettings(root, JSON.stringify({ outputStyle: "Explanatory", permissions: { allow: ["Read", "Bash(npm test*)"] }, env: { FOO: "1" } }, null, 2));
    const r = runInit(root);
    assert.equal(results(r.json).settings, "updated");
    const settings = JSON.parse(read(root, ".claude", "settings.json"));
    assert.deepEqual(Object.keys(settings), ["outputStyle", "permissions", "env", "statusLine"]);
    assert.equal(settings.outputStyle, "Explanatory");
    assert.deepEqual(settings.permissions.allow, ["Read", "Bash(npm test*)", "Bash(picket *)", "PowerShell(picket *)", "Read(~/.claude/plugins/cache/picketai/**)"]);
    assert.deepEqual(settings.permissions.ask, INIT_SETTINGS.permissions.ask);
    assert.deepEqual(settings.env, { FOO: "1", CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: "1" });

    const before = read(root, ".claude", "settings.json");
    assert.equal(results(runInit(root).json).settings, "unchanged");
    assert.equal(read(root, ".claude", "settings.json"), before);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("init does not allow a rule the project denies, and says so", () => {
  const root = gitRepo();
  try {
    writeSettings(root, JSON.stringify({ permissions: { deny: ["PowerShell(picket *)"] } }));
    const r = runInit(root, { args: ["--human"] });
    assert.equal(r.code, 0, r.stderr);
    const settings = JSON.parse(read(root, ".claude", "settings.json"));
    assert.deepEqual(settings.permissions.allow, ["Bash(picket *)", "Read(~/.claude/plugins/cache/picketai/**)"]);
    assert.deepEqual(settings.permissions.deny, ["PowerShell(picket *)"]);
    const line = r.stdout.split("\n").find((l) => l.startsWith("settings: "));
    assert.match(line, /WARNING: permissions\.deny holds PowerShell\(picket \*\)/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a settings file that is not JSON fails its step, stays as is, and the other steps still run", () => {
  const root = gitRepo();
  try {
    writeSettings(root, "{ not json");
    const r = runInit(root);
    assert.equal(r.code, 2);
    assert.deepEqual(results(r.json), { "claude-md": "created", config: "created", gitignore: "created", settings: "failed", marketplace: "skipped", plugin: "skipped", status: "skipped", markdown: "skipped" });
    assert.equal(read(root, ".claude", "settings.json"), "{ not json");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

function recordingRunner(onCall = () => {}) {
  const calls = [];
  const exec = (command, args, options) => {
    calls.push({ command, args, cwd: options.cwd });
    onCall(command, args, options);
  };
  return { calls, exec };
}

test("init registers the marketplace, then installs picket, picket-status and picket-markdown, all from the project root", () => {
  const root = gitRepo();
  try {
    const { calls, exec } = recordingRunner();
    const report = init(root, { exec });
    const checkout = marketplaceRoot();
    assert.ok(checkout, "this checkout holds .claude-plugin/marketplace.json");
    assert.deepEqual(calls, [
      { command: "claude", args: ["plugin", "marketplace", "add", checkout, "--scope", "project"], cwd: root },
      { command: "claude", args: ["plugin", "install", "picket@picketai", "--scope", "project"], cwd: root },
      { command: "claude", args: ["plugin", "install", "picket-status@picketai", "--scope", "project"], cwd: root },
      { command: "claude", args: ["plugin", "install", "picket-markdown@picketai", "--scope", "project"], cwd: root },
    ]);
    assert.equal(results(report).marketplace, "created");
    assert.equal(results(report).plugin, "created");
    assert.equal(results(report).status, "created");
    assert.equal(results(report).markdown, "created");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

const KNOWN_MARKETPLACE = { picketai: { source: { source: "directory", path: "x" } } };

function installedSettings(root, enabledPlugins) {
  mkdirSync(join(root, ".claude"));
  writeFileSync(join(root, ".claude", "settings.json"), JSON.stringify({ extraKnownMarketplaces: KNOWN_MARKETPLACE, enabledPlugins }));
}

test("init runs no claude command when the project already knows the marketplace and all three plugins", () => {
  const root = gitRepo();
  try {
    installedSettings(root, { "picket@picketai": true, "picket-status@picketai": true, "picket-markdown@picketai": true });
    const { calls, exec } = recordingRunner();
    const report = init(root, { exec });
    assert.deepEqual(calls, []);
    assert.equal(results(report).marketplace, "unchanged");
    assert.equal(results(report).plugin, "unchanged");
    assert.equal(results(report).status, "unchanged");
    assert.equal(results(report).markdown, "unchanged");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("init leaves a disabled picket-status disabled and runs no claude command for it", () => {
  const root = gitRepo();
  try {
    installedSettings(root, { "picket@picketai": true, "picket-status@picketai": false, "picket-markdown@picketai": true });
    const { calls, exec } = recordingRunner();
    const report = init(root, { exec });
    assert.deepEqual(calls, []);
    assert.equal(results(report).status, "unchanged");
    assert.equal(JSON.parse(read(root, ".claude", "settings.json")).enabledPlugins["picket-status@picketai"], false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("init leaves a disabled picket-markdown disabled and runs no claude command for it", () => {
  const root = gitRepo();
  try {
    installedSettings(root, { "picket@picketai": true, "picket-status@picketai": true, "picket-markdown@picketai": false });
    const { calls, exec } = recordingRunner();
    const report = init(root, { exec });
    assert.deepEqual(calls, []);
    assert.equal(results(report).markdown, "unchanged");
    assert.equal(JSON.parse(read(root, ".claude", "settings.json")).enabledPlugins["picket-markdown@picketai"], false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("installed from the cache, with no marketplace beside the plugin, a rerun reports the install unchanged", () => {
  const root = gitRepo();
  try {
    installedSettings(root, { "picket@picketai": true, "picket-status@picketai": true, "picket-markdown@picketai": true });
    const { calls, exec } = recordingRunner();
    const report = init(root, { exec, market: null });
    assert.deepEqual(calls, []);
    assert.equal(results(report).marketplace, "unchanged");
    assert.equal(results(report).plugin, "unchanged");
    assert.equal(results(report).status, "unchanged");
    assert.equal(results(report).markdown, "unchanged");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("with no marketplace beside the plugin, an uninstalled project fails all four install steps without running claude", () => {
  const root = gitRepo();
  try {
    const { calls, exec } = recordingRunner();
    const report = init(root, { exec, market: null });
    assert.deepEqual(calls, []);
    assert.equal(results(report).marketplace, "failed");
    assert.equal(results(report).plugin, "failed");
    assert.equal(results(report).status, "failed");
    assert.equal(results(report).markdown, "failed");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a failing claude command fails its step and the exit, and --no-install runs none", () => {
  const root = gitRepo();
  try {
    const { exec } = recordingRunner((command, args) => {
      if (args[1] === "marketplace") throw Object.assign(new Error("exit 1"), { stderr: "warming up\nmarketplace source not found\n" });
    });
    const report = init(root, { exec });
    assert.equal(results(report).marketplace, "failed");
    const detail = report.steps.find((s) => s.name === "marketplace").detail;
    assert.match(detail, /^marketplace source not found; run by hand: claude plugin marketplace add/);
    assert.match(detail, /then claude plugin install picket@picketai --scope project, then claude plugin install picket-status@picketai --scope project, then claude plugin install picket-markdown@picketai --scope project$/);
    assert.equal(results(report).plugin, "created");
    assert.equal(results(report).status, "created");
    assert.equal(results(report).markdown, "created");
    assert.equal(results(report)["claude-md"], "created");

    const skipped = recordingRunner();
    const quiet = init(root, { install: false, exec: skipped.exec });
    assert.deepEqual(skipped.calls, []);
    assert.equal(results(quiet).marketplace, "skipped");
    assert.equal(results(quiet).plugin, "skipped");
    assert.equal(results(quiet).status, "skipped");
    assert.equal(results(quiet).markdown, "skipped");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the CLI exits 2 when a step fails", () => {
  const root = gitRepo();
  try {
    mkdirSync(join(root, ".claude"));
    writeFileSync(join(root, ".claude", "settings.json"), "{ not json");
    assert.equal(runInit(root).code, 2);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("init writes the plugin cache read rule once, and a rerun keeps it once", () => {
  const root = gitRepo();
  try {
    runInit(root);
    runInit(root);
    const allow = JSON.parse(read(root, ".claude", "settings.json")).permissions.allow;
    assert.equal(allow.filter((rule) => rule === "Read(~/.claude/plugins/cache/picketai/**)").length, 1);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
