import { basename, isAbsolute, relative, resolve } from "node:path";
import { leadingAssignments } from "../../../shared/escalation.mts";
import { isHookOnlyState, isKernelOwnedWorkPath, KERNEL_OWNED_ENTRIES } from "../../../shared/kernel-records.mts";
import { PICKET_DIR, stateRel, WORK_DIR } from "../../../shared/paths.mts";
import { kernelVerbStart, normalizeRoot } from "../../../shared/shell/kernel-call.mts";
import { isOpaqueWord, nodePath } from "./bash.mts";
import { isSanctionedLogSink, ruleOf, type Refusal, type Segment } from "./rules.mts";
import { sourceAllowed } from "./sources.mts";

const RECORD_FOLDERS = [PICKET_DIR, stateRel("")].map((folder) => folder.toLowerCase());
const FLAG_VALUE = /^--?[\w-]+=(.+)$/;
const EXPANSION = /[$`]/;
const GLOB_CHARS = /[*?[{]/;
const HOME_WORD = /^~/;
const REGEX_SPECIAL = /[.*+?^${}()|[\]\\/]/g;
const WRAPPED_QUOTE_CHARS = 60;
const TARGET_DIRECTORY_ROOTS = new Set(["cp", "mv", "install", "ln"]);
const TARGET_DIRECTORY_FLAGS = new Set(["-t", "--target-directory"]);
const ATTACHED_TARGET_DIRECTORY = /^(?:--target-directory=|-t)(.+)$/;

export function isKernelRecord(rel: string): boolean {
  const path = rel.replaceAll("\\", "/").replace(/\/+$/, "");
  if (RECORD_FOLDERS.includes(path.toLowerCase())) return true;
  if (isKernelOwnedWorkPath(path) || isKernelOwnedWorkPath(`${path}/`)) return true;
  return isHookOnlyState(path) && !isSanctionedLogSink(path);
}

export function projectRel(word: string, cwd: string | null, root: string): string | null {
  const path = nodePath(word);
  if (!isAbsolute(path) && !cwd) return null;
  const rel = relative(root, cwd ? resolve(cwd, path) : resolve(path)).replaceAll("\\", "/");
  if (!rel || rel === ".." || rel.startsWith("../") || isAbsolute(rel)) return null;
  return rel;
}

function isKernelCall(seg: Segment): boolean {
  return kernelVerbStart(seg) !== null;
}

function isReader(seg: Segment): boolean {
  if (sourceAllowed(seg) || isKernelCall(seg)) return true;
  return ruleOf(normalizeRoot(seg[0]))?.inert === true;
}

function pathWord(token: unknown): string | null {
  if (typeof token !== "string" || !token || isOpaqueWord(token) || EXPANSION.test(token)) return null;
  const value = FLAG_VALUE.exec(token)?.[1] ?? token;
  return value.startsWith("-") ? null : value;
}

function recordNamed(token: unknown, cwd: string | null, root: string): string | null {
  const word = pathWord(token);
  const rel = word === null ? null : projectRel(word, cwd, root);
  return rel !== null && isKernelRecord(rel) ? rel : null;
}

function recordsAmong(tokens: readonly unknown[], cwd: string | null, root: string): string[] {
  return tokens.map((token) => recordNamed(token, cwd, root)).filter((rel): rel is string => rel !== null);
}

function targetDirectoryOf(words: string[]): { dir: string | null; operands: string[] } {
  let dir: string | null = null;
  const operands: string[] = [];
  for (let at = 0; at < words.length; at++) {
    const word = words[at];
    const attached = ATTACHED_TARGET_DIRECTORY.exec(word)?.[1];
    if (TARGET_DIRECTORY_FLAGS.has(word)) dir = words[++at] ?? null;
    else if (attached !== undefined) dir = attached;
    else if (!word.startsWith("-")) operands.push(word);
  }
  return { dir, operands };
}

function copiedInto(command: Segment): string[] {
  if (!TARGET_DIRECTORY_ROOTS.has(String(normalizeRoot(command[0])))) return [];
  const { dir, operands } = targetDirectoryOf(command.slice(1).filter((token): token is string => typeof token === "string"));
  return dir === null ? [] : operands.map((operand) => `${dir}/${basename(nodePath(operand))}`);
}

export function namedRecords(seg: Segment, cwd: string | null, root: string): string[] {
  const command = leadingAssignments(seg).command;
  if (command.length === 0 || isReader(command)) return [];
  return recordsAmong([...command.slice(1), ...copiedInto(command)], cwd, root);
}

export function tailRecords(tail: Segment, cwd: string | null, root: string): string[] {
  const reader = tail.findIndex((_, at) => {
    const rest = leadingAssignments(tail.slice(at)).command;
    return rest.length > 0 && isReader(rest);
  });
  return recordsAmong(reader === -1 ? tail : tail.slice(0, reader), cwd, root);
}

type ComponentTest = (component: string) => boolean;

function escapedRegex(text: string): string {
  return text.replace(REGEX_SPECIAL, "\\$&");
}

function bracketAt(glob: string, at: number): { source: string; end: number } | null {
  const end = glob.indexOf("]", at + 2);
  return end < 0 ? null : { source: `[${glob.slice(at + 1, end).replace(/^!/, "^").replaceAll("\\", "\\\\")}]`, end };
}

function bracesAt(glob: string, at: number): { source: string; end: number } | null {
  const end = glob.indexOf("}", at);
  return end < 0 ? null : { source: `(?:${glob.slice(at + 1, end).split(",").map(escapedRegex).join("|")})`, end };
}

function globRegex(glob: string): RegExp {
  let source = "";
  for (let at = 0; at < glob.length; at++) {
    const char = glob[at];
    const group = char === "[" ? bracketAt(glob, at) : char === "{" ? bracesAt(glob, at) : null;
    if (group !== null) {
      source += group.source;
      at = group.end;
    } else if (char === "*") source += "[^/]*";
    else if (char === "?") source += "[^/]";
    else source += escapedRegex(char);
  }
  return new RegExp(`^${source}$`, "i");
}

const anyName: ComponentTest = () => true;
const oneOf =
  (names: string[]): ComponentTest =>
  (component) =>
    names.some((name) => globRegex(component).test(name));
const notScratch: ComponentTest = (component) => GLOB_CHARS.test(component) || component.toLowerCase() !== "scratch";

const RECORD_SHAPES: ComponentTest[][] = [
  [...stateRel("").split("/").map((name) => oneOf([name])), notScratch],
  [oneOf([WORK_DIR]), anyName, oneOf(KERNEL_OWNED_ENTRIES.map((entry) => entry.replace(/\/$/, "")))],
];

function globMayMatchRecord(rel: string): boolean {
  const components = rel.split("/");
  return RECORD_SHAPES.some((shape) => components.every((component, at) => at >= shape.length || shape[at](component)));
}

export function mayReachRecord(word: string, cwd: string | null, root: string): boolean {
  if (isOpaqueWord(word) || HOME_WORD.test(word)) return true;
  if (!GLOB_CHARS.test(word)) return false;
  if (!isAbsolute(nodePath(word)) && !cwd) return true;
  const rel = projectRel(word, cwd, root);
  return rel !== null && globMayMatchRecord(rel);
}

function candidateWord(token: unknown): string | null {
  if (typeof token !== "string" || !token) return null;
  const value = FLAG_VALUE.exec(token)?.[1] ?? token;
  return value.startsWith("-") ? null : value;
}

export function writesUnseen(seg: Segment, cwd: string | null, root: string): boolean {
  const command = leadingAssignments(seg).command;
  if (command.length === 0 || isReader(command)) return false;
  if (cwd === null) return true;
  return command.slice(1).some((token) => {
    const word = candidateWord(token);
    return word !== null && mayReachRecord(word, cwd, root);
  });
}

export function unseenRecordDenial(inner: string): Refusal {
  return {
    why: "kernel_record",
    reason: `guard.bash: the command wrapped in a picket verb (${inner.slice(0, WRAPPED_QUOTE_CHARS)}) writes through a glob, an expansion or an unknown folder that could reach a kernel record; write every path out in full, or run the command directly so the permission prompt sees it.`,
  };
}

export function recordDenial(rel: string): Refusal {
  return {
    why: "kernel_record",
    reason: `guard.bash: ${rel} is a kernel record, written only by picket verbs and hooks; a spawned agent never writes, copies or moves one by shell. Read it with \`cat\`, \`grep\` or \`picket state\`.`,
  };
}
