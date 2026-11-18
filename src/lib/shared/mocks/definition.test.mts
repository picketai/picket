import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { EnvModel, EnvService } from "../env/model.mts";
import { listMocks, mockFindings, parseMock } from "./definition.mts";

const HEADER = "---\nreplaces: payments\nsource: recorded\nrecorded: 2026-11-18\nformat: 1\n---\n";
const ANSWER = "when GET /payments/*\n  status 200\n";

function problemsOf(text: string): string[] {
  return parseMock(text, "payments-mock").problems;
}

test("a definition reads its header and its answers in file order (T-1.1)", () => {
  const body = 'when POST /payments\n  status 201\n  header Content-Type: application/json\n  body {"id":"pay-1"}\n\nwhen GET /payments/*\n  status 200\n';
  const { definition, problems } = parseMock(`${HEADER}${body}`, "payments-mock");
  assert.deepEqual(problems, []);
  assert.deepEqual(definition, {
    service: "payments-mock",
    replaces: "payments",
    source: "recorded",
    recorded: "2026-11-18",
    api: null,
    format: 1,
    answers: [
      { line: 1, method: "POST", path: "/payments", status: 201, headers: [["Content-Type", "application/json"]], body: '{"id":"pay-1"}' },
      { line: 2, method: "GET", path: "/payments/*", status: 200, headers: [], body: null },
    ],
  });
});

test("a definition written from an API description keeps its api path", () => {
  const { definition, problems } = parseMock(`---\nreplaces: payments\nsource: api\napi: docs/payments.yaml\nformat: 1\n---\n${ANSWER}`, "payments-mock");
  assert.deepEqual(problems, []);
  assert.equal(definition?.source, "api");
  assert.equal(definition?.api, "docs/payments.yaml");
  assert.equal(definition?.recorded, null);
});

const HEADER_CASES: [string, string, string][] = [
  ["an unknown header key", HEADER.replace("format: 1", "format: 1\nmode: strict"), 'header: unknown key "mode"'],
  ["another format", HEADER.replace("format: 1", "format: 2"), "header: format must be 1; record the definition again in format 1"],
  ["source recorded without recorded", HEADER.replace("recorded: 2026-11-18\n", ""), "header: source recorded needs recorded: YYYY-MM-DD, the day the answers were recorded"],
  ["source api without api", HEADER.replace("source: recorded\nrecorded: 2026-11-18", "source: api"), "header: source api needs api: <path>, the API description the answers were written from"],
];

for (const [name, header, problem] of HEADER_CASES) {
  test(`${name} is one named problem and no definition (T-1.2)`, () => {
    const read = parseMock(`${header}${ANSWER}`, "payments-mock");
    assert.deepEqual(read, { definition: null, problems: [problem] });
  });
}

const ANSWER_CASES: [string, string, string][] = [
  ["an answer with no status", "when GET /payments\n  body {}\n", "when 1: an answer takes one status"],
  ["a second body", "when GET /payments\n  status 200\n  body {}\n  body []\n", "when 1: an answer takes one body"],
  ["a path with ?", "when GET /payments?state=open\n  status 200\n", "when 1: a path holds no ? or #: the query string is never matched"],
  ["a path under /__picket/", "when GET /__picket/health\n  status 200\n", "when 1: paths under /__picket/ belong to Picket's stub"],
  ["* inside a segment", "when GET /a*\n  status 200\n", "when 1: * matches one whole segment, such as /orders/*"],
  ["an unknown word", `${ANSWER}reply 200\n`, 'when 2: unknown word "reply"'],
  ["a repeated method and path", `${ANSWER}${ANSWER}`, "when 2: GET /payments/* is already answered by when 1"],
];

for (const [name, body, problem] of ANSWER_CASES) {
  test(`${name} is one named problem and no definition (T-1.2)`, () => {
    const read = parseMock(`${HEADER}${body}`, "payments-mock");
    assert.deepEqual(read, { definition: null, problems: [problem] });
  });
}

