import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { chmodSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fixedContext } from "#test/context.mts";
import { withProject } from "#test/project.mts";
import { DATA_FOLDER_STATUS_LINE, INSTALL, LEGACY_STATUS_LINE } from "../../shared/install.mts";
import { parseArgs } from "../../util/args.mts";
import type { ProgramRunner } from "../../util/process.mts";
import { initProject, verb } from "./index.mts";
import { init, renderInit } from "./init.mjs";

type Step = { name: string; result: string; detail?: string };
type Report = { root: string; steps: Step[]; warnings: string[] };

const RETIRED = ["picket-status@picketai", "picket-markdown@picketai", "picket-session@picketai"];
const NO_PATH = { PATH: "" };

const parse = (argv: string[]) => verb.parse(parseArgs(argv));

function recordingRunner(): { exec: ProgramRunner; calls: string[] } {
  const calls: string[] = [];
  const exec: ProgramRunner = (program, args) => {
    calls.push(`${program} ${args.join(" ")}`);
    return "";
  };
  return { exec, calls };
}

function project(t: TestContext, settings?: unknown, localSettings?: unknown): { root: string; home: string } {
  const root = withProject(t, { picket: false, host: true });
  const home = withProject(t, { picket: false });
  if (settings !== undefined) writeFileSync(join(root, ".claude", "settings.json"), JSON.stringify(settings));
  if (localSettings !== undefined) writeFileSync(join(root, ".claude", "settings.local.json"), JSON.stringify(localSettings));
  return { root, home };
}

function run(root: string, home: string, options: Record<string, unknown> = {}): Report {
  return init(root, { home, env: NO_PATH, ...options }) as Report;
}

function settingsOf(root: string): Record<string, unknown> & { extraKnownMarketplaces?: Record<string, unknown>; statusLine?: unknown } {
  return JSON.parse(readFileSync(join(root, ".claude", "settings.json"), "utf8"));
}

function step(report: Report, name: string): Step | undefined {
  return report.steps.find((entry) => entry.name === name);
}

test("init reads --root, --no-install and --statusline", () => {
  assert.deepEqual(parse(["--root", "/p", "--no-install", "--statusline"]), { root: "/p", install: false, statusline: true });
  assert.deepEqual(parse([]), { root: null, install: true, statusline: false });
});

test("on settings with no marketplace, init writes the settings marketplace and runs only the picket install (T-6.1)", (t) => {
  const { root, home } = project(t);
  const runner = recordingRunner();
  const report = run(root, home, { exec: runner.exec });
  assert.deepEqual(settingsOf(root).extraKnownMarketplaces?.picketai, INSTALL.marketplace);
  assert.deepEqual(runner.calls, ["claude plugin install picket@picketai --scope project"]);
  assert.equal(step(report, "marketplace")?.result, "created");
  assert.equal(step(report, "plugin")?.result, "created");
});

test("an old directory or GitHub entry and the retired mods: three uninstalls, then the install, and the entry replaced (T-6.2)", (t) => {
  for (const source of [{ source: "directory", path: "/old/picket" }, { source: "github", repo: "picketai/picket" }]) {
    const enabledPlugins = Object.fromEntries(RETIRED.map((id) => [id, true]));
    const { root, home } = project(t, { extraKnownMarketplaces: { picketai: { source } }, enabledPlugins });
    const runner = recordingRunner();
    const report = run(root, home, { exec: runner.exec });
    assert.deepEqual(runner.calls, [...RETIRED.map((id) => `claude plugin uninstall ${id} --scope project`), "claude plugin install picket@picketai --scope project"], source.source);
    assert.deepEqual(settingsOf(root).extraKnownMarketplaces?.picketai, INSTALL.marketplace);
    assert.equal(step(report, "marketplace")?.result, "updated");
    assert.equal(step(report, "marketplace")?.detail, `replaced the old source ${JSON.stringify(source)}`);
    assert.equal(runner.calls.some((call) => call.includes("marketplace")), false);
  }
});

