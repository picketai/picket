import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { hostConfigDir, liveSessionIds } from "./host-sessions.mts";
import { HOST_DIR } from "./paths.mts";
import { withProject } from "#test/project.mts";

test("live session ids are the sessionId of each readable registry file, skipping malformed ones (T-1.3)", (t) => {
  const config = withProject(t, { picket: false });
  const sessions = join(config, "sessions");
  mkdirSync(sessions);
  writeFileSync(join(sessions, "101.json"), JSON.stringify({ pid: 101, sessionId: "aaaa-1" }));
  writeFileSync(join(sessions, "202.json"), JSON.stringify({ pid: 202, sessionId: "bbbb-2" }));
  writeFileSync(join(sessions, "303.json"), "{ not json");
  writeFileSync(join(sessions, "404.json"), JSON.stringify({ pid: 404 }));
  writeFileSync(join(sessions, "notes.txt"), JSON.stringify({ sessionId: "cccc-3" }));
  assert.deepEqual([...liveSessionIds(config)].sort(), ["aaaa-1", "bbbb-2"]);
});

test("a config dir with no sessions folder has no live sessions (T-1.3)", (t) => {
  const config = withProject(t, { picket: false });
  assert.deepEqual(liveSessionIds(config), new Set());
});

test("the host config dir is CLAUDE_CONFIG_DIR when it is set (T-1.3)", () => {
  assert.equal(hostConfigDir({ CLAUDE_CONFIG_DIR: "/opt/claude" }, "/home/dev"), "/opt/claude");
});

test("the host config dir is <home>/.claude when CLAUDE_CONFIG_DIR is not set (T-1.3)", () => {
  assert.equal(hostConfigDir({}, "/home/dev"), join("/home/dev", HOST_DIR));
});
