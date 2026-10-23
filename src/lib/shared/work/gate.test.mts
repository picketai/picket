import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { ownGate as gateOf } from "./gate.mts";
import { phasePaths as phasePathsOf, type PhaseEntry } from "./artifact.mts";
import { phaseOf, readSnapshot } from "./snapshot.mts";
import type { WorkId } from "./files.mts";
import { securityPaths } from "../config.mjs";
import { openItem, withProject, writeConfig } from "#test/project.mts";

type Design = { entry: string; body?: string; config?: object };

function designItem(t: TestContext, { entry, body = "t\n", config }: Design): { id: WorkId; root: string } {
  const root = withProject(t, { host: true, picket: false });
  if (config) writeConfig(root, config);
  const s = openItem(root, { lane: "design", title: "Gate" });
  writeFileSync(join(root, "work", s.id, "design.md"), `---\nlane: design\nphases:\n  - n: 1\n${entry}---\n# D\n\n## Phase 1: One\n\n${body}`);
  return { id: s.id, root };
}

function phaseOne(id: WorkId, root: string) {
  return phaseOf(readSnapshot(root, id), 1);
}

function phasePaths(id: WorkId, root: string): string[] {
  const found = phaseOne(id, root);
  return found ? phasePathsOf(found) : [];
}

function gateFor(t: TestContext, design: Design) {
  const { id, root } = designItem(t, design);
  return gateOf(phaseOne(id, root), securityPaths(root));
}

test("phasePaths answers the union of frontmatter files and touch set paths, once each", (t) => {
  const { id, root } = designItem(t, {
    entry: "    files: [lib/a.mjs, lib/b.mjs]\n",
    body: "**Touch set:**\n- `lib/b.mjs`: why\n- `lib/dir/`: why\n\n**Changes:** `lib/ignored.mjs`\n\n## Phase 2: Two\n\n**Touch set:**\n- `lib/two.mjs`: why\n",
  });
  assert.deepEqual(phasePaths(id, root), ["lib/a.mjs", "lib/b.mjs", "lib/dir/"]);
});

const plainFiles = "    files: [lib/plain.mjs]\n";

test("a security mark is read fail closed: any value but false marks the phase", (t) => {
  for (const value of ["security: true", "security: yes", 'security: "auth"']) {
    assert.equal(gateFor(t, { entry: `${plainFiles}    ${value}\n` })?.kind, "security_mark", value);
  }
  assert.deepEqual(gateFor(t, { entry: `${plainFiles}    security: true\n` }), {
    kind: "security_mark",
    reason: "is marked security-sensitive in the record",
  });
});

test("security: false and an absent key leave a phase with no other input ungated", (t) => {
  assert.equal(gateFor(t, { entry: `${plainFiles}    security: false\n` }), null);
  assert.equal(gateFor(t, { entry: plainFiles }), null);
});

test("a configured security path in the touch set gates the phase even when files does not list it", (t) => {
  const gate = gateFor(t, {
    entry: "    files: [lib/other.mjs]\n",
    body: "**Touch set:**\n- `lib/other.mjs`: why\n- `lib/secure/key.mjs`: why\n\n**Changes:** `lib/secure/ignored.mjs`\n",
    config: { security_paths: ["lib/secure/"] },
  });
  assert.equal(gate?.kind, "security_path");
  assert.match(gate?.reason ?? "", /lib\/secure\/key\.mjs/);
});

test("a configured security path in frontmatter files gates the phase", (t) => {
  const gate = gateFor(t, { entry: "    files: [lib\\secure\\key.mjs]\n", config: { security_paths: ["lib/secure/**"] } });
  assert.equal(gate?.kind, "security_path");
});

test("an [IRREVERSIBLE] marker counts in prose and not inside inline code or a fenced block (T-1.4)", (t) => {
  const plain = "- **T-1.1** drop the legacy column [IRREVERSIBLE]\n";
  assert.equal(gateFor(t, { entry: plainFiles, body: plain })?.kind, "irreversible");
  const inline = "**Touch set:**\n- `src/skills/designing/steps/15-migration.md`: the contract step marked `[IRREVERSIBLE]`\n\n- **T-1.1** the step file names `[IRREVERSIBLE]`\n";
  assert.equal(gateFor(t, { entry: plainFiles, body: inline }), null);
  const fenced = "Example:\n\n```\n## Phase 3: Drop the column [IRREVERSIBLE]\n```\n\n~~~md\n[IRREVERSIBLE]\n~~~\n";
  assert.equal(gateFor(t, { entry: plainFiles, body: fenced }), null);
  assert.equal(gateFor(t, { entry: plainFiles, body: `${inline}\nThe real step: [IRREVERSIBLE]\n` })?.kind, "irreversible", "a plain marker beside a quoted one still gates");
  const { id, root } = designItem(t, { entry: plainFiles, body: inline });
  assert.ok(phasePaths(id, root).includes("src/skills/designing/steps/15-migration.md"), "touch-set paths in backticks still read");
  const unclosed = "- **T-1.1** a stray ` backtick here\n- **T-1.2** drop the column [IRREVERSIBLE]\n- **T-1.3** a later `code` span\n";
  assert.equal(gateFor(t, { entry: plainFiles, body: unclosed })?.kind, "irreversible", "an unclosed backtick never hides a marker on a later line");
  const sameLine = "- **T-1.1** a stray ` backtick, then drop the column [IRREVERSIBLE] and a `code` span\n";
  assert.equal(gateFor(t, { entry: plainFiles, body: sameLine })?.kind, "irreversible", "a stray backtick on the marker's line hides nothing");
  assert.equal(gateFor(t, { entry: plainFiles, body: "- **T-1.1** the step names `[IRREVERSIBLE]` and `15-migration.md`\n" }), null, "spans that open and close on the line still hide a quoted marker");
});

