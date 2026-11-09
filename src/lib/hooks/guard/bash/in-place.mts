import { normalizeRoot } from "../../../shared/shell/kernel-call.mts";
import type { Segment } from "./rules.mts";

const INTERPRETERS = new Set(["python", "python3", "node", "perl", "ruby", "bun", "deno"]);
const IN_PLACE_EDITORS = new Set(["perl", "ruby"]);
const IN_PLACE_CLUSTER = /^-[aclnpsTtuUwWX0-9]*i/;
const EDITOR_PROGRAM_CLUSTER = /^-[A-Za-z]*[eE]$/;
const PROGRAM_FLAGS = new Set(["-c", "-e", "-E", "--eval", "-p"]);
const WRITE_CALL = /\.write\(|write_text\(|writeFileSync\(|writeFile\(|appendFileSync\(|File\.write|\bopen\([^)]*?(['"])[rbt]*[wa+][rwabt+]*\1/;
const QUOTED_LITERAL = /(['"])([^'"\s]+)\1/g;
const STDIN_OPERAND = "-";

function wordsOf(seg: Segment): string[] {
  return seg.filter((t): t is string => typeof t === "string");
}

function takesProgram(root: string, word: string): boolean {
  return IN_PLACE_EDITORS.has(root) ? EDITOR_PROGRAM_CLUSTER.test(word) : PROGRAM_FLAGS.has(word);
}

function inlineProgram(root: string, args: string[]): string | null {
  if (root === "deno" && args[0] === "eval") return args[1] ?? null;
  const at = args.findIndex((word) => takesProgram(root, word));
  return at === -1 ? null : (args[at + 1] ?? null);
}

function namesScriptFile(args: string[]): boolean {
  const operand = args.find((word) => word === STDIN_OPERAND || !word.startsWith("-"));
  return operand !== undefined && operand !== STDIN_OPERAND;
}

function programText(root: string, args: string[], heredocs: readonly string[]): string | null {
  const inline = inlineProgram(root, args);
  if (inline !== null) return inline;
  return namesScriptFile(args) ? null : heredocs.join("\n");
}

function programWrites(program: string): string[] {
  if (!WRITE_CALL.test(program)) return [];
  return [...program.matchAll(QUOTED_LITERAL)].map((match) => match[2]);
}

function inPlaceFileOperands(args: string[]): string[] {
  if (!args.some((word) => IN_PLACE_CLUSTER.test(word))) return [];
  const positional: string[] = [];
  let programGiven = false;
  for (let i = 0; i < args.length; i++) {
    if (EDITOR_PROGRAM_CLUSTER.test(args[i])) {
      programGiven = true;
      i++;
    } else if (!args[i].startsWith("-")) positional.push(args[i]);
  }
  return programGiven ? positional : positional.slice(1);
}

export function inPlaceTargets(seg: Segment, heredocs: readonly string[]): string[] {
  const [first, ...args] = wordsOf(seg);
  const root = normalizeRoot(first ?? "").toLowerCase();
  if (!INTERPRETERS.has(root)) return [];
  const program = programText(root, args, heredocs);
  const editedFiles = IN_PLACE_EDITORS.has(root) ? inPlaceFileOperands(args) : [];
  return [...editedFiles, ...(program === null ? [] : programWrites(program))];
}
