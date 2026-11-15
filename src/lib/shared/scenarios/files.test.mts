import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { acceptFingerprint, listScenarios, readAccepted } from "./files.mts";
import { fingerprintOf, writeScenario, type Card } from "./format.mts";

const DIR = join(".picket", "env", "scenarios");

function smoke(id: string): Card {
  return {
    header: { id, kind: "smoke", covers: [], intent: "orders answers its health check", status: "active", format: 1 },
    steps: [{ word: "request", line: 1, method: "GET", target: "{orders}/health", headers: [], body: null }],
  };
}

function project(t: TestContext, files: Record<string, string> | null): string {
  const root = mkdtempSync(join(tmpdir(), "picket-scenarios-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  if (files === null) return root;
  mkdirSync(join(root, DIR), { recursive: true });
  for (const [name, text] of Object.entries(files)) writeFileSync(join(root, DIR, name), text);
  return root;
}

test("a project without the scenario folder lists nothing", (t) => {
  assert.deepEqual(listScenarios(project(t, null)), []);
});

test("cards are listed by file name with their id, card, problems and hand-change flag", (t) => {
  const written = writeScenario(smoke("S-0002"));
  const root = project(t, { "S-0002.md": written, "S-0001.md": written.replace("{orders}/health", "{orders}/ready"), "S-0003.md": "click\n", "notes.txt": "x" });
  const [first, second, third, ...rest] = listScenarios(root);
  assert.deepEqual(rest, []);
  const ready: Card = { ...smoke("S-0002"), steps: [{ word: "request", line: 1, method: "GET", target: "{orders}/ready", headers: [], body: null }] };
  const edited = written.replace("{orders}/health", "{orders}/ready");
  assert.deepEqual(first, { path: ".picket/env/scenarios/S-0001.md", id: "S-0002", card: ready, problems: [], fingerprint: fingerprintOf(edited), byHand: true });
  assert.deepEqual(second, {
    path: ".picket/env/scenarios/S-0002.md",
    id: "S-0002",
    card: smoke("S-0002"),
    problems: ["header: id S-0002 is already used by .picket/env/scenarios/S-0001.md"],
    fingerprint: fingerprintOf(written),
    byHand: false,
  });
  assert.deepEqual(third, { path: ".picket/env/scenarios/S-0003.md", id: "S-0003", card: null, problems: ["header: a card starts with a --- header block"], fingerprint: fingerprintOf("click\n"), byHand: true });
});

test("an accepted fingerprint makes a hand-changed card the normal version on this machine (T-4.3)", (t) => {
  const edited = writeScenario(smoke("S-0001")).replace("{orders}/health", "{orders}/ready");
  const root = project(t, { "S-0001.md": edited });
  assert.deepEqual(readAccepted(root), new Set());
  assert.equal(listScenarios(root)[0].byHand, true);
  acceptFingerprint(root, fingerprintOf(edited));
  acceptFingerprint(root, fingerprintOf(edited));
  assert.deepEqual(readAccepted(root), new Set([fingerprintOf(edited)]));
  assert.equal(listScenarios(root)[0].byHand, false);
  writeFileSync(join(root, DIR, "S-0001.md"), `${edited}request GET {orders}/x\n`);
  assert.equal(listScenarios(root)[0].byHand, true);
});

test("a broken card whose file name is no scenario id has no id", (t) => {
  const [only] = listScenarios(project(t, { "draft.md": "click\n" }));
  assert.equal(only.id, null);
  assert.equal(only.card, null);
});
