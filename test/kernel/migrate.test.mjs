import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { migrate, renderMigrate } from "../../core/lib/migrate.mjs";
import { preflight } from "../../core/lib/preflight.mjs";
import { createWork } from "../../core/lib/work.mjs";
import { LEGACY, STATE_FILES, branchingManifestPath, configPath, configRel, hostPath, legacyPath, stateDir, statePath, stateRel } from "../../core/lib/paths.mjs";

const LEGACY_LEDGER = `${LEGACY.stateDir}/${STATE_FILES.ledger}`;
const LEGACY_GUARD_LOG = `${LEGACY.stateDir}/guard-bash.log`;

function project() {
  const root = mkdtempSync(join(tmpdir(), "harness-migrate-"));
  mkdirSync(hostPath(root), { recursive: true });
  return root;
}

function writeLegacy(root, rel, text) {
  const path = legacyPath(root, rel);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
}

function writeState(root, name, text) {
  mkdirSync(stateDir(root), { recursive: true });
  writeFileSync(statePath(root, name), text);
}

function snapshot(root) {
  const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? [`${join(dir, e.name)}/`, ...walk(join(dir, e.name))] : [`${join(dir, e.name)}=${readFileSync(join(dir, e.name), "utf8")}`]));
  return walk(root).sort();
}

function withProject(fn) {
  const root = project();
  try {
    fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("a legacy ledger with no target is renamed and its emptied folder removed", () => {
  withProject((root) => {
    writeLegacy(root, LEGACY_LEDGER, '{"n":1}\n');
    const r = migrate(root);
    assert.deepEqual(r.moved, [{ from: LEGACY_LEDGER, to: stateRel(STATE_FILES.ledger), how: "renamed" }]);
    assert.equal(readFileSync(statePath(root, STATE_FILES.ledger), "utf8"), '{"n":1}\n');
    assert.deepEqual(r.removed, [LEGACY.stateDir]);
    assert.equal(existsSync(legacyPath(root, LEGACY.stateDir)), false);
  });
});

test("with both ledgers present the target keeps its own rows, then the legacy rows", () => {
  withProject((root) => {
    writeState(root, STATE_FILES.ledger, '{"n":"new"}\n');
    writeLegacy(root, LEGACY_LEDGER, '{"n":"old"}\n');
    const r = migrate(root);
    assert.equal(r.moved[0].how, "appended");
    assert.equal(readFileSync(statePath(root, STATE_FILES.ledger), "utf8"), '{"n":"new"}\n{"n":"old"}\n');
  });
});

test("guard-bash.log becomes guard.log and the manifest becomes branching.yaml", () => {
  withProject((root) => {
    writeLegacy(root, LEGACY_GUARD_LOG, "trace\n");
    writeLegacy(root, LEGACY.branchingManifest, "version: 1\n");
    const r = migrate(root);
    assert.deepEqual(r.moved.map((m) => [m.from, m.to]), [
      [LEGACY_GUARD_LOG, stateRel(STATE_FILES.guardLog)],
      [LEGACY.branchingManifest, stateRel(STATE_FILES.branchingManifest)],
    ]);
    assert.equal(readFileSync(statePath(root, STATE_FILES.guardLog), "utf8"), "trace\n");
    assert.equal(readFileSync(branchingManifestPath(root), "utf8"), "version: 1\n");
    assert.deepEqual(r.removed, [LEGACY.stateDir, LEGACY.branchingDir]);
  });
});

test("a legacy check log is dropped when the live one is newer", () => {
  withProject((root) => {
    writeLegacy(root, `${LEGACY.stateDir}/check-test.log`, "old run");
    const past = new Date(Date.now() - 60_000);
    utimesSync(legacyPath(root, `${LEGACY.stateDir}/check-test.log`), past, past);
    writeState(root, "check-test.log", "new run");
    assert.equal(migrate(root).moved[0].how, "dropped");
    assert.equal(readFileSync(statePath(root, "check-test.log"), "utf8"), "new run");
  });
});

test("a manifest that already exists in the state folder is kept and the legacy one reported", () => {
  withProject((root) => {
    writeState(root, STATE_FILES.branchingManifest, "live\n");
    writeLegacy(root, LEGACY.branchingManifest, "legacy\n");
    const r = migrate(root);
    assert.equal(r.skipped.length, 1);
    assert.equal(r.skipped[0].from, LEGACY.branchingManifest);
    assert.deepEqual(r.removed, []);
    assert.equal(readFileSync(branchingManifestPath(root), "utf8"), "live\n");
  });
});

test("a second run moves nothing", () => {
  withProject((root) => {
    writeLegacy(root, LEGACY_LEDGER, '{"n":1}\n');
    writeLegacy(root, LEGACY_GUARD_LOG, "trace\n");
    migrate(root);
    const again = migrate(root);
    assert.deepEqual(again, { dryRun: false, moved: [], skipped: [], removed: [] });
    assert.equal(renderMigrate(again), "nothing to migrate");
  });
});

test("--dry-run reports the plan and changes no file", () => {
  withProject((root) => {
    writeState(root, STATE_FILES.ledger, '{"n":"new"}\n');
    writeLegacy(root, LEGACY_LEDGER, '{"n":"old"}\n');
    writeLegacy(root, LEGACY.branchingManifest, "version: 1\n");
    const before = snapshot(root);
    const r = migrate(root, { dryRun: true });
    assert.equal(r.moved.length, 2);
    assert.deepEqual(snapshot(root), before);
    assert.match(renderMigrate(r), /^dry run: appended /m);
  });
});

test("harness.json becomes config.json with version 1 first and the same sources (T-5.5)", () => {
  withProject((root) => {
    const sources = { analysis: { env: "HARNESS_SOURCE_ANALYSIS" } };
    writeLegacy(root, LEGACY.config, JSON.stringify({ sources }));
    const r = migrate(root);
    assert.deepEqual(r.moved, [{ from: LEGACY.config, to: configRel(), how: "converted" }]);
    assert.equal(readFileSync(configPath(root), "utf8"), JSON.stringify({ version: 1, sources }, null, 2) + "\n");
    assert.equal(existsSync(legacyPath(root, LEGACY.config)), false);
    assert.deepEqual(migrate(root).moved, []);
  });
});

test("with both config files present nothing is deleted and the conflict is reported (T-5.5)", () => {
  withProject((root) => {
    writeLegacy(root, LEGACY.config, '{"sources":{}}');
    writeLegacy(root, configRel(), '{"version":1}\n');
    const r = migrate(root);
    assert.deepEqual(r.moved, []);
    assert.equal(r.skipped[0].from, LEGACY.config);
    assert.match(r.skipped[0].reason, /exists/);
    assert.equal(readFileSync(legacyPath(root, LEGACY.config), "utf8"), '{"sources":{}}');
    assert.equal(readFileSync(configPath(root), "utf8"), '{"version":1}\n');
  });
});

test("preflight warns about legacy state until migrate has run (T-4.3)", () => {
  withProject((root) => {
    const { id } = createWork({ lane: "order", title: "Legacy", root });
    writeLegacy(root, LEGACY_LEDGER, "{}\n");
    const warning = preflight(id, root).checks.find((c) => c.name === "legacy_paths");
    assert.equal(warning?.level, "warn");
    assert.match(warning.detail, /run tether migrate/);
    migrate(root);
    assert.equal(preflight(id, root).checks.some((c) => c.name === "legacy_paths"), false);
    assert.ok(statSync(statePath(root, STATE_FILES.ledger)).isFile());
  });
});
