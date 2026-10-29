import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import { CHECKLIST_ROOT, MAPPED_CHECKLISTS, reviewChecklists, type Checklist, type ChecklistInput } from "./review-checklists.mts";

const SMALL: ChecklistInput = { size: "small", frameworks: ["react", "typescript"], concerns: [], security_path: false, extension_steps: [] };
const names = (list: Checklist[]) => list.map((c) => c.path.replace(CHECKLIST_ROOT, ""));
const entry = (list: Checklist[], name: string) => list.find((c) => c.path === CHECKLIST_ROOT + name);

test("a small phase review loads alignment, bar, security and one file per mapped framework", () => {
  const list = reviewChecklists(SMALL, "phase");
  assert.deepEqual(names(list), ["alignment.md", "bar.md", "patterns-security.md", "framework-typescript.md"]);
  assert.ok(list.every((c) => c.path.startsWith("${CLAUDE_PLUGIN_ROOT}/skills/reviewing/checklists/")));
});

test("medium skips SOLID and DRY in patterns-core and adds red flags and concerns; large and security load it whole", () => {
  const medium = reviewChecklists({ ...SMALL, size: "medium", concerns: ["clean-architecture", "vertical-slice", "hexagonal"] }, "phase");
  assert.deepEqual(names(medium), [
    "alignment.md",
    "bar.md",
    "patterns-core.md",
    "design-red-flags.md",
    "patterns-security.md",
    "framework-typescript.md",
    "concern-clean-architecture.md",
    "concern-vertical-slice.md",
  ]);
  assert.deepEqual(entry(medium, "patterns-core.md")?.skip, ["SOLID", "DRY"]);
  assert.equal(entry(reviewChecklists({ ...SMALL, size: "large" }, "phase"), "patterns-core.md")?.skip, undefined);
  const secured = reviewChecklists({ ...SMALL, security_path: true }, "phase");
  assert.deepEqual(entry(secured, "patterns-core.md"), { path: `${CHECKLIST_ROOT}patterns-core.md` });
  assert.equal(entry(secured, "design-red-flags.md"), undefined);
});

test("cumulative adds traced after bar, crosscheck loads its own file alone, extension steps come last unchanged", () => {
  const steps = [{ extension: "acme", path: ".picket/extensions/acme/review/api.md" }];
  const cumulative = names(reviewChecklists({ ...SMALL, extension_steps: steps }, "cumulative"));
  assert.deepEqual(cumulative.slice(0, 3), ["alignment.md", "bar.md", "traced.md"]);
  assert.equal(cumulative.at(-1), ".picket/extensions/acme/review/api.md");
  assert.equal(names(reviewChecklists(SMALL, "checkpoint")).includes("traced.md"), false);
  assert.deepEqual(names(reviewChecklists({ ...SMALL, extension_steps: steps }, "crosscheck")), ["crosscheck.md"]);
});

test("every checklist the map names exists in the reviewing skill", () => {
  const onDisk = readdirSync(resolve("src/skills/reviewing/checklists"));
  assert.deepEqual(MAPPED_CHECKLISTS.filter((name) => !onDisk.includes(name)), []);
});
