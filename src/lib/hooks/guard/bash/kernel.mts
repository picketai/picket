import { resolve } from "node:path";
import { kernelVerbStart } from "../../../shared/shell/kernel-call.mts";
import { detectTooling } from "../../../shared/tooling.mts";
import { VERB_NAMES } from "../../../verbs.mts";

type VerbTable = Record<string, { readOnly?: boolean; leadOnly?: boolean; subverbs?: Record<string, { readOnly: boolean }> }>;
type KernelScope = { cwd: string | null; depth: number; hookRoot: string | null; platform: NodeJS.Platform; classifyText: (text: string, cwd: string | null, depth: number) => string };

export const WRAPPING_FLAGS = new Set(["--run", "--start", "--only"]);
export const BARE_KERNEL = "picket";

const VERBS: VerbTable = VERB_NAMES;

function entryOf(verb: unknown): VerbTable[string] | undefined {
  return typeof verb === "string" && Object.hasOwn(VERBS, verb) ? VERBS[verb] : undefined;
}

export function kernelClass(verb: unknown, subverb: unknown): "safe" | "kernel" {
  const entry = entryOf(verb);
  if (!entry) return "kernel";
  if (entry.subverbs) return typeof subverb === "string" && Object.hasOwn(entry.subverbs, subverb) && entry.subverbs[subverb].readOnly ? "safe" : "kernel";
  return entry.readOnly ? "safe" : "kernel";
}

export function isLeadOnly(verb: unknown): boolean {
  return entryOf(verb)?.leadOnly === true;
}

export function wrappedCommands(seg: readonly unknown[]): string[] {
  const start = kernelVerbStart(seg);
  if (start === null) return [];
  const out: string[] = [];
  for (let i = start; i < seg.length; i++) {
    const word = seg[i];
    const next = seg[i + 1];
    if (typeof word === "string" && WRAPPING_FLAGS.has(word) && typeof next === "string") {
      out.push(next);
      i++;
    }
  }
  return out;
}

function sameDirectory(a: string, b: string, platform: NodeJS.Platform): boolean {
  const norm = (dir: string): string => resolve(dir).replaceAll("\\", "/").replace(/\/$/, "");
  return platform === "win32" ? norm(a).toLowerCase() === norm(b).toLowerCase() : norm(a) === norm(b);
}

function verifyRunsNoProjectCode(tokens: readonly unknown[], { cwd, hookRoot, depth, platform, classifyText }: KernelScope): boolean {
  const words = tokens.filter((t): t is string => typeof t === "string");
  if (words.includes("--no-tests")) return true;
  if (!hookRoot || !cwd || !sameDirectory(cwd, hookRoot, platform)) return false;
  if (words.some((t) => t === "--root" || t.startsWith("--root="))) return false;
  let testCommand: string | null | undefined;
  try {
    testCommand = detectTooling(hookRoot).tooling.test;
  } catch {
    return false;
  }
  return !testCommand || classifyText(testCommand, hookRoot, depth) === "safe";
}

export function classifyKernelCall(tokens: readonly unknown[], scope: KernelScope): "safe" | "unknown" | "kernel" {
  const [, verb, subverb] = tokens;
  if (verb === "verify") return verifyRunsNoProjectCode(tokens, scope) ? "safe" : "unknown";
  return kernelClass(verb, subverb);
}
