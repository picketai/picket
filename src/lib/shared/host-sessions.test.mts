import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { hostConfigDir, liveSessionIds } from "./host-sessions.mts";
import { HOST_DIR } from "./paths.mts";
import { withProject } from "#test/project.mts";

const ROOT = "/work/shop";

test("live session ids are the registry sessions running in the root or one of its worktrees, skipping malformed files (T-2.2)", (t) => {
  const config = withProject(t, { picket: false });
  const sessions = join(config, "sessions");
  mkdirSync(sessions);
  const rows: Record<string, unknown> = {
    "101.json": { pid: 101, sessionId: "aaaa-1", cwd: ROOT },
    "202.json": { pid: 202, sessionId: "bbbb-2", cwd: `${ROOT}/.worktrees/fix-a` },
    "303.json": { pid: 303, sessionId: "cccc-3", cwd: `${ROOT}/svc/.worktrees/fix-b` },
    "404.json": { pid: 404, sessionId: "dddd-4", cwd: `${ROOT}/src` },
    "505.json": { pid: 505, sessionId: "eeee-5", cwd: "/work/other" },
    "606.json": { pid: 606, sessionId: "ffff-6" },
    "707.json": { pid: 707, cwd: ROOT },
  };
  for (const [name, row] of Object.entries(rows)) writeFileSync(join(sessions, name), JSON.stringify(row));
  writeFileSync(join(sessions, "808.json"), "{ not json");
  writeFileSync(join(sessions, "notes.txt"), JSON.stringify({ sessionId: "gggg-7", cwd: ROOT }));
  assert.deepEqual([...liveSessionIds(config, ROOT)].sort(), ["aaaa-1", "bbbb-2", "cccc-3"]);
});

test("a config dir with no sessions folder has no live sessions (T-2.2)", (t) => {
  const config = withProject(t, { picket: false });
  assert.deepEqual(liveSessionIds(config, ROOT), new Set());
});

test("the host config dir is CLAUDE_CONFIG_DIR when it is set (T-1.3)", () => {
  assert.equal(hostConfigDir({ CLAUDE_CONFIG_DIR: "/opt/claude" }, "/home/dev"), "/opt/claude");
});

test("the host config dir is <home>/.claude when CLAUDE_CONFIG_DIR is not set (T-1.3)", () => {
  assert.equal(hostConfigDir({}, "/home/dev"), join("/home/dev", HOST_DIR));
});
