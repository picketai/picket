import { normalizeRoot } from "../../../shared/shell/kernel-call.mts";
import { familyOf, type Family } from "./interpreters.mts";
import type { Segment } from "./rules.mts";

const ATTACHED_PROGRAM = /^--(?:eval|print)=([\s\S]*)$/;
const QUOTED_LITERAL = /(['"])((?:(?:\+[<>]|>>|[<>])[ \t]*)?[^'"\s]+)\1/g;
const PERL_MODE_PREFIX = /^(?:\+[<>]|>>|[<>])[ \t]*/;
const STDIN_OPERAND = "-";

function wordsOf(seg: Segment): string[] {
  return seg.filter((t): t is string => typeof t === "string");
}

function inlineProgram(family: Family, args: string[]): string | null {
  if (family.subcommand !== undefined && args[0] === family.subcommand) return args[1] ?? null;
  const attached = args.map((word) => ATTACHED_PROGRAM.exec(word)?.[1]).find((program) => program !== undefined);
  if (attached !== undefined) return attached;
  const at = args.findIndex(family.takesProgram);
  return at === -1 ? null : (args[at + 1] ?? null);
}

function namesScriptFile(family: Family, args: string[]): boolean {
  for (let i = 0; i < args.length; i++) {
    if (family.valueFlags.has(args[i])) i++;
    else if (!args[i].startsWith("-")) return true;
  }
  return false;
}

function readsStdin(family: Family, args: string[]): boolean {
  return args.includes(STDIN_OPERAND) || !namesScriptFile(family, args);
}

function programText(family: Family, args: string[], heredocs: readonly string[]): string {
  const inline = inlineProgram(family, args);
  if (inline !== null) return inline;
  const hereStrings = args.filter((word) => family.writeCall.test(word));
  return [...(readsStdin(family, args) ? heredocs : []), ...hereStrings].join("\n");
}

function withoutModePrefix(literal: string): string {
  return literal.replace(PERL_MODE_PREFIX, "");
}

function programWrites(family: Family, program: string): string[] {
  if (!family.writeCall.test(program)) return [];
  return [...program.matchAll(QUOTED_LITERAL)].map((match) => withoutModePrefix(match[2])).filter((literal) => literal !== "");
}

export function inPlaceTargets(seg: Segment, heredocs: readonly string[]): string[] {
  const [first, ...args] = wordsOf(seg);
  const family = familyOf(normalizeRoot(first ?? ""));
  if (family === undefined) return [];
  const editedFiles = family.inPlace?.(args) ?? [];
  return [...editedFiles, ...programWrites(family, programText(family, args, heredocs))];
}
