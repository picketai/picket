import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { commentOf, extOf, LANGS, MARKUP, maskStrings } from "../../shared/comments.mjs";
import { changedSince, fileAt, isNonProduct } from "../../shared/git.mts";
import { STATE_FILES, stateDir, statePath } from "../../shared/paths.mts";
import { isTestPath } from "../../shared/silenced.mjs";

export type Mutant = { path: string; line: number; col: number; from: string; to: string };

type Lang = (typeof LANGS)[keyof typeof LANGS] | typeof MARKUP;
type Operator = Pick<Mutant, "col" | "from" | "to">;
type RestoreRecord = { path: string; original: string };

const OPERATOR = /(?<=\s)(?:<=|>=|<|>)(?=\s)|===|!==|==|!=|&&|\|\||\btrue\b|\bfalse\b/g;

const INVERSE: Readonly<Record<string, string>> = Object.freeze({
  "===": "!==", "!==": "===", "==": "!=", "!=": "==",
  "<": ">=", ">=": "<", ">": "<=", "<=": ">",
  "&&": "||", "||": "&&", true: "false", false: "true",
});

function codeLang(path: string): Lang | null {
  const lang = (LANGS as Record<string, Lang | undefined>)[extOf(path)];
  return lang && lang !== MARKUP ? lang : null;
}

function isCandidateFile(root: string, path: string): boolean {
  return !isNonProduct(path) && Boolean(codeLang(path)) && !isTestPath(path) && existsSync(join(root, path));
}

function addedLineIndexes(before: string, afterLines: string[]): number[] {
  const kept = new Map<string, number>();
  for (const line of before.split(/\r?\n/)) kept.set(line, (kept.get(line) ?? 0) + 1);
  return afterLines.flatMap((line, index) => {
    const count = kept.get(line) ?? 0;
    if (count) kept.set(line, count - 1);
    return count ? [] : [index];
  });
}

function codePart(line: string, lang: Lang): string {
  const masked = maskStrings(line);
  const comment = commentOf(line, lang);
  return comment ? masked.slice(0, comment.col) : masked;
}

function firstOperator(code: string): Operator | null {
  OPERATOR.lastIndex = 0;
  const m = OPERATOR.exec(code);
  return m ? { col: m.index, from: m[0], to: INVERSE[m[0]] } : null;
}

function fileMutant(root: string, base: string, path: string, lang: Lang): Mutant | null {
  const plain = readFileSync(join(root, path), "utf8")
    .split("\n")
    .map((line) => line.replace(/\r$/, ""));
  for (const index of addedLineIndexes(fileAt(root, base, path), plain)) {
    const op = firstOperator(codePart(plain[index], lang));
    if (op) return { path, line: index + 1, ...op };
  }
  return null;
}

export function pickMutant(root: string, base: string): Mutant | null {
  const files = changedSince(root, base)
    .filter((path) => isCandidateFile(root, path))
    .sort();
  for (const path of files) {
    const lang = codeLang(path);
    const mutant = lang && fileMutant(root, base, path, lang);
    if (mutant) return mutant;
  }
  return null;
}

function restoreRecordPath(root: string): string {
  return statePath(root, STATE_FILES.mutationRestore);
}

export function restoreLeftover(root: string): string | null {
  const record = restoreRecordPath(root);
  if (!existsSync(record)) return null;
  const { path, original } = JSON.parse(readFileSync(record, "utf8")) as RestoreRecord;
  writeFileSync(join(root, path), Buffer.from(original, "base64"));
  rmSync(record);
  return path;
}

function mutatedText(original: Buffer, mutant: Mutant): string {
  const lines = original.toString("utf8").split("\n");
  const line = lines[mutant.line - 1];
  lines[mutant.line - 1] = line.slice(0, mutant.col) + mutant.to + line.slice(mutant.col + mutant.from.length);
  return lines.join("\n");
}

export function withMutant<T>(root: string, mutant: Mutant, run: () => T): T {
  const file = join(root, mutant.path);
  const original = readFileSync(file);
  mkdirSync(stateDir(root), { recursive: true });
  const record: RestoreRecord = { path: mutant.path, original: original.toString("base64") };
  writeFileSync(restoreRecordPath(root), JSON.stringify(record));
  try {
    writeFileSync(file, mutatedText(original, mutant));
    return run();
  } finally {
    writeFileSync(file, original);
    rmSync(restoreRecordPath(root), { force: true });
  }
}
