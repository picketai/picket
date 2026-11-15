import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { listScenarios } from "./files.mts";
import { writeScenario, type Card } from "./format.mts";

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
  assert.deepEqual(first, { path: ".picket/env/scenarios/S-0001.md", id: "S-0002", card: ready, problems: [], byHand: true });
  assert.deepEqual(second, { path: ".picket/env/scenarios/S-0002.md", id: "S-0002", card: smoke("S-0002"), problems: ["header: id S-0002 is already used by .picket/env/scenarios/S-0001.md"], byHand: false });
  assert.deepEqual(third, { path: ".picket/env/scenarios/S-0003.md", id: "S-0003", card: null, problems: ["header: a card starts with a --- header block"], byHand: true });
});

test("a broken card whose file name is no scenario id has no id", (t) => {
  const [only] = listScenarios(project(t, { "draft.md": "click\n" }));
  assert.equal(only.id, null);
  assert.equal(only.card, null);
});
