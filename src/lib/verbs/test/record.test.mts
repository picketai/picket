import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs, UsageError } from "../../util/args.mts";
import { deriveVerdict } from "../../shared/testing/derive.mts";
import { testFacts } from "../../shared/testing/facts.mts";
import { testReportPath } from "../../shared/testing/facts.mts";
import { caseLine } from "../../shared/testing/cases.mts";
import { renderReport } from "../../shared/testing/report.mts";
import { appendTestRow, readTestRows, type CaseRow, type TestEntry } from "../../shared/testing/results.mts";
import { readSnapshot } from "../../shared/work/snapshot.mts";
import { readState, writeState } from "../../shared/work/state.mts";
import type { WorkId } from "../../shared/work/files.mts";
import { fixedContext } from "#test/context.mts";
import { openItem, withProject, writeArtifact } from "#test/project.mts";
import { verb as ask } from "./ask.mts";
import { verb as classify } from "./classify.mts";
import { verb as escape } from "./escape.mts";
import { verb as note } from "./note.mts";
import { verb as report } from "./report.mts";
import { writeFileSync } from "node:fs";
import { writeDefect, type DefectEntry } from "../../shared/scenarios/defects.mts";

const DESIGN = [
  "---",
  "lane: design",
  "phases:",
  "  - n: 1",
  "    files: [services/orders/routes.mjs]",
  "    drive:",
  "      - covers: T-1.1",
  "        method: POST",
  "        path: /orders",
  "        status: 201",
  "---",
  "# Design: Orders",
  "",
  "## Phase 1: Orders",
  "",
  "- **T-1.1** placing an order answers 201",
  "",
].join("\n");

const NO_HTTP = DESIGN.replace(/    drive:\n(.*\n){4}/, "    drive: true\n");

function item(t: TestContext, design = DESIGN): { root: string; id: WorkId } {
  const root = withProject(t);
  const { id } = openItem(root, { lane: "design", title: "Orders" });
  writeArtifact(root, id, "design.md", design);
  return { root, id };
}

function caseEntry(id: string, outcome: "passed" | "failed"): TestEntry {
  return { round: 1, type: "case", case: id, criterion: "T-1.1", kind: "boundary", intent: "an empty basket", steps: "request POST {orders}/orders", outcome, attempts: outcome === "failed" ? 2 : 1, unstable: false, detail: outcome === "failed" ? "expected 201, got 500" : "", mocks: [] };
}

function failedCase(id: string): Omit<CaseRow, "ts"> {
  return { round: 1, type: "case", case: id, criterion: "T-1.1", kind: "boundary", intent: "an empty basket", steps: "request POST {orders}/orders", outcome: "failed", attempts: 2, unstable: false, detail: "expected 201, got 500", mocks: [] };
}

function seed(root: string, id: WorkId, entries: TestEntry[]): void {
  for (const entry of entries) appendTestRow(root, id, entry, new Date("2026-11-17T09:00:00.000Z"));
}

async function refusal(promise: Promise<{ status: string; message?: string }>): Promise<string> {
  const outcome = await promise;
  assert.equal(outcome.status, "refused");
  return outcome.message ?? "";
}

test("classify appends a class row for a failed case of the round (T-2.3)", async (t) => {
  const { root, id } = item(t);
  seed(root, id, [caseEntry("C-01", "failed")]);
  const outcome = await classify.run({ id, case: "C-01", class: "product", evidence: "the service answered 500" }, fixedContext(root));
  assert.equal(outcome.status, "done");
  assert.deepEqual(readTestRows(root, id).at(-1), { ts: "2026-10-23T10:00:00.000Z", round: 1, type: "class", case: "C-01", class: "product", evidence: "the service answered 500" });
});

test("classify refuses a case absent from the round and a case that passed (T-2.3)", async (t) => {
  const { root, id } = item(t);
  seed(root, id, [caseEntry("C-01", "passed")]);
  assert.equal(await refusal(classify.run({ id, case: "C-09", class: "product", evidence: "x" }, fixedContext(root))), "no case C-09 in round 1");
  assert.equal(await refusal(classify.run({ id, case: "C-01", class: "test", evidence: "x" }, fixedContext(root))), "C-01 passed; only a failed case takes a class");
  assert.equal(readTestRows(root, id).length, 1);
});

function classRow(caseId: string, cls: "product" | "test"): TestEntry {
  return { round: 1, type: "class", case: caseId, class: cls, evidence: "the service answered 500" };
}

test("escape appends an escape row in the current round for a product case (T-3.1)", async (t) => {
  const { root, id } = item(t);
  seed(root, id, [failedCase("C-03"), classRow("C-03", "product")]);
  const outcome = await escape.run({ id, case: "C-03", root_cause: "the total skipped the discount", escaped: "unit test" }, fixedContext(root));
  assert.ok(outcome.status === "done");
  assert.deepEqual(readTestRows(root, id).at(-1), { ts: "2026-10-23T10:00:00.000Z", round: 1, type: "escape", case: "C-03", root_cause: "the total skipped the discount", escaped: "unit test" });
  assert.equal(escape.render(outcome.value), "C-03 escaped unit test: the total skipped the discount");
});

