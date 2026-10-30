import { test } from "node:test";
import assert from "node:assert/strict";
import { parseArgs, UsageError } from "../../util/args.mts";
import { workId } from "../../shared/work/files.mts";
import { submoduleEntry, type RepoOutcome } from "./create.mts";
import { renderWorktree, verb } from "./index.mts";

const ID = workId("20261030-x");
const parse = (argv: string[]) => verb.parse(parseArgs(argv));
const SHA = "1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b";

const outcome = (fields: Partial<RepoOutcome>): RepoOutcome => ({
  repo: "src/Orders",
  worktree: "src/Orders/.worktrees/RMS-12",
  state: "created",
  base: SHA,
  hydrated: [],
  reported: [],
  conflicted: [],
  ...fields,
});

test("worktree reads the bare form, --record with an optional --from, and --none, and refuses mixed forms", () => {
  assert.deepEqual(parse([ID]), { id: ID, mode: "create" });
  assert.deepEqual(parse([ID, "--record", "RMS-12"]), { id: ID, mode: "record", choice: { name: "RMS-12" } });
  assert.deepEqual(parse([ID, "--record", "feature/x", "--from", "develop"]), { id: ID, mode: "record", choice: { name: "feature/x", from: "develop" } });
  assert.deepEqual(parse([ID, "--none"]), { id: ID, mode: "none" });
  assert.throws(() => parse([]), UsageError);
  assert.throws(() => parse([ID, "--record", "RMS-12", "--none"]), /exclude each other/);
  assert.throws(() => parse([ID, "--from", "develop"]), /--from needs --record/);
});

test("a submodule status line maps its first character to hydrate, report, conflict or leave (T-2.4)", () => {
  assert.deepEqual(submoduleEntry(`-${SHA} libs/lib`), { action: "hydrate", path: "libs/lib" });
  assert.deepEqual(submoduleEntry(`+${SHA} libs/lib (heads/main)`), { action: "report", path: "libs/lib" });
  assert.deepEqual(submoduleEntry(`U${SHA} libs/lib`), { action: "conflict", path: "libs/lib" });
  assert.deepEqual(submoduleEntry(` ${SHA} libs/lib (v1.0)`), { action: "leave", path: "libs/lib" });
  assert.equal(submoduleEntry(""), null);
});

test("the rendered map names one line per repo and one per settled submodule", () => {
  const created = outcome({ hydrated: ["libs/a"], reported: ["libs/b"], conflicted: ["libs/c"] });
  assert.equal(
    renderWorktree({ id: ID, mode: "create", branch: "RMS-12", repos: [created, outcome({ repo: "src/Billing", worktree: "src/Billing/.worktrees/RMS-12", state: "failed", base: null, error: "git worktree failed: boom" })] }),
    [
      `${ID}: branch RMS-12`,
      "src/Orders -> src/Orders/.worktrees/RMS-12 · created · base 1a2b3c4d",
      "  submodule libs/a · hydrated",
      "  submodule libs/b · reported, its commit kept",
      "  submodule libs/c · conflicted",
      "src/Billing -> src/Billing/.worktrees/RMS-12 · failed · git worktree failed: boom",
    ].join("\n"),
  );
});

test("the rendered record names the planned start of each repo, and none names the main checkouts", () => {
  const planned = [{ repo: "src/Orders", from: "main", base: SHA, worktree: "src/Orders/.worktrees/RMS-12" }];
  assert.equal(renderWorktree({ id: ID, mode: "record", branch: "RMS-12", planned }), `${ID}: branch RMS-12 recorded\nsrc/Orders -> src/Orders/.worktrees/RMS-12 · planned · from main @1a2b3c4d`);
  assert.equal(renderWorktree({ id: ID, mode: "record", branch: "RMS-12", planned: [] }), `${ID}: branch RMS-12 recorded\nno nested repo is touched by the plan`);
  assert.equal(renderWorktree({ id: ID, mode: "none" }), `${ID} works in the main checkouts`);
});
