import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createWork } from "../../.claude/lib/work.mjs";
import { ownGate } from "../../.claude/lib/gate.mjs";
import { writeConfig } from "./config-fixture.mjs";

function gateFor({ entry, body = "t\n", config }) {
  const root = mkdtempSync(join(tmpdir(), "harness-gate-"));
  try {
    mkdirSync(join(root, ".claude"));
    if (config) writeConfig(root, config);
    const s = createWork({ lane: "design", title: "Gate", root });
    writeFileSync(join(root, "work", s.id, "design.md"), `---\nlane: design\nphases:\n  - n: 1\n${entry}---\n# D\n\n## Phase 1: One\n\n${body}`);
    return ownGate(s.id, 1, root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

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

test("a security path wins over a mark, and a mark wins over an irreversible step", () => {
  const config = { security_paths: ["lib/secure/"] };
  const irreversible = "- **T-1.1** drop the table [IRREVERSIBLE]\n";
  assert.equal(gateFor({ entry: "    files: [lib/secure/a.mjs]\n    security: true\n", body: irreversible, config })?.kind, "security_path");
  assert.equal(gateFor({ entry: `${plainFiles}    security: true\n`, body: irreversible, config })?.kind, "security_mark");
  assert.deepEqual(gateFor({ entry: plainFiles, body: irreversible, config }), { kind: "irreversible", reason: "carries an irreversible step" });
});