test("the same path under another method is a second answer, not a repeat", () => {
  assert.deepEqual(problemsOf(`${HEADER}${ANSWER}when POST /payments/*\n  status 201\n`), []);
});

test("a definition without a header block or without answers names the gap", () => {
  assert.deepEqual(problemsOf(ANSWER), ["header: a definition starts with a --- header block"]);
  assert.deepEqual(problemsOf(HEADER), ["when 1: a definition holds no answers; start with when <METHOD> <path>"]);
});

function service(name: string, role: string): EnvService {
  return { name, role, build: null, image: null, healthcheck: null, ports: [], volumes: [], profiles: [], environment: {}, labels: {} };
}

const MODEL: EnvModel = { name: "shop", services: [service("payments-mock", "mock"), service("cache", "dependency")], picket: null };

function project(t: TestContext, files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "picket-mocks-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const [name, text] of Object.entries(files)) {
    mkdirSync(join(root, ".picket", "env", "mocks"), { recursive: true });
    writeFileSync(join(root, ".picket", "env", "mocks", name), text);
  }
  return root;
}

test("listMocks reads one entry per .md file in name order, the service taken from the file name", (t) => {
  const root = project(t, { "payments-mock.md": `${HEADER}${ANSWER}`, "fraud-mock.md": "when GET /\n", "notes.txt": "skip" });
  const mocks = listMocks(root);
  assert.deepEqual(
    mocks.map(({ service, path, problems }) => ({ service, path, problems })),
    [
      { service: "fraud-mock", path: ".picket/env/mocks/fraud-mock.md", problems: ["header: a definition starts with a --- header block"] },
      { service: "payments-mock", path: ".picket/env/mocks/payments-mock.md", problems: [] },
    ],
  );
  assert.equal(mocks[1].definition?.service, "payments-mock");
});

test("mockFindings reports a missing service, a service that is no mock and an api path that does not exist (T-1.3)", (t) => {
  const apiHeader = HEADER.replace("source: recorded\nrecorded: 2026-11-18", "source: api\napi: docs/payments.yaml");
  const root = project(t, { "fraud-mock.md": `${HEADER}${ANSWER}`, "cache.md": `${HEADER}${ANSWER}`, "payments-mock.md": `${apiHeader}${ANSWER}` });
  assert.deepEqual(mockFindings(root, MODEL, "E12"), [
    { rule: "E12", service: "cache", level: "error", message: ".picket/env/mocks/cache.md defines cache, whose role is dependency: a definition serves only a mock" },
    { rule: "E12", service: "fraud-mock", level: "error", message: ".picket/env/mocks/fraud-mock.md defines fraud-mock, which is no service of the environment" },
    { rule: "E12", service: "payments-mock", level: "error", message: "api docs/payments.yaml does not exist" },
  ]);
});

test("an api path that exists passes and one outside the project is refused", (t) => {
  const inside = HEADER.replace("source: recorded\nrecorded: 2026-11-18", "source: api\napi: docs/payments.yaml");
  const root = project(t, { "payments-mock.md": `${inside}${ANSWER}` });
  mkdirSync(join(root, "docs"));
  writeFileSync(join(root, "docs", "payments.yaml"), "openapi: 3.1.0\n");
  assert.deepEqual(mockFindings(root, MODEL, "E12"), []);
  writeFileSync(join(root, ".picket", "env", "mocks", "payments-mock.md"), `${inside.replace("docs/payments.yaml", "../payments.yaml")}${ANSWER}`);
  assert.deepEqual(
    mockFindings(root, MODEL, "E12").map((finding) => finding.message),
    ["api ../payments.yaml must be a path inside the project"],
  );
});

test("a project with no mocks folder has no definitions and no findings (T-1.3)", (t) => {
  const root = project(t, {});
  assert.deepEqual(listMocks(root), []);
  assert.deepEqual(mockFindings(root, MODEL, "E12"), []);
});
