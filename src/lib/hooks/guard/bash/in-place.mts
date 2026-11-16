import { normalizeRoot } from "../../../shared/shell/kernel-call.mts";
import { clusterFlag, familyOf, type Family } from "./interpreters.mts";
import type { Segment } from "./rules.mts";

const ATTACHED_PROGRAM = /^--(?:eval|print)=([\s\S]*)$/;
const QUOTED_LITERAL = /(['"])((?:(?:\+[<>]|>>|[<>])[ \t]*)?[^'"\s]+)\1/g;
const PERL_MODE_PREFIX = /^(?:\+[<>]|>>|[<>])[ \t]*/;
const STDIN_PATHS: ReadonlySet<string> = new Set(["-", "/dev/stdin", "/dev/fd/0", "/proc/self/fd/0"]);

function wordsOf(seg: Segment): string[] {
  return seg.filter((t): t is string => typeof t === "string");
}

function clusterStops(family: Family): ReadonlySet<string> {
  return new Set([...family.valueFlags, ...(family.programFlags ?? []), ...(family.scriptFlags ?? [])]);
}

function everyFlagProgram(family: Family, programFlags: readonly string[], args: string[]): string | null {
  const stops = clusterStops(family);
  const programs: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const program = clusterFlag(args[i], programFlags, stops);
    if (program === undefined) continue;
    if (program.rest !== "") programs.push(program.rest);
    else if (i + 1 < args.length) programs.push(args[++i]);
  }
  return programs.length === 0 ? null : programs.join("\n");
}

function inlineProgram(family: Family, args: string[]): string | null {
  if (family.subcommand !== undefined && args[0] === family.subcommand) return args[1] ?? null;
  const attached = args.map((word) => ATTACHED_PROGRAM.exec(word)?.[1]).find((program) => program !== undefined);
  if (attached !== undefined) return attached;
  if (family.programFlags !== undefined) return everyFlagProgram(family, family.programFlags, args);
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

function scriptAt(family: Family, args: string[], i: number): string | undefined {
  const script = clusterFlag(args[i], family.scriptFlags ?? [], clusterStops(family));
  if (script === undefined) return undefined;
  return script.rest === "" ? (args[i + 1] ?? "") : script.rest;
}

function readsStdinScript(family: Family, args: string[]): boolean {
  return args.some((_, i) => STDIN_PATHS.has(scriptAt(family, args, i) ?? ""));
}

function readsStdin(family: Family, args: string[]): boolean {
  return args.some((arg) => STDIN_PATHS.has(arg)) || readsStdinScript(family, args) || !namesScriptFile(family, args);
}

function operandProgram(family: Family, args: string[], heredocs: readonly string[]): string {
  for (let i = 0; i < args.length; i++) {
    const script = scriptAt(family, args, i);
    if (script !== undefined) return STDIN_PATHS.has(script) ? heredocs.join("\n") : "";
    if (family.valueFlags.has(args[i])) i++;
    else if (!args[i].startsWith("-")) return args[i];
  }
  return "";
}

function programText(family: Family, args: string[], heredocs: readonly string[]): string {
  const inline = inlineProgram(family, args);
  if (inline !== null) return inline;
  if (family.programOperand) return operandProgram(family, args, heredocs);
  const hereStrings = args.filter((word) => family.writeCall.test(word));
  return [...(readsStdin(family, args) ? heredocs : []), ...hereStrings].join("\n");
}

function withoutModePrefix(literal: string): string {
  return literal.replace(PERL_MODE_PREFIX, "");
}

function programWrites(family: Family, program: string): string[] {
  if (!family.writeCall.test(program)) return [];
  if (family.namedTarget !== undefined) return [...program.matchAll(family.namedTarget)].map((match) => match[1]);
  return [...program.matchAll(QUOTED_LITERAL)].map((match) => withoutModePrefix(match[2])).filter((literal) => literal !== "");
}

export function inPlaceTargets(seg: Segment, heredocs: readonly string[]): string[] {
  const [first, ...args] = wordsOf(seg);
  const family = familyOf(normalizeRoot(first ?? ""));
  if (family === undefined) return [];
  const editedFiles = family.inPlace?.(args) ?? [];
  return [...editedFiles, ...programWrites(family, programText(family, args, heredocs))];
}
