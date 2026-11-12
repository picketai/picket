import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fixedContext } from "#test/context.mts";
import { withProject } from "#test/project.mts";
import { DATA_FOLDER_STATUS_LINE, LEGACY_STATUS_LINE } from "../../shared/install.mts";
import { parseArgs } from "../../util/args.mts";
import { renderUninstall, uninstallFrom, verb } from "./index.mts";
import type { UninstallInput } from "./uninstall.mts";

const NO_CALLS = {
  exec: () => {
    throw new Error("no program may run");
  },
  prompt: { interactive: false, ask: async () => "no" },
};

test("uninstall parses --dry-run, --yes and --remove-work", () => {
  assert.deepEqual(verb.parse(parseArgs(["--dry-run"])), { dryRun: true, yes: false, removeWork: false });
  assert.deepEqual(verb.parse(parseArgs(["--yes", "--remove-work"])), { dryRun: false, yes: true, removeWork: true });
});

test("uninstall refuses the home folder, in other case on win32, and changes nothing (T-5.5)", async (t) => {
  const home = withProject(t, { host: true });
  const before = readdirSync(home).sort();
  const run = uninstallFrom(() => NO_CALLS);
  const outcome = await run({ dryRun: false, yes: true, removeWork: false }, fixedContext(home.toUpperCase(), { home: `${home.toLowerCase()}\\`, platform: "win32" }));
  assert.equal(outcome.status, "refused");
  assert.match(outcome.status === "refused" ? outcome.message : "", /home folder/);
  assert.deepEqual(readdirSync(home).sort(), before);
});

function homeWith(t: TestContext, statusLine?: unknown): { home: string; user: string } {
  const home = withProject(t, { picket: false, host: true });
  const user = join(home, ".claude", "settings.json");
  if (statusLine !== undefined) writeFileSync(user, JSON.stringify({ statusLine }));
  return { home, user };
}

async function manualOf(input: UninstallInput, root: string, home: string): Promise<string[]> {
  const outcome = await uninstallFrom(() => NO_CALLS)(input, fixedContext(root, { home }));
  assert.equal(outcome.status, "done");
  return outcome.status === "done" ? outcome.value.manual : [];
}

const DRY_RUN: UninstallInput = { dryRun: true, yes: false, removeWork: false };
const YES: UninstallInput = { dryRun: false, yes: true, removeWork: false };

test("uninstall names an old Picket line in user settings under the manual steps and leaves the file (T-2.5)", async (t) => {
  const { home, user } = homeWith(t, LEGACY_STATUS_LINE);
  const before = readFileSync(user, "utf8");
  const note = `remove the statusLine entry from ${user}: it holds an old Picket status line`;
  for (const input of [DRY_RUN, YES]) {
    const root = withProject(t, { picket: false });
    assert.ok((await manualOf(input, root, home)).includes(note), JSON.stringify(input));
  }
  assert.equal(readFileSync(user, "utf8"), before);
});

test("uninstall adds no status line note for a clean home or the style line in user settings (T-2.5, T-2.8)", async (t) => {
  for (const statusLine of [undefined, DATA_FOLDER_STATUS_LINE]) {
    const { home } = homeWith(t, statusLine);
    const root = withProject(t, { picket: false });
    assert.deepEqual(await manualOf(DRY_RUN, root, home), [], JSON.stringify(statusLine));
  }
});

test("the render ends with the machine-level steps once every group but work/ is removed", () => {
  const removed = renderUninstall({ root: "/p", changes: [{ id: "settings", summary: "s", result: "removed" }, { id: "work", summary: "w", result: "kept" }], manual: [] });
  assert.deepEqual(removed.split("\n").slice(-4), [
    "Picket is removed from this project.",
    "Also on this machine, if you want them gone:",
    "  npx @picketai/picket@alpha style remove --all  the theme, font and terminal scheme",
    "  npm uninstall -g @picketai/picket              a global picket left from an earlier install",
  ]);
  const planned = renderUninstall({ root: "/p", changes: [{ id: "settings", summary: "s", result: "planned", detail: "remove env.X" }], manual: [] });
  assert.equal(planned.split("\n").at(-1), "planned   settings: s · remove env.X");
});
