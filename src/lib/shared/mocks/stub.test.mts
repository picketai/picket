import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Refused } from "../action.mts";
import type { EnvModel, EnvService } from "../env/model.mts";
import { listMocks } from "./definition.mts";
import { environmentStubs, prepareStubs, STUB_PORT, stubbedMocks, stubProgram, withStubPorts } from "./stub.mts";

const HEADER = "---\nreplaces: payments\nsource: recorded\nrecorded: 2026-11-18\nformat: 1\n---\n";
const VALID = `${HEADER}when POST /charges\n  status 201\n  header Content-Type: application/json\n  body {"id":"ch_1"}\n`;
const BROKEN = `${HEADER}when GET /a*\n  status 200\n`;

function service(name: string, role: string): EnvService {
  return { name, role, build: null, image: null, healthcheck: null, ports: [], volumes: [], profiles: [], environment: {}, labels: {} };
}

const MODEL: EnvModel = { name: "shop", services: [service("payments-mock", "mock"), service("fraud-mock", "mock"), service("ledger-mock", "mock"), service("cache", "dependency")], picket: null };

function project(t: TestContext, files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "picket-stub-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, ".picket", "env", "mocks"), { recursive: true });
  for (const [name, text] of Object.entries(files)) writeFileSync(join(root, ".picket", "env", "mocks", name), text);
  return root;
}

test("only a mock service whose definition parsed without problems is stubbed", (t) => {
  const root = project(t, { "payments-mock.md": VALID, "fraud-mock.md": BROKEN, "cache.md": VALID });
  assert.deepEqual(stubbedMocks(MODEL, listMocks(root)), ["payments-mock"]);
});

test("prepareStubs copies the program, writes the compiled definition and returns the override fragment", (t) => {
  const root = project(t, { "payments-mock.md": VALID, "fraud-mock.md": BROKEN });
  const fragments = prepareStubs(root, "picket-proj-481", MODEL, listMocks(root));
  const folder = join(root, ".picket", "state", "env", "picket-proj-481", "stub");
  assert.deepEqual(Object.keys(fragments), ["payments-mock"]);
  assert.deepEqual(fragments["payments-mock"], {
    command: ["node", "/picket/stub-server.mjs", "/picket/mock.json"],
    volumes: [
      { type: "bind", source: join(folder, "stub-server.mjs"), target: "/picket/stub-server.mjs", read_only: true },
      { type: "bind", source: join(folder, "payments-mock.json"), target: "/picket/mock.json", read_only: true },
    ],
    healthcheck: { test: ["CMD", "node", "/picket/stub-server.mjs", "--health"], interval: "2s", timeout: "2s", retries: 15 },
    ports: [{ target: 8080 }],
  });
  assert.equal(readFileSync(join(folder, "stub-server.mjs"), "utf8"), readFileSync(stubProgram(), "utf8"));
  assert.deepEqual(JSON.parse(readFileSync(join(folder, "payments-mock.json"), "utf8")), {
    service: "payments-mock",
    answers: [{ method: "POST", path: "/charges", status: 201, headers: [["Content-Type", "application/json"]], body: '{"id":"ch_1"}' }],
  });
  assert.ok(!existsSync(join(folder, "fraud-mock.json")));
});

test("prepareStubs with no stubbed mock writes nothing, and a missing program refuses", (t) => {
  const empty = project(t, {});
  assert.deepEqual(prepareStubs(empty, "picket-a", MODEL, listMocks(empty), join(empty, "absent.mjs")), {});
  assert.ok(!existsSync(join(empty, ".picket", "state")));
  const root = project(t, { "payments-mock.md": VALID });
  assert.throws(() => prepareStubs(root, "picket-a", MODEL, listMocks(root), join(root, "absent.mjs")), (err) => err instanceof Refused && err.message === "the stub program is missing: rebuild Picket");
});

test("withStubPorts gives a stubbed service the stub port and leaves the others as they are", () => {
  const services = [service("payments-mock", "mock"), { ...service("ledger-mock", "mock"), ports: [{ target: 9000, published: null }] }];
  assert.deepEqual(withStubPorts(services, ["payments-mock"]), [{ ...services[0], ports: [{ target: STUB_PORT, published: null }] }, services[1]]);
});

test("environmentStubs lets a stubbed mock skip E3 and reports the other mocks and the E12 problems", (t) => {
  const root = project(t, { "payments-mock.md": VALID, "fraud-mock.md": BROKEN });
  const { stubbed, findings } = environmentStubs(root, MODEL);
  assert.deepEqual(stubbed, ["payments-mock"]);
  assert.deepEqual(
    findings.map((finding) => `${finding.rule} ${finding.service}`),
    ["E3 fraud-mock", "E3 ledger-mock", "E3 cache", "E8 null", "E12 fraud-mock"],
  );
});