test("on settings with no marketplace, init writes picketai's source with autoUpdate true, and a rerun leaves it unchanged (T-1.1)", (t) => {
  const { root, home } = project(t);
  assert.equal(step(run(root, home, { install: false }), "marketplace")?.result, "created");
  assert.deepEqual(settingsOf(root).extraKnownMarketplaces?.picketai, { source: INSTALL.marketplace.source, autoUpdate: true });
  assert.equal(step(run(root, home, { install: false }), "marketplace")?.result, "unchanged");
});

test("picketai's source without autoUpdate is updated to autoUpdate true, not reported as a replaced source (T-1.2)", (t) => {
  const { root, home } = project(t, { extraKnownMarketplaces: { picketai: { source: INSTALL.marketplace.source } } });
  const marketplace = step(run(root, home, { install: false }), "marketplace");
  assert.deepEqual(settingsOf(root).extraKnownMarketplaces?.picketai, { source: INSTALL.marketplace.source, autoUpdate: true });
  assert.deepEqual(marketplace, { name: "marketplace", path: join(root, ".claude", "settings.json"), result: "updated", detail: "turned on autoUpdate" });
});

test("picketai's source with autoUpdate false is left as the team set it (T-1.3)", (t) => {
  const entry = { source: INSTALL.marketplace.source, autoUpdate: false };
  const { root, home } = project(t, { extraKnownMarketplaces: { picketai: entry } });
  const marketplace = step(run(root, home, { install: false }), "marketplace");
  assert.deepEqual(settingsOf(root).extraKnownMarketplaces?.picketai, entry);
  assert.deepEqual(marketplace, { name: "marketplace", path: join(root, ".claude", "settings.json"), result: "unchanged", detail: "autoUpdate is off in this project, left as is" });
});

test("--no-install runs no command but still writes the marketplace, and a rerun leaves it unchanged", (t) => {
  const { root, home } = project(t, { enabledPlugins: { [RETIRED[0]]: true } });
  const runner = recordingRunner();
  const first = run(root, home, { exec: runner.exec, install: false });
  assert.deepEqual(runner.calls, []);
  assert.deepEqual(first.steps.slice(-3).map(({ name, result }) => `${name} ${result}`), [`retire ${RETIRED[0]} skipped`, "marketplace created", "plugin skipped"]);
  assert.equal(step(run(root, home, { exec: runner.exec, install: false }), "marketplace")?.result, "unchanged");
});

test("a failing install names the one command to run by hand", (t) => {
  const { root, home } = project(t);
  const exec: ProgramRunner = () => {
    throw Object.assign(new Error("exit 1"), { stderr: "warming up\nplugin not found\n" });
  };
  assert.equal(step(run(root, home, { exec }), "plugin")?.detail, "plugin not found; run by hand: claude plugin install picket@picketai --scope project");
});

test("without --statusline init writes no status line and removes the legacy one with a note (T-6.3)", (t) => {
  const fresh = project(t);
  run(fresh.root, fresh.home, { install: false });
  assert.equal("statusLine" in settingsOf(fresh.root), false);

  const legacy = project(t, { statusLine: LEGACY_STATUS_LINE });
  const report = run(legacy.root, legacy.home, { install: false });
  assert.equal("statusLine" in settingsOf(legacy.root), false);
  assert.equal(step(report, "settings")?.detail, 'removed the legacy statusLine "picket statusline"');
});

