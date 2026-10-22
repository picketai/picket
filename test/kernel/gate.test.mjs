import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createWork } from "../../dist/lib/work.mjs";
import { ownGate, phasePaths } from "../../dist/lib/gate.mjs";
import { writeConfig } from "./config-fixture.mjs";

function withDesign({ entry, body = "t\n", config }, fn) {
  const root = mkdtempSync(join(tmpdir(), "harness-gate-"));
  try {
    mkdirSync(join(root, ".claude"));
    if (config) writeConfig(root, config);
    const s = createWork({ lane: "design", title: "Gate", root });
    writeFileSync(join(root, "work", s.id, "design.md"), `---\nlane: design\nphases:\n  - n: 1\n${entry}---\n# D\n\n## Phase 1: One\n\n${body}`);
    return fn(s.id, root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function gateFor(design) {
  return withDesign(design, (id, root) => ownGate(id, 1, root));
}

test("phasePaths answers the union of frontmatter files and touch set paths, once each", () => {
  const paths = withDesign(
    {
      entry: "    files: [lib/a.mjs, lib/b.mjs]\n",
      body: "**Touch set:**\n- `lib/b.mjs`: why\n- `lib/dir/`: why\n\n**Changes:** `lib/ignored.mjs`\n\n## Phase 2: Two\n\n**Touch set:**\n- `lib/two.mjs`: why\n",
    },
    (id, root) => phasePaths(id, 1, root),
  );
  assert.deepEqual(paths, ["lib/a.mjs", "lib/b.mjs", "lib/dir/"]);
});

const plainFiles = "    files: [lib/plain.mjs]\n";

test("a security mark is read fail closed: any value but false marks the phase", () => {
  for (const value of ["security: true", "security: yes", 'security: "auth"']) {
    assert.equal(gateFor({ entry: `${plainFiles}    ${value}\n` })?.kind, "security_mark", value);
  }
  assert.deepEqual(gateFor({ entry: `${plainFiles}    security: true\n` }), {
    kind: "security_mark",
    reason: "is marked security-sensitive in the record",
  });
});

test("security: false and an absent key leave a phase with no other input ungated", () => {
  assert.equal(gateFor({ entry: `${plainFiles}    security: false\n` }), null);
  assert.equal(gateFor({ entry: plainFiles }), null);
});

test("a configured security path in the touch set gates the phase even when files does not list it", () => {
  const gate = gateFor({
    entry: "    files: [lib/other.mjs]\n",
    body: "**Touch set:**\n- `lib/other.mjs`: why\n- `lib/secure/key.mjs`: why\n\n**Changes:** `lib/secure/ignored.mjs`\n",
    config: { security_paths: ["lib/secure/"] },
  });
  assert.equal(gate?.kind, "security_path");
  assert.match(gate.reason, /lib\/secure\/key\.mjs/);
});

test("a configured security path in frontmatter files gates the phase", () => {
  const gate = gateFor({ entry: "    files: [lib\\secure\\key.mjs]\n", config: { security_paths: ["lib/secure/**"] } });
  assert.equal(gate?.kind, "security_path");
});

test("an [IRREVERSIBLE] marker counts in prose and not inside inline code or a fenced block (T-1.4)", () => {
  const plain = "- **T-1.1** drop the legacy column [IRREVERSIBLE]\n";
  assert.equal(gateFor({ entry: plainFiles, body: plain })?.kind, "irreversible");
  const inline = "**Touch set:**\n- `src/skills/designing/steps/15-migration.md`: the contract step marked `[IRREVERSIBLE]`\n\n- **T-1.1** the step file names `[IRREVERSIBLE]`\n";
  assert.equal(gateFor({ entry: plainFiles, body: inline }), null);
  const fenced = "Example:\n\n```\n## Phase 3: Drop the column [IRREVERSIBLE]\n```\n\n~~~md\n[IRREVERSIBLE]\n~~~\n";
  assert.equal(gateFor({ entry: plainFiles, body: fenced }), null);
  assert.equal(gateFor({ entry: plainFiles, body: `${inline}\nThe real step: [IRREVERSIBLE]\n` })?.kind, "irreversible", "a plain marker beside a quoted one still gates");
  const paths = withDesign({ entry: plainFiles, body: inline }, (id, root) => phasePaths(id, 1, root));
  assert.ok(paths.includes("src/skills/designing/steps/15-migration.md"), "touch-set paths in backticks still read");
  const unclosed = "- **T-1.1** a stray ` backtick here\n- **T-1.2** drop the column [IRREVERSIBLE]\n- **T-1.3** a later `code` span\n";
  assert.equal(gateFor({ entry: plainFiles, body: unclosed })?.kind, "irreversible", "an unclosed backtick never hides a marker on a later line");
  const sameLine = "- **T-1.1** a stray ` backtick, then drop the column [IRREVERSIBLE] and a `code` span\n";
  assert.equal(gateFor({ entry: plainFiles, body: sameLine })?.kind, "irreversible", "a stray backtick on the marker's line hides nothing");
  assert.equal(gateFor({ entry: plainFiles, body: "- **T-1.1** the step names `[IRREVERSIBLE]` and `15-migration.md`\n" }), null, "spans that open and close on the line still hide a quoted marker");
});

test("a security path wins over a mark, and a mark wins over an irreversible step", () => {
  const config = { security_paths: ["lib/secure/"] };
  const irreversible = "- **T-1.1** drop the table [IRREVERSIBLE]\n";
  assert.equal(gateFor({ entry: "    files: [lib/secure/a.mjs]\n    security: true\n", body: irreversible, config })?.kind, "security_path");
  assert.equal(gateFor({ entry: `${plainFiles}    security: true\n`, body: irreversible, config })?.kind, "security_mark");
  assert.deepEqual(gateFor({ entry: plainFiles, body: irreversible, config }), { kind: "irreversible", reason: "carries an irreversible step" });
});