test("escape refuses a case classed test and a case no round holds (T-3.1)", async (t) => {
  const { root, id } = item(t);
  seed(root, id, [failedCase("C-02"), classRow("C-02", "test")]);
  assert.equal(await refusal(escape.run({ id, case: "C-02", root_cause: "x", escaped: "unit test" }, fixedContext(root))), "C-02 is not classed product; only a product failure takes an escape point");
  assert.equal(await refusal(escape.run({ id, case: "C-09", root_cause: "x", escaped: "unit test" }, fixedContext(root))), "no case C-09 in any round");
  assert.equal(readTestRows(root, id).length, 2);
});

function knownDefect(id: string, status: DefectEntry["status"]): DefectEntry {
  return { id, status, opened: "2026-11-01", found_in: "20261101-a", scenario: "S-0001", expected: "x", actual: "y", evidence: "z" };
}

function fixingItem(t: TestContext): { root: string; id: WorkId } {
  const { root, id } = item(t, NO_HTTP.replace("lane: design", "lane: order"));
  writeFileSync(join(root, "work", id, "request.md"), "fixes DF-0001 and DF-0003\n");
  for (const entry of [knownDefect("DF-0001", "open"), knownDefect("DF-0002", "open"), knownDefect("DF-0003", "fixed")]) writeDefect(root, entry);
  return { root, id };
}

test("escape of a known defect the request names appends a row with the defect id, on an item with no HTTP check (T-2.1)", async (t) => {
  const { root, id } = fixingItem(t);
  const outcome = await escape.run({ id, case: "DF-0001", root_cause: "the total skipped the discount", escaped: "unit test" }, fixedContext(root));
  assert.ok(outcome.status === "done");
  assert.deepEqual(readTestRows(root, id), [{ ts: "2026-10-23T10:00:00.000Z", round: 1, type: "escape", case: "DF-0001", root_cause: "the total skipped the discount", escaped: "unit test" }]);
});

test("escape refuses a defect with no entry, an open one the item does not name and a fixed one (T-2.1)", async (t) => {
  const { root, id } = fixingItem(t);
  const run = (caseId: string) => refusal(escape.run({ id, case: caseId, root_cause: "x", escaped: "unit test" }, fixedContext(root)));
  assert.equal(await run("DF-0009"), "DF-0009 is no open known defect");
  assert.equal(await run("DF-0002"), `${id} does not name DF-0002; only a known defect the item fixes on purpose takes an escape point`);
  assert.equal(await run("DF-0003"), "DF-0003 is no open known defect");
  writeState(root, { ...readState(root, id), status: "done" }, new Date("2026-11-17T09:00:00.000Z"));
  assert.equal(await run("DF-0001"), `${id} is done; only an open or blocked item is tested`);
  assert.deepEqual(readTestRows(root, id), []);
});

test("escape's parse takes a review row id and not checkable earlier and refuses a point outside the list (T-3.1)", () => {
  const parse = (point: string) => escape.parse(parseArgs(["x-12", "C-03", "--root-cause", "the total skipped the discount", "--escaped", point]));
  assert.deepEqual(parse("Ts4"), { id: "x-12", case: "C-03", root_cause: "the total skipped the discount", escaped: "Ts4" });
  assert.equal(parse("none: not checkable earlier").escaped, "none: not checkable earlier");
  assert.throws(() => parse("code review"), (error) => error instanceof UsageError && error.message === "--escaped must be unit test, declared check, a review row id such as Ts4, or none: not checkable earlier");
  assert.throws(() => escape.parse(parseArgs([])), (error) => error instanceof UsageError && error.message === escape.usage);
  assert.equal(escape.usage, 'test escape <id> <case> --root-cause "<text>" --escaped "<point>"');
});

test("classify refuses product for a failed case that met a gap and records environment (T-3.3)", async (t) => {
  const { root, id } = item(t);
  seed(root, id, [{ ...failedCase("C-01"), mocks: ["payments-mock"], gaps: ["payments-mock has no answer for POST /refunds"] }]);
  assert.equal(
    await refusal(classify.run({ id, case: "C-01", class: "product", evidence: "the refund failed" }, fixedContext(root))),
    "C-01 met a gap in a mock (payments-mock has no answer for POST /refunds); a gap is never a product defect: class it environment, or add the answer to the definition",
  );
  const outcome = await classify.run({ id, case: "C-01", class: "environment", evidence: "the mock has no refund answer" }, fixedContext(root));
  assert.equal(outcome.status, "done");
  assert.deepEqual(readTestRows(root, id).at(-1), { ts: "2026-10-23T10:00:00.000Z", round: 1, type: "class", case: "C-01", class: "environment", evidence: "the mock has no refund answer" });
});