test("with --statusline init writes the bundle command, replaces the legacy one, and leaves another file's line alone (T-6.3)", (t) => {
  const fresh = project(t);
  run(fresh.root, fresh.home, { install: false, statusline: true });
  assert.deepEqual(settingsOf(fresh.root).statusLine, INSTALL.settings.statusLine);

  const legacy = project(t, { statusLine: LEGACY_STATUS_LINE });
  const replaced = run(legacy.root, legacy.home, { install: false, statusline: true });
  assert.deepEqual(settingsOf(legacy.root).statusLine, INSTALL.settings.statusLine);
  assert.equal(step(replaced, "settings")?.detail, 'replaced the legacy statusLine "picket statusline"');

  const local = project(t, {}, { statusLine: { type: "command", command: "local-line" } });
  const kept = run(local.root, local.home, { install: false, statusline: true });
  assert.equal("statusLine" in settingsOf(local.root), false);
  assert.equal(step(kept, "settings")?.detail, `statusLine already set in ${join(local.root, ".claude", "settings.local.json")}`);
});

test("with --statusline init replaces a data folder value with the project copy, and a rerun reports settings unchanged (T-2.3)", (t) => {
  const { root, home } = project(t, { statusLine: DATA_FOLDER_STATUS_LINE });
  const replaced = run(root, home, { install: false, statusline: true });
  assert.deepEqual(settingsOf(root).statusLine, { type: "command", command: 'node "${CLAUDE_PROJECT_DIR}/.picket/state/statusline.mjs"' });
  assert.equal(step(replaced, "settings")?.result, "updated");
  assert.equal(step(replaced, "settings")?.detail, "replaced the data folder statusLine with the project copy");

  const rerun = run(root, home, { install: false, statusline: true });
  assert.equal(step(rerun, "settings")?.result, "unchanged");
  assert.equal(step(rerun, "settings")?.detail, undefined);
});

test("without --statusline init leaves a data folder value with no note and still removes the legacy value (T-2.4)", (t) => {
  const data = project(t, { statusLine: DATA_FOLDER_STATUS_LINE });
  const kept = run(data.root, data.home, { install: false });
  assert.deepEqual(settingsOf(data.root).statusLine, DATA_FOLDER_STATUS_LINE);
  assert.equal(step(kept, "settings")?.detail, undefined);

  const legacy = project(t, { statusLine: LEGACY_STATUS_LINE });
  const removed = run(legacy.root, legacy.home, { install: false });
  assert.equal("statusLine" in settingsOf(legacy.root), false);
  assert.equal(step(removed, "settings")?.detail, 'removed the legacy statusLine "picket statusline"');
});

function globalPicket(t: TestContext): string {
  const bin = withProject(t, { picket: false });
  const launcher = join(bin, process.platform === "win32" ? "picket.cmd" : "picket");
  writeFileSync(launcher, "");
  chmodSync(launcher, 0o755);
  return launcher;
}

test("a picket earlier on PATH gives a WARNING with its path and the npm command, and init is still done (T-6.5)", async (t) => {
  const root = withProject(t, { picket: false });
  const launcher = globalPicket(t);
  const home = withProject(t, { picket: false });
  const outcome = await initProject({ root, install: false, statusline: false }, fixedContext(root, { home, env: { PATH: join(launcher, "..") } }));
  assert.equal(outcome.status, "done");
  const text = renderInit(outcome.status === "done" ? outcome.value : null);
  assert.match(text, new RegExp(`^WARNING: ${launcher.replace(/[\\.]/g, "\\$&")} .*npm uninstall -g @picketai/picket$`, "m"));
});

test("with PICKET_CHECKOUT set init checks no PATH and warns about nothing (T-6.5)", async (t) => {
  const root = withProject(t, { picket: false });
  const launcher = globalPicket(t);
  const home = withProject(t, { picket: false });
  const outcome = await initProject({ root, install: false, statusline: false }, fixedContext(root, { home, env: { PATH: join(launcher, ".."), PICKET_CHECKOUT: "/checkout" } }));
  assert.equal(outcome.status, "done");
  const report = outcome.status === "done" ? outcome.value : null;
  assert.deepEqual(report?.warnings, []);
  assert.doesNotMatch(renderInit(report), /WARNING:/);
});
