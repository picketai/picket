import { existsSync, readFileSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { runStep } from "../../shared/checks.mjs";
import { LANGS, MARKUP, commentOf, extOf, maskStrings } from "../../shared/comments.mjs";
import * as git from "../../shared/git.mjs";
import { STATE_FILES, stateDir, statePath } from "../../shared/paths.mjs";
import { detectTooling } from "../../shared/tooling.mjs";
import { isTestPath } from "../../shared/silenced.mjs";
import { projectRoot } from "../../shared/paths.mjs";
import { readState } from "../../shared/work/state.mjs";
import { workFile } from "../../shared/work/files.mjs";

const OPERATOR = /(?<=\s)(?:<=|>=|<|>)(?=\s)|===|!==|==|!=|&&|\|\||\btrue\b|\bfalse\b/g;

const INVERSE = Object.freeze({
  "===": "!==", "!==": "===", "==": "!=", "!=": "==",
  "<": ">=", ">=": "<", ">": "<=", "<=": ">",
  "&&": "||", "||": "&&", true: "false", false: "true",
});

function codeLang(path) {
  const lang = LANGS[extOf(path)];
  return lang && lang !== MARKUP ? lang : null;
}

function isCandidateFile(root, path) {
  return !git.isNonProduct(path) && Boolean(codeLang(path)) && !isTestPath(path) && existsSync(join(root, path));
}

function addedLineIndexes(before, afterLines) {
  const kept = new Map();
  for (const line of before.split(/\r?\n/)) kept.set(line, (kept.get(line) ?? 0) + 1);
  return afterLines.flatMap((line, index) => {
    const count = kept.get(line) ?? 0;
    if (count) kept.set(line, count - 1);
    return count ? [] : [index];
  });
}

function codePart(line, lang) {
  const masked = maskStrings(line);
  const comment = commentOf(line, lang);
  return comment ? masked.slice(0, comment.col) : masked;
}

function firstOperator(code) {
  OPERATOR.lastIndex = 0;
  const m = OPERATOR.exec(code);
  return m ? { col: m.index, from: m[0], to: INVERSE[m[0]] } : null;
}

function fileMutant(root, base, path) {
  const lang = codeLang(path);
  const lines = readFileSync(join(root, path), "utf8").split("\n");
  const plain = lines.map((line) => line.replace(/\r$/, ""));
  for (const index of addedLineIndexes(git.fileAt(root, base, path), plain)) {
    const op = firstOperator(codePart(plain[index], lang));
    if (op) return { path, line: index + 1, col: op.col, from: op.from, to: op.to };
  }
  return null;
}

export function pickMutant(root, base) {
  const files = git.changedSince(root, base).filter((path) => isCandidateFile(root, path)).sort();
  for (const path of files) {
    const mutant = fileMutant(root, base, path);
    if (mutant) return mutant;
  }
  return null;
}

function restoreRecordPath(root) {
  return statePath(root, STATE_FILES.mutationRestore);
}

export function restoreLeftover(root) {
  const record = restoreRecordPath(root);
  if (!existsSync(record)) return null;
  const { path, original } = JSON.parse(readFileSync(record, "utf8"));
  writeFileSync(join(root, path), Buffer.from(original, "base64"));
  rmSync(record);
  return path;
}

function withMutant(root, mutant, run) {
  const file = join(root, mutant.path);
  const original = readFileSync(file);
  mkdirSync(stateDir(root), { recursive: true });
  writeFileSync(restoreRecordPath(root), JSON.stringify({ path: mutant.path, original: original.toString("base64") }));
  const lines = original.toString("utf8").split("\n");
  const line = lines[mutant.line - 1];
  lines[mutant.line - 1] = line.slice(0, mutant.col) + mutant.to + line.slice(mutant.col + mutant.from.length);
  try {
    writeFileSync(file, lines.join("\n"));
    return run();
  } finally {
    writeFileSync(file, original);
    rmSync(restoreRecordPath(root), { force: true });
  }
}

const REBUILD_PROBLEMS = Object.freeze(["failed", "timed out", "error"]);

const STEP_TIMEOUT_MS = 300_000;

function stepStatus(root, step, command, env) {
  try {
    return runStep(root, step, command, { env, timeoutMs: STEP_TIMEOUT_MS, logPrefix: "mutate" }).status;
  } catch {
    return "error";
  }
}

function mutantOutcome(testStatus) {
  if (testStatus === "passed") return "survived";
  if (testStatus === "failed") return "killed";
  return "error";
}

function baselineOutcome(testStatus) {
  if (testStatus === "passed") return null;
  return testStatus === "failed" ? "baseline red" : "error";
}

export function mutate(id, { root = projectRoot(), env } = {}) {
  const started = Date.now();
  const restored = restoreLeftover(root);
  const base = readState(root, id).base ?? "HEAD";
  const { tooling } = detectTooling(root);
  const status = (step) => stepStatus(root, step, tooling[step], env);
  const command = tooling.test ?? null;
  const baseline = command ? baselineOutcome(status("test")) : null;
  const found = command && !baseline ? pickMutant(root, base) : null;
  const outcome = !command ? "no test command" : baseline ?? (!found ? "no candidate" : withMutant(root, found, () => mutantOutcome(status("test"))));
  const rebuild = found || restored ? status("build") : null;
  const mutant = found ? { path: found.path, line: found.line, from: found.from, to: found.to } : null;
  const result = { ts: new Date().toISOString(), base, mutant, command, outcome, rebuild, ms: Date.now() - started };
  writeFileSync(workFile(root, id, "mutation.json"), JSON.stringify(result, null, 2) + "\n");
  return { ...result, restored };
}

export function renderMutation(v) {
  const lines = v.restored ? [`restored ${v.restored} from an interrupted run`] : [];
  const where = v.mutant ? `${v.mutant.path}:${v.mutant.line} ${v.mutant.from} -> ${v.mutant.to}` : "none";
  lines.push(`mutant ${where}: ${v.outcome}`);
  if (REBUILD_PROBLEMS.includes(v.rebuild)) lines.push(`rebuild after restoring: ${v.rebuild}; the build output may still hold the mutant`);
  return lines.join("\n");
}