test("a case row written without gaps reads as one with no gaps: same case line, report and verdict (T-3.4)", async (t) => {
  const outputs = [];
  for (const entry of [failedCase("C-01"), { ...failedCase("C-01"), gaps: [] }]) {
    const { root, id } = item(t);
    seed(root, id, [entry]);
    const outcome = await report.run({ id }, fixedContext(root));
    assert.ok(outcome.status === "done");
    const [row] = readTestRows(root, id);
    assert.ok(row.type === "case");
    outputs.push({ line: caseLine(id, row), derived: outcome.value.derived, report: readFileSync(testReportPath(root, id), "utf8") });
  }
  assert.deepEqual(outputs[0], outputs[1]);
  assert.ok(!outputs[0].report.includes("## Gaps"));
});

test("note records a not covered cell and an untestable criterion (T-2.4)", async (t) => {
  const { root, id } = item(t);
  const cellInput = note.parse(parseArgs([id, "T-1.1", "state", "not-covered", "--why", "the cap is reached"]));
  assert.equal((await note.run(cellInput, fixedContext(root))).status, "done");
  const untestableInput = note.parse(parseArgs([id, "T-1.1", "untestable", "--why", "fast is not a number"]));
  assert.equal((await note.run(untestableInput, fixedContext(root))).status, "done");
  const [cell, untestable] = readTestRows(root, id);
  assert.deepEqual(cell, { ts: "2026-10-23T10:00:00.000Z", round: 1, type: "cell", criterion: "T-1.1", kind: "state", outcome: "not covered", why: "the cap is reached" });
  assert.deepEqual(untestable, { ts: "2026-10-23T10:00:00.000Z", round: 1, type: "untestable", criterion: "T-1.1", why: "fast is not a number" });
});

test("note refuses a criterion outside the tested list, naming the list (T-2.4)", async (t) => {
  const { root, id } = item(t);
  const input = note.parse(parseArgs([id, "T-9.9", "normal", "blocked", "--why", "x"]));
  assert.equal(await refusal(note.run(input, fixedContext(root))), "T-9.9 is not a tested criterion; the tested criteria are T-1.1");
});

test("note's parse refuses an unknown kind and an unknown outcome", () => {
  for (const argv of [["x-12", "T-1.1", "smoke", "blocked", "--why", "x"], ["x-12", "T-1.1", "normal", "skipped", "--why", "x"], ["x-12", "T-1.1", "normal", "--why", "x"]]) {
    assert.throws(() => note.parse(parseArgs(argv)), UsageError, argv.join(" "));
  }
});

test("note's usage names the three cell outcomes and untestable", () => {
  assert.equal(note.usage, "test note <id> <criterion> <kind> <blocked|not-run|not-covered> --why \"<text>\", or test note <id> <criterion> untestable --why \"<text>\"");
});

test("classify's usage shows the evidence in double quotes", () => {
  assert.equal(classify.usage, 'test classify <id> <case> <product|test|environment> --evidence "<text>"');
});

test("classify's parse refuses evidence the shell split into words and keeps quoted evidence whole", () => {
  assert.throws(() => classify.parse(parseArgs(["x-12", "C-01", "product", "--evidence", "POST", "/orders", "answered", "500"])), (error) => error instanceof UsageError && error.message === classify.usage);
  assert.deepEqual(classify.parse(parseArgs(["x-12", "C-01", "product", "--evidence", "POST /orders answered 500"])), { id: "x-12", case: "C-01", class: "product", evidence: "POST /orders answered 500" });
});

test("note's parse maps each hyphenated outcome word to its cell outcome", () => {
  const outcomeOf = (word: string) => {
    const { mark } = note.parse(parseArgs(["x-12", "T-1.1", "normal", word, "--why", "x"]));
    return mark === "untestable" ? mark : mark.outcome;
  };
  assert.deepEqual(["blocked", "not-run", "not-covered"].map(outcomeOf), ["blocked", "not run", "not covered"]);
});

test("ask appends a question row (T-2.5)", async (t) => {
  const { root, id } = item(t);
  const input = ask.parse(parseArgs([id, "T-1.1", "--question", "Is an empty basket an error?", "--choices", "yes | no", "--default", "no", "--basis", "the request says nothing"]));
  assert.equal((await ask.run(input, fixedContext(root))).status, "done");
  assert.deepEqual(readTestRows(root, id), [{ ts: "2026-10-23T10:00:00.000Z", round: 1, type: "question", criterion: "T-1.1", question: "Is an empty basket an error?", choices: ["yes", "no"], default: "no", basis: "the request says nothing" }]);
});

