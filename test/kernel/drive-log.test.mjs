import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { appendDriveRow, driveTarget, maskEnvValues, readDriveLog } from "../../dist/lib/shared/drive-log.mjs";
import { stateDir, statePath, STATE_FILES } from "../../dist/lib/shared/paths.mjs";
import { createWork } from "./work-fixture.mjs";

const ROW = { ts: "2026-10-22T08:00:00.000Z", kind: "drive", command: "curl -s http://127.0.0.1:8080/health", work_id: null, phase: null };

function withRoot(body) {
  const root = mkdtempSync(join(tmpdir(), "picket-drive-log-"));
  try {
    body(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("appendDriveRow starts a new line after a file that ends mid-line, and readDriveLog skips the bad line", () => {
  withRoot((root) => {
    mkdirSync(stateDir(root), { recursive: true });
    writeFileSync(statePath(root, STATE_FILES.driveLog), '{"kind":"dri');
    appendDriveRow(root, ROW);
    assert.deepEqual(readFileSync(statePath(root, STATE_FILES.driveLog), "utf8").split("\n"), ['{"kind":"dri', JSON.stringify(ROW), ""]);
    assert.deepEqual(readDriveLog(root), { rows: [ROW], skipped: 1 });
  });
});

test("readDriveLog of a missing log is empty", () => {
  withRoot((root) => assert.deepEqual(readDriveLog(root), { rows: [], skipped: 0 }));
});

test("maskEnvValues hides a quoted --env value", () => {
  assert.equal(maskEnvValues('picket drive --env TOKEN="a b" --run x'), "picket drive --env TOKEN=*** --run x");
});

test("driveTarget names the current item, or nothing when there is none", () => {
  withRoot((root) => {
    assert.deepEqual(driveTarget(root, { session: null }), { work_id: null, phase: null });
    const { id } = createWork({ lane: "fast", title: "Target", root });
    assert.deepEqual(driveTarget(root, { session: null }), { work_id: id, phase: null });
  });
});
