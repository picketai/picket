import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const GRADED_ROUND = 1;
const PRODUCT = "product";
const SERVICE_PREFIX = /^\{[^}]+\}/;
const ROUND_LINE = /^Round \d+ · (APPROVED|CHANGES REQUIRED|DRIFT DETECTED)/m;

export async function loadKernelReaders(pluginDir) {
  const load = (name) => import(pathToFileURL(join(pluginDir, "lib", "shared", "testing", name)).href);
  const [results, cases] = await Promise.all([load("results.mjs"), load("cases.mjs")]);
  const { readTestRows, roundRows, latestCases, latestClass } = results;
  return { readTestRows, roundRows, latestCases, latestClass, caseCard: cases.caseCard };
}

function check(name, ok, detail = "") {
  return { name, ok: !!ok, detail };
}

function cardSteps(readers, item, row) {
  const read = readers.caseCard(item, { criterion: row.criterion, kind: row.kind, intent: row.intent }, row.steps);
  return "card" in read ? read.card.steps : [];
}

function expectedStatusAfter(steps, at) {
  for (const step of steps.slice(at + 1)) {
    if (step.word === "request") return null;
    if (step.word === "expect" && step.what === "status") return step.status;
  }
  return null;
}

function showsDefect(steps, defect) {
  const path = new RegExp(defect.path);
  return steps.some((step, at) => step.word === "request" && step.method === defect.method && path.test(step.target.replace(SERVICE_PREFIX, "")) && expectedStatusAfter(steps, at) === defect.status);
}

function roundOne(readers, repo, item) {
  const rows = readers.roundRows(readers.readTestRows(repo, item), GRADED_ROUND);
  const products = readers.latestCases(rows).filter((row) => row.outcome === "failed" && readers.latestClass(rows, row.case)?.class === PRODUCT);
  const questions = rows.filter((row) => row.type === "question");
  return { products, questions };
}

function reportVerdict(reportPath) {
  if (!existsSync(reportPath)) return null;
  return readFileSync(reportPath, "utf8").match(ROUND_LINE)?.[1] ?? null;
}

function defectGrade(readers, item, key, { products }) {
  const matching = products.filter((row) => showsDefect(cardSteps(readers, item, row), key.defect));
  const falseAlarms = products.length - matching.length;
  return {
    checks: [check("defect_found", matching.length > 0, matching.map((row) => row.case).join(", ")), check("no_false_alarm", falseAlarms === 0, `${falseAlarms} unmatched product failure(s)`)],
    found: matching.length > 0,
    false_alarms: falseAlarms,
    questions_right: null,
  };
}

function trapGrade({ products, questions }) {
  return {
    checks: [check("no_product_failure", products.length === 0, products.map((row) => row.case).join(", ")), check("no_question", questions.length === 0, questions.map((row) => row.criterion).join(", "))],
    found: null,
    false_alarms: products.length,
    questions_right: null,
  };
}

function silentGrade(key, { products, questions }) {
  const asked = questions.some((row) => row.criterion === key.question.criterion);
  return {
    checks: [check("question_asked", asked, questions.map((row) => row.criterion).join(", ")), check("no_product_failure", products.length === 0, products.map((row) => row.case).join(", "))],
    found: null,
    false_alarms: products.length,
    questions_right: asked,
  };
}

function keyGrade(readers, item, key, found) {
  if (key.kind === "defect") return defectGrade(readers, item, key, found);
  if (key.kind === "trap") return trapGrade(found);
  if (key.kind === "silent") return silentGrade(key, found);
  throw new Error(`unknown key kind ${key.kind}`);
}

export function gradeTester({ repo, task, key, readers }) {
  const itemDir = join(repo, "work", task.item);
  const reportPath = join(itemDir, "test.md");
  const graded = keyGrade(readers, task.item, key, roundOne(readers, repo, task.item));
  const checks = [check("report_exists", existsSync(reportPath), `work/${task.item}/test.md`), ...graded.checks];
  const { found, false_alarms, questions_right } = graded;
  return {
    pass: checks.every((c) => c.ok),
    checks,
    tester: { verdict: reportVerdict(reportPath), found, false_alarms, questions_right, signature: `found=${found} false_alarms=${false_alarms} questions_right=${questions_right}` },
  };
}