test("a default folder-name entry gates a touch-set path at any depth", (t) => {
  const gate = gateFor(t, { entry: plainFiles, body: "**Touch set:**\n- `src/Api/Authentication/Handler.cs`: why\n" });
  assert.deepEqual(gate, { kind: "security_path", reason: "touches a security path (src/Api/Authentication/Handler.cs)" });
});

test("a configured entry with a leading ./ and a trailing /* gates the files under it", (t) => {
  const gate = gateFor(t, { entry: "    files: [src/crypto/aes.ts]\n", config: { security_paths: ["./src/crypto/*"] } });
  assert.equal(gate?.kind, "security_path");
});

test("a configured entry gates only its own folder, not a sibling sharing its prefix", (t) => {
  assert.equal(gateFor(t, { entry: "    files: [src/payment-ui/button.tsx]\n", config: { security_paths: ["src/pay"] } }), null);
});

const SECURITY_PATHS = ["src/auth/"];

type PhaseParts = { files?: string[]; security?: unknown; touchSet?: string[]; irreversible?: boolean };

function phaseObject({ files, security, touchSet = [], irreversible = false }: PhaseParts = {}) {
  const entry: PhaseEntry = { n: 1, ...(files ? { files } : {}), ...(security === undefined ? {} : { security }) };
  return { entry, touchSet, irreversible };
}

test("ownGate on a phase object names the first entry file under a security path", () => {
  assert.deepEqual(gateOf(phaseObject({ files: ["lib/a.ts", "src/auth/key.ts"] }), SECURITY_PATHS), { kind: "security_path", reason: "touches a security path (src/auth/key.ts)" });
});

test("ownGate on a phase object gates a touch-set path and a backslashed path under a security path", () => {
  assert.equal(gateOf(phaseObject({ files: ["lib/a.ts"], touchSet: ["src/auth/token.ts"] }), SECURITY_PATHS)?.kind, "security_path");
  assert.deepEqual(gateOf(phaseObject({ files: ["src\\auth\\key.ts"] }), SECURITY_PATHS), { kind: "security_path", reason: "touches a security path (src\\auth\\key.ts)" });
});

test("ownGate on a phase object reads a mark fail closed and lets false or no mark through", () => {
  assert.deepEqual(gateOf(phaseObject({ files: ["lib/a.ts"], security: true }), SECURITY_PATHS), { kind: "security_mark", reason: "is marked security-sensitive in the record" });
  assert.equal(gateOf(phaseObject({ files: ["lib/a.ts"], security: "yes" }), SECURITY_PATHS)?.kind, "security_mark");
  assert.equal(gateOf(phaseObject({ files: ["lib/a.ts"], security: false }), SECURITY_PATHS), null);
  assert.equal(gateOf(phaseObject({ files: ["lib/a.ts"] }), SECURITY_PATHS), null);
});

test("ownGate on a phase object gates an irreversible step and answers null for no phase", () => {
  assert.deepEqual(gateOf(phaseObject({ files: ["lib/a.ts"], irreversible: true }), SECURITY_PATHS), { kind: "irreversible", reason: "carries an irreversible step" });
  assert.equal(gateOf(undefined, SECURITY_PATHS), null);
});

test("a security path wins over a mark, and a mark wins over an irreversible step", (t) => {
  const config = { security_paths: ["lib/secure/"] };
  const irreversible = "- **T-1.1** drop the table [IRREVERSIBLE]\n";
  assert.equal(gateFor(t, { entry: "    files: [lib/secure/a.mjs]\n    security: true\n", body: irreversible, config })?.kind, "security_path");
  assert.equal(gateFor(t, { entry: `${plainFiles}    security: true\n`, body: irreversible, config })?.kind, "security_mark");
  assert.deepEqual(gateFor(t, { entry: plainFiles, body: irreversible, config }), { kind: "irreversible", reason: "carries an irreversible step" });
});
