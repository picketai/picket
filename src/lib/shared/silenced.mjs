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

const TEST_OBJECT = String.raw`\b(?:it|test|describe|context|suite|t)`;
const TEST_CALL_OPTIONS = String.raw`\b(?:it|test|describe|suite)\s*\([^)]*\{[^}]*`;

const SCRIPT_FILE = /\.[cm]?[jt]sx?$/i;

function memberMove(members) {
  const dotted = new RegExp(String.raw`${TEST_OBJECT}\s*\??\.\s*(?:${members})\b`);
  const chained = new RegExp(String.raw`^\s*\??\.\s*(?:${members})\s*\(`);
  const bracketed = new RegExp(String.raw`${TEST_OBJECT}\s*(?:\?\.)?\[\s*(["'\x60])(?:${members})\1\s*\]`);
  const bracketOutsideString = new RegExp(String.raw`${TEST_OBJECT}\s*(?:\?\.)?\[`);
  return ({ masked, text, rel }) => dotted.test(masked) || (SCRIPT_FILE.test(rel) && chained.test(masked)) || (bracketOutsideString.test(masked) && bracketed.test(text));
}

function patternMove(re) {
  return ({ masked }) => re.test(masked);
}

function anyMove(...tests) {
  return (line) => tests.some((matches) => matches(line));
}

export const TEST_MOVES = [
  {
    kind: "focused-test",
    test: anyMove(memberMove("only"), patternMove(new RegExp(String.raw`\b(fit|fdescribe)\s*\(|${TEST_CALL_OPTIONS}\bonly\s*:\s*true\b`))),
  },
  {
    kind: "skipped-test",
    test: anyMove(
      memberMove("skip|todo|skipIf"),
      patternMove(new RegExp(String.raw`${TEST_CALL_OPTIONS}\b(?:skip\s*:\s*(?:true\b|["'\x60])|todo\s*:\s*true\b)`)),
      patternMove(/\b(xit|xdescribe|xtest)\s*\(|\[Ignore\b|@Ignore\b|#\[ignore\b|\[(Fact|Theory)\s*\([^\]]*\bSkip\s*=|@pytest\.mark\.(skip|skipif|xfail)\b|\bpytest\.(skip|xfail)\s*\(|@unittest\.skip|\.skipTest\s*\(|@Disabled\b|\bt\.Skip(Now|f)?\(/),
    ),
  },
];

const NUMBER = String.raw`(?<value>-?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)`;
const COVERAGE_KEY = new RegExp(String.raw`["']?\b(?<name>lines|statements|functions|branches)\b["']?\s*:\s*${NUMBER}`, "g");
const COVERAGE_FLAG = new RegExp(String.raw`--(?<name>lines|statements|functions|branches)[=\s]+${NUMBER}`, "g");
const PYTHON_CONFIG = /(^|\/)(pytest\.ini|setup\.cfg|pyproject\.toml|tox\.ini|\.coveragerc)$/i;

export const THRESHOLDS = [
  { tool: "vitest, jest, c8 or nyc config", file: /(^|\/)((vitest|vite|jest)\.config\.[cm]?[jt]s|package\.json|\.c8rc(\.json)?|\.nycrc(\.json)?)$/i, key: COVERAGE_KEY, stricter: "higher", bar: "coverage_min" },
  { tool: "c8 or nyc --check-coverage", file: /(^|\/)package\.json$/i, key: COVERAGE_FLAG, stricter: "higher", bar: "coverage_min" },
  { tool: "pytest --cov-fail-under", file: PYTHON_CONFIG, key: new RegExp(String.raw`--cov-fail-under[=\s]+${NUMBER}`, "g"), stricter: "higher", bar: "coverage_min" },
  { tool: "coverage fail_under", file: PYTHON_CONFIG, key: new RegExp(String.raw`\bfail_under\s*[=:]\s*${NUMBER}`, "g"), stricter: "higher", bar: "coverage_min" },
  { tool: "coverlet Threshold", file: /\.(csproj|props|targets)$/i, key: new RegExp(String.raw`(?:<Threshold>\s*|\/p:Threshold=)${NUMBER}`, "g"), stricter: "higher", bar: "coverage_min" },
  { tool: "eslint --max-warnings", file: /(^|\/)package\.json$/i, key: new RegExp(String.raw`--max-warnings[=\s]+${NUMBER}`, "g"), stricter: "lower", bar: "max_warnings", negativeIsNoLimit: true },
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
    const kinds = testMoves.filter((move) => move.test({ masked, text, rel })).map((move) => move.kind);
    if (isSuppression(text, lang)) kinds.push("suppression");
    return kinds.map((kind) => ({ kind, text }));
  });
}

function readings(rows, line) {
  return rows.flatMap((row) =>
    [...line.matchAll(row.key)].map((m) => ({ row, id: `${THRESHOLDS.indexOf(row)}:${m.groups.name ?? ""}`, value: Number(m.groups.value) })),
  );
}

function limitOf(row, value) {
  return row.negativeIsNoLimit && value < 0 ? Infinity : value;
}

function weaker(row, value, than) {
  if (typeof than !== "number") return false;
  const [mine, theirs] = [limitOf(row, value), limitOf(row, than)];
  return row.stricter === "higher" ? mine < theirs : mine > theirs;
}

const KEY_AWAITING_VALUE = /[:=]$/;

function withValuesOnTheirKeyLine(lines) {
  const joined = [];
  for (const line of lines) {
    const last = joined.length - 1;
    if (last >= 0 && KEY_AWAITING_VALUE.test(joined[last])) joined[last] = `${joined[last]} ${line}`;
    else joined.push(line);
  }
  return joined;
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
  const [beforeKeyed, afterKeyed] = [withValuesOnTheirKeyLine(beforeLines), withValuesOnTheirKeyLine(afterLines)];
  const thresholds = thresholdMoves(rel, difference(beforeKeyed, afterKeyed), difference(afterKeyed, beforeKeyed), bar ?? {});
  return [...codeMoves(rel, difference(afterLines, beforeLines)), ...thresholds];
}
