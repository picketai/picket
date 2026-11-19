import { isAbsolute, relative, resolve } from "node:path";
import { leadingAssignments } from "../../../shared/escalation.mts";
import { isHookOnlyState } from "../../../shared/kernel-records.mts";
import { PICKET_DIR, stateRel } from "../../../shared/paths.mts";
import { kernelVerbStart, normalizeRoot } from "../../../shared/shell/kernel-call.mts";
import { isOpaqueWord, nodePath } from "./bash.mts";
import { wrappedCommands } from "./kernel.mts";
import { isSanctionedLogSink, ruleOf, type Refusal, type Segment } from "./rules.mts";
import { sourceAllowed } from "./sources.mts";

const RECORD_FOLDERS = [PICKET_DIR, stateRel("")].map((folder) => folder.toLowerCase());
const FLAG_VALUE = /^--?[\w-]+=(.+)$/;
const EXPANSION = /[$`]/;

export function isKernelRecord(rel: string): boolean {
  const path = rel.replaceAll("\\", "/").replace(/\/+$/, "");
  if (RECORD_FOLDERS.includes(path.toLowerCase())) return true;
  return isHookOnlyState(path) && !isSanctionedLogSink(path);
}

export function projectRel(word: string, cwd: string | null, root: string): string | null {
  const path = nodePath(word);
  if (!isAbsolute(path) && !cwd) return null;
  const rel = relative(root, cwd ? resolve(cwd, path) : resolve(path)).replaceAll("\\", "/");
  if (!rel || rel === ".." || rel.startsWith("../") || isAbsolute(rel)) return null;
  return rel;
}

function isBareKernelCall(seg: Segment): boolean {
  return kernelVerbStart(seg) !== null && wrappedCommands(seg).length === 0;
}

function isReader(seg: Segment): boolean {
  if (sourceAllowed(seg) || isBareKernelCall(seg)) return true;
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

export function namedRecords(seg: Segment, cwd: string | null, root: string): string[] {
  const command = leadingAssignments(seg).command;
  if (command.length === 0 || isReader(command)) return [];
  return recordsAmong(command.slice(1), cwd, root);
}

export function tailRecords(tail: Segment, cwd: string | null, root: string): string[] {
  const reader = tail.findIndex((_, at) => {
    const rest = leadingAssignments(tail.slice(at)).command;
    return rest.length > 0 && isReader(rest);
  });
  return recordsAmong(reader === -1 ? tail : tail.slice(0, reader), cwd, root);
}

export function recordDenial(rel: string): Refusal {
  return {
    why: "kernel_record",
    reason: `guard.bash: ${rel} is a kernel record, written only by picket verbs and hooks; a spawned agent never writes, copies or moves one by shell. Read it with \`cat\`, \`grep\` or \`picket state\`.`,
  };
}
