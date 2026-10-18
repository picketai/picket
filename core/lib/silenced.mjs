import { COMMENT_SUPPRESSION_MARKERS, LANGS, MARKUP, STATEMENT_SUPPRESSION_MARKERS, commentOf, extOf, maskStrings } from "./comments.mjs";

const TEST_FILE_HINT = /(^|\/)(tests?|spec|specs|__tests__)(\/|$)|\.(test|spec|tests)\.[a-z]+$|_test\.\w+$|test_\w+\.py$/i;
const TEST_CLASS_FILE = /(Tests?|(^|[/._-])tests?)\.\w+$/;

export function isTestPath(rel) {
  return TEST_FILE_HINT.test(rel) || TEST_CLASS_FILE.test(rel);
}

const SCRIPT_LANG = LANGS[".js"];

function commentBodies(text, lang) {
  const langs = lang === MARKUP ? [lang, SCRIPT_LANG] : [lang];
  return langs.map((l) => commentOf(text, l)?.body).filter(Boolean);
}

function isSuppression(text, lang) {
  if (commentBodies(text, lang).some((body) => COMMENT_SUPPRESSION_MARKERS.some((re) => re.test(body)))) return true;
  const masked = maskStrings(text);
  return STATEMENT_SUPPRESSION_MARKERS.some((re) => re.test(masked));
}

const TEST_MOVES = [
  { kind: "focused-test", re: /\b(it|test|describe|context|suite)\.only\b|\b(fit|fdescribe)\s*\(/ },
  {
    kind: "skipped-test",
    re: /\b(it|test|describe|context|suite)\.(skip|todo)\b|\b(xit|xdescribe|xtest)\s*\(|\[Ignore\b|\[(Fact|Theory)\s*\([^\]]*\bSkip\s*=|@pytest\.mark\.(skip|skipif|xfail)\b|@unittest\.skip|@Disabled\b|\bt\.Skip(Now|f)?\(/,
  },
].map(({ kind, re }) => ({ kind, test: (masked) => re.test(masked) }));

const COVERAGE_KEY = /["']?\b(?<name>lines|statements|functions|branches)\b["']?\s*:\s*(?<value>\d+(?:\.\d+)?)/g;
const COVERAGE_FLAG = /--(?<name>lines|statements|functions|branches)[=\s]+(?<value>\d+(?:\.\d+)?)/g;
const PYTHON_CONFIG = /(^|\/)(pytest\.ini|setup\.cfg|pyproject\.toml|tox\.ini|\.coveragerc)$/i;

export const THRESHOLDS = [
  { tool: "vitest, jest, c8 or nyc config", file: /(^|\/)((vitest|vite|jest)\.config\.[cm]?[jt]s|package\.json|\.c8rc(\.json)?|\.nycrc(\.json)?)$/i, key: COVERAGE_KEY, stricter: "higher", bar: "coverage_min" },
  { tool: "c8 or nyc --check-coverage", file: /(^|\/)package\.json$/i, key: COVERAGE_FLAG, stricter: "higher", bar: "coverage_min" },
  { tool: "pytest --cov-fail-under", file: PYTHON_CONFIG, key: /--cov-fail-under[=\s]+(?<value>\d+(?:\.\d+)?)/g, stricter: "higher", bar: "coverage_min" },
  { tool: "coverage fail_under", file: PYTHON_CONFIG, key: /\bfail_under\s*=\s*(?<value>\d+(?:\.\d+)?)/g, stricter: "higher", bar: "coverage_min" },
  { tool: "coverlet Threshold", file: /\.(csproj|props|targets)$/i, key: /(?:<Threshold>\s*|\/p:Threshold=)(?<value>\d+(?:\.\d+)?)/g, stricter: "higher", bar: "coverage_min" },
  { tool: "eslint --max-warnings", file: /(^|\/)package\.json$/i, key: /--max-warnings[=\s]+(?<value>\d+)/g, stricter: "lower", bar: "max_warnings" },
];

export function hasThresholds(rel) {
  return THRESHOLDS.some((row) => row.file.test(rel));
}

export function scansPath(rel) {
  return Boolean(LANGS[extOf(rel)]) || hasThresholds(rel);
}

export function normaliseLine(line) {
  return String(line).replace(/\s+/g, " ").trim();
}

function linesOf(text) {
  return String(text).split(/\r?\n/).map(normaliseLine).filter(Boolean);
}

function difference(lines, minus) {
  const left = new Map();
  for (const line of minus) left.set(line, (left.get(line) ?? 0) + 1);
  return lines.filter((line) => {
    const count = left.get(line) ?? 0;
    if (count) left.set(line, count - 1);
    return !count;
  });
}

function codeMoves(rel, added) {
  const lang = LANGS[extOf(rel)];
  if (!lang) return [];
  const testMoves = lang !== MARKUP && isTestPath(rel) ? TEST_MOVES : [];
  return added.flatMap((text) => {
    const masked = maskStrings(text);
    const kinds = testMoves.filter((move) => move.test(masked)).map((move) => move.kind);
    if (isSuppression(text, lang)) kinds.push("suppression");
    return kinds.map((kind) => ({ kind, text }));
  });
}

function readings(rows, line) {
  return rows.flatMap((row) =>
    [...line.matchAll(row.key)].map((m) => ({ row, id: `${THRESHOLDS.indexOf(row)}:${m.groups.name ?? ""}`, value: Number(m.groups.value) })),
  );
}

function weaker(row, value, than) {
  if (typeof than !== "number") return false;
  return row.stricter === "higher" ? value < than : value > than;
}

function thresholdMoves(rel, removed, added, bar) {
  const rows = THRESHOLDS.filter((row) => row.file.test(rel));
  if (!rows.length) return [];
  const previous = new Map();
  for (const reading of removed.flatMap((line) => readings(rows, line))) if (!previous.has(reading.id)) previous.set(reading.id, reading.value);
  return added
    .filter((line) => readings(rows, line).some(({ row, id, value }) => weaker(row, value, previous.get(id)) || weaker(row, value, bar[row.bar])))
    .map((text) => ({ kind: "threshold", text }));
}

export function deletedTestMoves(paths) {
  return paths.filter(isTestPath).map((path) => ({ path, kind: "deleted-test", text: null }));
}

export function silencedMoves({ rel, before = "", after = "", bar = {} }) {
  const beforeLines = linesOf(before);
  const afterLines = linesOf(after);
  const added = difference(afterLines, beforeLines);
  const removed = difference(beforeLines, afterLines);
  return [...codeMoves(rel, added), ...thresholdMoves(rel, removed, added, bar ?? {})];
}
