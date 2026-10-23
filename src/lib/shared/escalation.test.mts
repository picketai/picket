import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ASKING_MODES, commandKey, recordEscalation } from "./escalation.mts";
import { ledgerRows } from "#test/hook.mts";
import { withProject } from "#test/project.mts";

type AskCell = { scenario: string; hook_permission_mode: string; prompt_tool_called?: boolean; error?: unknown };

test("ASKING_MODES holds default, acceptEdits and auto, each proven by a headless ask cell, and auto only while its interactive dialog is shown", () => {
  const record: { cells: AskCell[]; interactive?: { auto_dialog?: string } } = JSON.parse(readFileSync(resolve("bench/results/ask-probe.json"), "utf8"));
  assert.deepEqual([...ASKING_MODES].sort(), ["acceptEdits", "auto", "default"]);
  for (const mode of ASKING_MODES) {
    const cell = record.cells.find((c) => c.scenario === "ask" && c.hook_permission_mode === mode);
    assert.ok(cell?.prompt_tool_called && !cell.error, `${mode} needs a headless ask cell that called the prompt tool`);
  }
  assert.equal(record.interactive?.auto_dialog, "shown", "auto is in ASKING_MODES, so the interactive probe must record its dialog as shown");
});

test("the escalation key is the same for the bash marker, both PowerShell marker quotes and the bare command", () => {
  const key = commandKey("git push");
  assert.equal(commandKey("$env:PICKET_ESCALATE='a'; git push"), key);
  assert.equal(commandKey('$env:PICKET_ESCALATE="b"; git push'), key);
  assert.equal(commandKey('PICKET_ESCALATE="c" git push'), key);
});

test("recordEscalation appends a v2 escalation row stamped with the given time and returns it", (t) => {
  const root = withProject(t, { host: true, picket: false });
  const now = new Date("2026-10-23T10:00:00.000Z");
  const row = recordEscalation(root, { session: "s3", outcome: "ask", command: "git push origin v1", reason: "you asked for the tag" }, now);
  assert.deepEqual(ledgerRows(root), [row]);
  assert.deepEqual([row.v, row.ts, row.event, row.outcome], [2, "2026-10-23T10:00:00.000Z", "escalation", "ask"]);
  assert.match(row.key, /^[0-9a-f]{64}$/);
});
