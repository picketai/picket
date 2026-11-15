import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { appendDriveRow, driveTarget, maskedBody, maskEnvValues, readDriveLog } from "./drive-log.mts";
import { stateDir, statePath, STATE_FILES } from "./paths.mts";
import { openItem, withProject } from "#test/project.mts";

const ROW = { ts: "2026-10-22T08:00:00.000Z", kind: "drive", command: "curl -s http://127.0.0.1:8080/health", work_id: null, phase: null } as const;

test("appendDriveRow starts a new line after a file that ends mid-line, and readDriveLog skips the bad line", (t) => {
  const root = withProject(t, { picket: false });
  mkdirSync(stateDir(root), { recursive: true });
  writeFileSync(statePath(root, STATE_FILES.driveLog), '{"kind":"dri');
  appendDriveRow(root, ROW);
  assert.deepEqual(readFileSync(statePath(root, STATE_FILES.driveLog), "utf8").split("\n"), ['{"kind":"dri', JSON.stringify(ROW), ""]);
  assert.deepEqual(readDriveLog(root), { rows: [ROW], skipped: 1 });
});

test("readDriveLog of a missing log is empty", (t) => {
  assert.deepEqual(readDriveLog(withProject(t, { picket: false })), { rows: [], skipped: 0 });
});

test("maskEnvValues hides a quoted --env value", () => {
  assert.equal(maskEnvValues('picket drive --env TOKEN="a b" --run x'), "picket drive --env TOKEN=*** --run x");
});

test("driveTarget names the current item, or nothing when there is none", (t) => {
  const root = withProject(t, { picket: false });
  assert.deepEqual(driveTarget(root, { session: null }), { work_id: null, phase: null });
  const { id } = openItem(root, { lane: "fast", title: "Target" });
  assert.deepEqual(driveTarget(root, { session: null }), { work_id: id, phase: null });
});

test("a JSON body has every string or number under a secret-named key masked at any depth (T-7.3)", () => {
  assert.equal(maskedBody('{"user":"a","password":"p","nested":{"apiKey":"k","n":1}}'), '{"user":"a","password":"***","nested":{"apiKey":"***","n":1}}');
  assert.equal(maskedBody('[{"token":42,"items":[{"secret":"s","sku":"PKT-b"}]}]'), '[{"token":"***","items":[{"secret":"***","sku":"PKT-b"}]}]');
  assert.equal(maskedBody('{"sku":"PKT-a"}'), '{"sku":"PKT-a"}');
});

test("a body that is not JSON is masked as pairs (T-7.3)", () => {
  assert.equal(maskedBody("name=x&password=y"), "name=x&password=***");
  assert.equal(maskedBody("plain text"), "plain text");
});
