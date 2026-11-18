import { agreement, mean, percentile, round, stderr } from "./metrics.mjs";

const SHARE_ERROR_FLOOR = 0.05;
const ALARM_ERROR_FLOOR = 0.05;

function keyKind(records) {
  const tester = records[0].grade.tester;
  if (tester.found !== null) return "defect";
  if (tester.questions_right !== null) return "silent";
  return "trap";
}

function share(flags) {
  return mean(flags.map((flag) => (flag ? 1 : 0)));
}

export function testerRow(task, records) {
  const graded = records.map((record) => record.grade.tester);
  const key_kind = keyKind(records);
  return {
    task,
    key_kind,
    n: records.length,
    found: key_kind === "defect" ? share(graded.map((t) => t.found)) : null,
    false_alarms: mean(graded.map((t) => t.false_alarms)),
    questions_right: key_kind === "silent" ? share(graded.map((t) => t.questions_right)) : null,
    consistent: agreement(graded.map((t) => t.signature)) === 1,
    cost_mean: mean(records.map((record) => record.cost_usd)),
    wall_p50: percentile(records.map((record) => record.wall_ms), 50) / 1000,
  };
}

function pooledShare(rows, field) {
  const counted = rows.filter((row) => row[field] !== null);
  const runs = counted.reduce((sum, row) => sum + row.n, 0);
  return runs ? counted.reduce((sum, row) => sum + row[field] * row.n, 0) / runs : NaN;
}

export function testerSuite(rows) {
  const runs = rows.reduce((sum, row) => sum + row.n, 0);
  return {
    catch_rate: pooledShare(rows, "found"),
    false_alarms: runs ? rows.reduce((sum, row) => sum + row.false_alarms * row.n, 0) / runs : NaN,
    questions_right: pooledShare(rows, "questions_right"),
    consistent: rows.filter((row) => row.consistent).length,
  };
}

function pairedSummary(pairs, field, floor) {
  const deltas = pairs.filter(([a, b]) => a[field] !== null && b[field] !== null).map(([a, b]) => b[field] - a[field]);
  return { n: deltas.length, mean: mean(deltas), se: stderr(deltas) || floor };
}

const percent = (x) => `${Math.round(x * 100)}%`;
const perRun = (x) => round(x, 2).toFixed(2);

function fellBy(summary, what, format) {
  if (!summary.n || -summary.mean <= 2 * summary.se) return [];
  return [`${what} fell by ${format(-summary.mean)} on average over ${summary.n} paired task(s) (limit ${format(2 * summary.se)})`];
}

function roseBy(summary, what, format) {
  if (!summary.n || summary.mean <= 2 * summary.se) return [];
  return [`${what} rose by ${format(summary.mean)} per run on average over ${summary.n} paired task(s) (limit ${format(2 * summary.se)})`];
}

export function testerCheck(rowsA, rowsB) {
  const pairs = rowsA.map((a) => [a, rowsB.find((b) => b.task === a.task)]).filter(([, b]) => b);
  const found = pairedSummary(pairs, "found", SHARE_ERROR_FLOOR);
  const false_alarms = pairedSummary(pairs, "false_alarms", ALARM_ERROR_FLOOR);
  const questions_right = pairedSummary(pairs, "questions_right", SHARE_ERROR_FLOOR);
  const fails = [...fellBy(found, "defects found", percent), ...roseBy(false_alarms, "false alarms", perRun), ...fellBy(questions_right, "questions asked rightly", percent)];
  return { fails, found, false_alarms, questions_right };
}
