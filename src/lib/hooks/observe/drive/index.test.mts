import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { observeDrive as driveHandler } from "./index.mts";
import { guardBash as bashHandler } from "../../guard/bash/index.mts";
import { statePath, STATE_FILES } from "../../../shared/paths.mts";
import { hookContext } from "#test/context.mts";
import { looseHandler } from "#test/hook.mts";
import { withProject } from "#test/project.mts";

const observeDrive = looseHandler(driveHandler);
const guardBash = looseHandler(bashHandler);

const PUSH = "git push origin v1.0.0-alpha.2";
const ESCALATED_PUSH = `PICKET_ESCALATE="you asked me to push the release tag" ${PUSH}`;

test("an approved escalation that failed counts as ran, so the next one asks fresh", (t) => {
  const root = withProject(t, { host: true, picket: false });
  const home = withProject(t, { picket: false });
  const judge = (command: string) => guardBash({ hook_event_name: "PreToolUse", tool_name: "Bash", tool_input: { command }, cwd: root, session_id: "s1", permission_mode: "default" }, hookContext(root, { home }))?.hookSpecificOutput ?? null;
  const ledger = statePath(root, STATE_FILES.ledger);
  const escalationRows = () => (existsSync(ledger) ? readFileSync(ledger, "utf8").trim().split("\n").map((l) => JSON.parse(l)).filter((r) => r.event === "escalation") : []);
  assert.equal(judge(ESCALATED_PUSH).permissionDecision, "ask");
  observeDrive({ hook_event_name: "PostToolUseFailure", tool_name: "Bash", tool_input: { command: ESCALATED_PUSH }, session_id: "s1" }, hookContext(root));
  assert.equal(judge(`PICKET_ESCALATE="the remote is fixed now" ${PUSH}`).permissionDecision, "ask");
  assert.deepEqual(escalationRows().map((r) => [r.outcome, r.why]), [["ask", null], ["ran", "failed"], ["ask", null]]);
});
