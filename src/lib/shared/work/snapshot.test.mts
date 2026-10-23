import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, sep } from "node:path";
import { readSnapshot, stateView } from "./snapshot.mts";
import { workId } from "./files.mts";
import { setMarker } from "./markers.mts";
import { appendVerdict, type VerdictEntry } from "./verdict-log.mts";
import { openItem, withProject } from "#test/project.mts";

const GOLDEN: Record<string, string> = JSON.parse(readFileSync(new URL("./state-view.test.json", import.meta.url), "utf8"));

const CREATED = "2026-10-23T10:00:00.000Z";
const UPDATED = "2026-10-23T11:00:00.000Z";

type GoldenItem = { state: Record<string, string | number>; files?: Record<string, string>; markers?: string[] };

function stateYaml(fields: Record<string, string | number>): string {
  return Object.entries(fields).map(([key, value]) => `${key}: ${value}`).join("\n") + "\n";
}

function writeItem(root: string, id: string, { state, files = {}, markers = [] }: GoldenItem) {
  const dir = join(root, "work", id);
  mkdirSync(join(dir, "phases"), { recursive: true });
  writeFileSync(join(dir, "state.yaml"), stateYaml({ id, ...state, created: CREATED, updated: UPDATED }));
  for (const [name, text] of Object.entries(files)) writeFileSync(join(dir, name), text);
  for (const marker of markers) writeFileSync(join(dir, "phases", marker), `${CREATED}\n`);
}

const lines = (...rows: string[]) => rows.join("\n") + "\n";

const ORDER = lines(
  "---",
  "lane: order",
  "phases:",
  "  - n: 1",
  "    files: [src/a.ts]",
  "  - n: 2",
  "    files: [src/b.ts]",
  "  - n: 3",
  "    files: [src/c.ts]",
  "---",
  "# Order",
  "",
  "## Phase 1: First",
  "",
  "text",
  "",
  "## Phase 2: Second",
  "",
  "text",
  "",
  "## Phase 3: Third",
  "",
  "text",
);

const DESIGN = lines(
  "---",
  "lane: design",
  "phases:",
  "  - n: 1",
  "    files: [lib/plain.mjs]",
  "    security: false",
  "  - n: 2",
  "    files: [src/auth/token.ts]",
  "    security: true",
  "---",
  "# Design",
  "",
  "## Phase 1: Plain",
  "",
  "**Touch set:**",
  "- `lib/plain.mjs`: why",
  "",
  "## Phase 2: Token",
  "",
  "**Touch set:**",
  "- `src/auth/token.ts`: why",
);

const ORDER_VERDICTS = [
  { ts: "2026-10-23T10:10:00.000Z", agent: "developer", verdict: "PHASE DONE", phase: 1, scope: null, through: null },
  { ts: "2026-10-23T10:20:00.000Z", agent: "user", verdict: "approved", phase: 1, scope: null, through: null },
];

const GOLDEN_IDS = { fast: "20261023-golden-fast", order: "20261023-golden-order", design: "20261023-golden-design" };

function writeGoldenItems(root: string) {
  writeItem(root, GOLDEN_IDS.fast, { state: { lane: "fast", title: "Golden fast", status: "open" } });
  writeItem(root, GOLDEN_IDS.order, {
    state: { lane: "order", title: "Golden order", status: "open", base: "c7ee39df0a5867d7c5168340c71e82027a647918" },
    files: { "order.md": ORDER, "verdicts.jsonl": ORDER_VERDICTS.map((row) => JSON.stringify(row)).join("\n") + "\n" },
    markers: ["1.done", "1.approved", "2.done"],
  });
  writeItem(root, GOLDEN_IDS.design, {
    state: { lane: "design", title: "Golden design", status: "blocked", blocked_reason: "PHASE STALLED on phase 2", session: "s-golden", run_through: 2 },
    files: { "design.md": DESIGN },
    markers: ["1.done", "1.approved", "1.reviewed"],
  });
  return GOLDEN_IDS;
}

function inJson(text: string): string {
  return JSON.stringify(text).slice(1, -1);
}

function rootless(text: string, root: string): string {
  return text.replaceAll(inJson(root), "<root>").replaceAll(inJson(sep), "/");
}

test("deriveState reads phases from the artifact and markers from disk", (t) => {
  const root = withProject(t, { host: true, picket: false });
  const s = openItem(root, { lane: "order", title: "Csv" });
  writeFileSync(
    join(root, "work", s.id, "order.md"),
    `---\nlane: order\nphases:\n  - n: 1\n    files: [src/http/csv.ts]\n  - n: 2\n    files: [src/http/handlers.ts]\n---\n# Order\n\n## Phase 1: CSV module\n\ntext\n\n## Phase 2: Route\n\ntext\n`,
  );
  let d = stateView(readSnapshot(root, s.id));
  assert.equal(d.phase_count, 2);
  assert.equal(d.current_phase, 1);
  assert.deepEqual(d.phases.map((p) => p.title), ["CSV module", "Route"]);
  setMarker(root, s.id, 1, "done", new Date());
  setMarker(root, s.id, 1, "approved", new Date());
  appendVerdict(root, s.id, { agent: "reviewer", verdict: "APPROVED", phase: 1 } as VerdictEntry, new Date());
  d = stateView(readSnapshot(root, s.id));
  assert.equal(d.phases_approved, 1);
  assert.equal(d.current_phase, 2);
  assert.equal(d.last_verdict?.verdict, "APPROVED");
});

const READABLE_ROW = '{"ts":"2026-10-23T10:00:00Z","agent":"architect","verdict":"ARTIFACT WRITTEN","phase":null}';

test("readSnapshot reports a skipped verdict line, and stateView prints it with the last readable row", (t) => {
  const root = withProject(t, { host: true, picket: false });
  const { id } = openItem(root, { lane: "order", title: "Truncated" });
  writeFileSync(join(root, "work", id, "verdicts.jsonl"), `${READABLE_ROW}\n{"ts":"2026`);
  const snap = readSnapshot(root, id);
  assert.deepEqual(snap.warnings, ["verdicts.jsonl: 1 unreadable line skipped"]);
  const view = stateView(snap);
  assert.deepEqual(view.warnings, ["verdicts.jsonl: 1 unreadable line skipped"]);
  assert.equal(view.last_verdict?.verdict, "ARTIFACT WRITTEN");
  writeFileSync(join(root, "work", id, "verdicts.jsonl"), `{"ts"\n${READABLE_ROW}\n{"ts":"2026`);
  assert.deepEqual(readSnapshot(root, id).warnings, ["verdicts.jsonl: 2 unreadable lines skipped"]);
});

test("stateView prints, byte for byte, what picket state printed for a fast, an order and a design item", (t) => {
  const root = withProject(t, { picket: false });
  for (const [lane, id] of Object.entries(writeGoldenItems(root))) {
    assert.equal(rootless(JSON.stringify(stateView(readSnapshot(root, workId(id)))), root), GOLDEN[lane], lane);
  }
});
