import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readSnapshot, stateView } from "../../dist/lib/shared/work/snapshot.mjs";
import { rootless, writeGoldenItems } from "./state-view-items.mjs";

const GOLDEN = JSON.parse(readFileSync(new URL("./state-view.json", import.meta.url), "utf8"));

test("stateView prints, byte for byte, what picket state printed for a fast, an order and a design item", () => {
  const root = mkdtempSync(join(tmpdir(), "picket-state-view-"));
  try {
    for (const [lane, id] of Object.entries(writeGoldenItems(root))) {
      assert.equal(rootless(JSON.stringify(stateView(readSnapshot(root, id))), root), GOLDEN[lane], lane);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
