import { mkdirSync, writeFileSync } from "node:fs";
import { join, sep } from "node:path";

const CREATED = "2026-10-23T10:00:00.000Z";
const UPDATED = "2026-10-23T11:00:00.000Z";

function stateYaml(fields) {
  return Object.entries(fields).map(([key, value]) => `${key}: ${value}`).join("\n") + "\n";
}

function writeItem(root, id, { state, files = {}, markers = [] }) {
  const dir = join(root, "work", id);
  mkdirSync(join(dir, "phases"), { recursive: true });
  writeFileSync(join(dir, "state.yaml"), stateYaml({ id, ...state, created: CREATED, updated: UPDATED }));
  for (const [name, text] of Object.entries(files)) writeFileSync(join(dir, name), text);
  for (const marker of markers) writeFileSync(join(dir, "phases", marker), `${CREATED}\n`);
}

const lines = (...rows) => rows.join("\n") + "\n";

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

export const GOLDEN_IDS = { fast: "20261023-golden-fast", order: "20261023-golden-order", design: "20261023-golden-design" };

export function writeGoldenItems(root) {
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

function inJson(text) {
  return JSON.stringify(text).slice(1, -1);
}

export function rootless(text, root) {
  return text.replaceAll(inJson(root), "<root>").replaceAll(inJson(sep), "/");
}
