import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Refused } from "../action.mts";
import { findEngine, type Engine, type EngineRunner } from "./engine.mts";
import { readState, writeState } from "../work/state.mts";
import { openItem, withProject } from "#test/project.mts";
import { foreignClaim, purgeStack } from "./purge.mts";
import { readStacks, recordStack } from "./stacks.mts";

const STACK = "picket-proj-481";
const ITEM = "20261114-orders";
const NOW = new Date("2026-11-14T10:20:30.000Z");
const PURGED = join(".picket", "state", "env", "purged");

type Seen = { calls: string[][]; atDown: string[] | null };

function tempRoot(t: TestContext): string {
  const root = mkdtempSync(join(tmpdir(), "picket-purge-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

const LISTS: Record<string, string> = { ps: "c1\nc2\n", volume: "orders-data\n", network: "picket-proj-481_default\n", image: "sha256:img1\nsha256:img1\nsha256:img2\n" };

function engineFor(root: string): { engine: Engine; seen: Seen } {
  const seen: Seen = { calls: [], atDown: null };
  const runner: EngineRunner = (_program, args) => {
    if (args[0] === "info") return { status: 0, stdout: "{}", stderr: "" };
    seen.calls.push(args);
    if (args.includes("down")) {
      const folder = join(root, PURGED);
      seen.atDown = existsSync(folder) ? readdirSync(folder).map((name) => readFileSync(join(folder, name), "utf8")) : [];
    }
    const listed = args.includes("ls") || args[0] === "ps" ? LISTS[args[0]] : "";
    return { status: 0, stdout: listed ?? "", stderr: "" };
  };
  const engine = findEngine({}, root, runner, null);
  assert.ok(engine);
  seen.calls.length = 0;
  return { engine, seen };
}

function record(root: string): void {
  recordStack(root, STACK, { item: ITEM, session: null, files: ["/u/compose.yaml", "/u/compose.picket.yaml"], engine: { name: "docker", program: "docker", prefix: [] }, started: NOW.toISOString() });
}

test("purge lists first, takes the stack down with its volumes, removes exactly the listed images, never volume rm, and forgets the stack (T-8.1)", (t) => {
  const root = tempRoot(t);
  record(root);
  const { engine, seen } = engineFor(root);
  const purged = purgeStack(engine, root, STACK, ITEM, NOW);
  assert.deepEqual(purged.resources, { containers: ["c1", "c2"], volumes: ["orders-data"], networks: ["picket-proj-481_default"], images: ["sha256:img1", "sha256:img2"] });
  const kinds = seen.calls.map((args) => (args[0] === "compose" ? `compose ${args.at(-3)}` : `${args[0]} ${args[1]}`));
  assert.deepEqual(kinds, ["ps -a", "volume ls", "network ls", "image ls", "compose down", "image rm"]);
  const down = seen.calls[4];
  assert.deepEqual(down.slice(-3), ["down", "--volumes", "--remove-orphans"]);
  assert.deepEqual(down.slice(1, 3), ["-p", STACK]);
  assert.deepEqual(seen.calls[5], ["image", "rm", "--force", "sha256:img1", "sha256:img2"]);
  assert.ok(!seen.calls.some((args) => args[0] === "volume" && args[1] === "rm"));
  assert.deepEqual(readStacks(root), {});
  assert.equal(purged.evidence, ".picket/state/env/purged/picket-proj-481-2026-11-14T102030.000Z.json");
});

test("the evidence file exists with the stack, item and resources when down is called (T-8.6)", (t) => {
  const root = tempRoot(t);
  record(root);
  const { engine, seen } = engineFor(root);
  const purged = purgeStack(engine, root, STACK, ITEM, NOW);
  assert.equal(seen.atDown?.length, 1);
  assert.deepEqual(JSON.parse(seen.atDown?.[0] ?? "{}"), { stack: STACK, item: ITEM, at: NOW.toISOString(), resources: purged.resources });
});

test("a file in place of the evidence folder stops the purge before any removal call (T-8.6)", (t) => {
  const root = tempRoot(t);
  record(root);
  mkdirSync(join(root, ".picket", "state", "env"), { recursive: true });
  writeFileSync(join(root, PURGED), "not a folder");
  const { engine, seen } = engineFor(root);
  assert.throws(() => purgeStack(engine, root, STACK, ITEM, NOW), (err: Error) => err instanceof Refused && err.message.startsWith("purge stopped: cannot record .picket/state/env/purged/"));
  assert.ok(!seen.calls.some((args) => args.includes("down") || (args[0] === "image" && args[1] === "rm")));
  assert.deepEqual(Object.keys(readStacks(root)), [STACK]);
});

function labelEngine(root: string, item: string | null): Engine {
  const labels = item === null ? "" : JSON.stringify({ Labels: `com.docker.compose.project=${STACK},io.github.picketai.item=${item}` });
  const engine = findEngine({}, root, (_p, args) => ({ status: 0, stdout: args[0] === "info" ? "{}" : args.includes("json") ? labels : "", stderr: "" }), null);
  assert.ok(engine);
  return engine;
}

function itemAt(root: string, title: string, status: "open" | "done"): string {
  const { id } = openItem(root, { lane: "order", title });
  if (status === "done") writeState(root, { ...readState(root, id), status }, new Date());
  return id;
}

function recordFor(root: string, item: string): void {
  recordStack(root, STACK, { item, session: null, files: [], engine: { name: "docker", program: "docker", prefix: [] }, started: NOW.toISOString() });
}

test("foreignClaim takes the record's claim before the label's", (t) => {
  const root = withProject(t);
  const recorded = itemAt(root, "Recorded", "open");
  recordFor(root, recorded);
  assert.equal(foreignClaim(labelEngine(root, itemAt(root, "Labelled", "open")), root, STACK, null), `${STACK} belongs to ${recorded}, which is open; close it first`);
});

test("foreignClaim falls back to the label when the record names a closed item or none", (t) => {
  const root = withProject(t);
  const labelled = itemAt(root, "Labelled", "open");
  const text = `${STACK} belongs to ${labelled}, which is open; close it first`;
  assert.equal(foreignClaim(labelEngine(root, labelled), root, STACK, null), text);
  recordFor(root, itemAt(root, "Closed", "done"));
  assert.equal(foreignClaim(labelEngine(root, labelled), root, STACK, null), text);
});

test("foreignClaim is null for the owner's own stack, an unlabelled stack and a closed item's label", (t) => {
  const root = withProject(t);
  const owner = itemAt(root, "Owner", "open");
  recordFor(root, owner);
  assert.equal(foreignClaim(labelEngine(root, owner), root, STACK, owner), null);
  assert.equal(foreignClaim(labelEngine(root, null), root, STACK, owner), null);
  assert.equal(foreignClaim(labelEngine(root, itemAt(root, "Closed", "done")), root, STACK, owner), null);
});

test("nothing listed means no evidence, no removal call and nothing to remove", (t) => {
  const root = tempRoot(t);
  const seen: string[][] = [];
  const engine = findEngine({}, root, (_p, args) => (args[0] === "info" ? { status: 0, stdout: "{}", stderr: "" } : (seen.push(args), { status: 0, stdout: "", stderr: "" })), null);
  assert.ok(engine);
  seen.length = 0;
  assert.deepEqual(purgeStack(engine, root, "picket-zzzz", null, NOW), { resources: { containers: [], volumes: [], networks: [], images: [] }, evidence: null });
  assert.deepEqual(seen.map((args) => args[0]), ["ps", "volume", "network"]);
  assert.equal(existsSync(join(root, PURGED)), false);
});
