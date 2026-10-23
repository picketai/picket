import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { fixedContext } from "#test/context.mts";
import { withProject } from "#test/project.mts";
import { parseArgs } from "../../util/args.mts";
import { renderUninstall, uninstallFrom, verb } from "./index.mts";

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

test("the render ends with the machine-level steps once every group but work/ is removed", () => {
  const removed = renderUninstall({ root: "/p", changes: [{ id: "settings", summary: "s", result: "removed" }, { id: "work", summary: "w", result: "kept" }], manual: [] });
  assert.deepEqual(removed.split("\n").slice(-4), [
    "Picket is removed from this project.",
    "Also on this machine, if you want them gone:",
    "  picket style remove --all          the theme, font and terminal scheme",
    "  npm uninstall -g @picketai/picket  the picket command",
  ]);
  const planned = renderUninstall({ root: "/p", changes: [{ id: "settings", summary: "s", result: "planned", detail: "remove env.X" }], manual: [] });
  assert.equal(planned.split("\n").at(-1), "planned   settings: s · remove env.X");
});
