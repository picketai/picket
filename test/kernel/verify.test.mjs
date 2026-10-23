import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createWork, mustHaves } from "./work-fixture.mjs";
import { verify } from "../../dist/lib/verbs/verify/verify.mjs";
import { stateDir, statePath, STATE_FILES } from "../../dist/lib/shared/paths.mjs";

function setup(tests = false) {
  const root = mkdtempSync(join(tmpdir(), "harness-verify-"));
  mkdirSync(stateDir(root), { recursive: true });
  const s = createWork({ lane: "order", title: "Csv", root });
  writeFileSync(
    join(root, "work", s.id, "order.md"),
    [
      "---",
      "lane: order",
      "phases:",
      "  - n: 1",
      "    files: [src/http/csv.ts]",
      "    greps:",
      "      - path: src/http/handlers.ts",
      "        pattern: invoices\\.csv",
      `    tests: ${tests}`,
      "    drive: true",
      "---",
      "# O",
      "",
      "## Phase 1: CSV",
      "",
      "t",
    ].join("\n"),
  );
  return { root, id: s.id };
}

test("mustHaves reads the phase entry from frontmatter", () => {
  const { root, id } = setup();
  const mh = mustHaves(id, 1, root);
  assert.deepEqual(mh.files, ["src/http/csv.ts"]);
  assert.equal(mh.greps[0].pattern, "invoices\\.csv");
  assert.equal(mustHaves(id, 2, root), null);
  rmSync(root, { recursive: true, force: true });
});

test("verify fails on missing files, passes when files, greps and a drive exist", () => {
  const { root, id } = setup();
  let r = verify(id, 1, { root, runTests: false });
  assert.equal(r.ok, false);
  assert.equal(r.results.find((x) => x.name === "file:src/http/csv.ts").ok, false);
  assert.equal(r.results.find((x) => x.name === "drive_observed").ok, false);

  mkdirSync(join(root, "src", "http"), { recursive: true });
  writeFileSync(join(root, "src", "http", "csv.ts"), "export const x = 1;");
  writeFileSync(join(root, "src", "http", "handlers.ts"), 'router.add("GET", "/invoices.csv", h);');
  writeFileSync(statePath(root, STATE_FILES.driveLog), JSON.stringify({ kind: "drive", command: "curl http://127.0.0.1:8080/invoices.csv", work_id: id, phase: 1 }) + "\n");
  r = verify(id, 1, { root, runTests: false });
  assert.equal(r.ok, true, JSON.stringify(r.results));

  r = verify(id, 2, { root, runTests: false });
  assert.equal(r.ok, false);
  assert.equal(r.results[0].name, "phase_exists");
  rmSync(root, { recursive: true, force: true });
});

test("verify on a malformed package.json fails tests as undetected and carries the parse warning", () => {
  const { root, id } = setup(true);
  writeFileSync(join(root, "package.json"), '{ "scripts": { "test": "node t.js", }');
  const r = verify(id, 1, { root, runTests: true });
  assert.deepEqual(r.results.find((x) => x.name === "tests"), { name: "tests", ok: false, detail: "no test command detected" });
  assert.match(r.warnings[0], /^package\.json is not valid JSON \(.+\); no npm scripts detected$/);
  rmSync(root, { recursive: true, force: true });
});