test("ask refuses a fourth question of the item (T-2.5)", async (t) => {
  const { root, id } = item(t);
  const input = ask.parse(parseArgs([id, "T-1.1", "--question", "q", "--choices", "a | b"]));
  for (let asked = 0; asked < 3; asked++) assert.equal((await ask.run(input, fixedContext(root))).status, "done");
  assert.equal(await refusal(ask.run(input, fixedContext(root))), "at most 3 questions per item (draft section 4.5)");
});

test("ask's parse refuses a question or a basis the shell split into words", () => {
  const refusedWithUsage = (error: unknown) => error instanceof UsageError && error.message === ask.usage;
  assert.throws(() => ask.parse(parseArgs(["x-12", "T-1.1", "--question", "Is", "an", "empty", "basket", "an", "error?", "--choices", "yes | no"])), refusedWithUsage);
  assert.throws(() => ask.parse(parseArgs(["x-12", "T-1.1", "--question", "q", "--choices", "yes | no", "--default", "no", "--basis", "the", "request", "says", "nothing"])), refusedWithUsage);
});

test("ask's usage shows the question, the default and the basis in double quotes", () => {
  assert.equal(ask.usage, 'test ask <id> <criterion> --question "<text>" --choices "<a> | <b>" [--default "<choice>" --basis "<text>"]');
});

test("ask's parse refuses a default outside the choices, a default without a basis, and one choice, each with its own text (T-2.5)", () => {
  const parse = (...extra: string[]) => () => ask.parse(parseArgs(["x-12", "T-1.1", "--question", "q", ...extra]));
  assert.throws(parse("--choices", "a | b", "--default", "c", "--basis", "why"), { message: 'the default "c" is not one of the choices: a | b' });
  assert.throws(parse("--choices", "a | b", "--default", "a"), { message: 'the default "a" needs --basis: why it is the default' });
  assert.throws(parse("--choices", "a"), { message: "a question takes 2 to 4 choices separated by |, got 1" });
  assert.throws(parse("--choices", "a | b | c | d | e"), { message: "a question takes 2 to 4 choices separated by |, got 5" });
});

test("report writes test.md equal to renderReport of the same input and prints the route (T-2.6)", async (t) => {
  const { root, id } = item(t);
  seed(root, id, [caseEntry("C-01", "failed"), { round: 1, type: "class", case: "C-01", class: "product", evidence: "500" }]);
  const outcome = await report.run({ id }, fixedContext(root));
  assert.equal(outcome.status, "done");
  const snap = readSnapshot(root, id);
  const facts = testFacts(root, snap);
  const expected = renderReport({ id, round: facts.round, derived: deriveVerdict(facts), rows: facts.rows, criteria: facts.criteria });
  assert.equal(readFileSync(join(root, "work", id, "test.md"), "utf8"), expected);
  assert.ok(outcome.status === "done");
  assert.equal(report.render(outcome.value), "1 failed\nverdict: CHANGES REQUIRED · route fix");
});

test("report names the unclassified case and the classify command", async (t) => {
  const { root, id } = item(t);
  seed(root, id, [caseEntry("C-01", "failed")]);
  const outcome = await report.run({ id }, fixedContext(root));
  assert.ok(outcome.status === "done");
  assert.equal(report.render(outcome.value), `1 failed\nunclassified: C-01; run picket test classify ${id} C-01 <product|test|environment> --evidence "<why>"`);
});

test("report of a round with no rows prints no cases recorded first", async (t) => {
  const { root, id } = item(t);
  const outcome = await report.run({ id }, fixedContext(root));
  assert.ok(outcome.status === "done");
  assert.equal(report.render(outcome.value).split("\n")[0], "no cases recorded");
});

test("every recording verb refuses a done item and an item with no HTTP check", async (t) => {
  const done = item(t);
  writeState(done.root, { ...readState(done.root, done.id), status: "done" }, new Date("2026-11-17T09:00:00.000Z"));
  assert.equal(await refusal(report.run({ id: done.id }, fixedContext(done.root))), `${done.id} is done; only an open or blocked item is tested`);
  const plain = item(t, NO_HTTP);
  const message = `${plain.id} declares no HTTP check, so it has no tested criteria`;
  assert.equal(await refusal(report.run({ id: plain.id }, fixedContext(plain.root))), message);
  assert.equal(await refusal(classify.run({ id: plain.id, case: "C-01", class: "product", evidence: "x" }, fixedContext(plain.root))), message);
  assert.equal(await refusal(note.run({ id: plain.id, criterion: "T-1.1", mark: "untestable", why: "x" }, fixedContext(plain.root))), message);
  assert.equal(await refusal(ask.run({ id: plain.id, criterion: "T-1.1", question: "q", choices: ["a", "b"], default: null, basis: null }, fixedContext(plain.root))), message);
});
