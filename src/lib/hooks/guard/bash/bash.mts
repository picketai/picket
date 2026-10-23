import { resolve } from "node:path";
import { leadingAssignments } from "../../../shared/escalation.mts";
import { normalizeRoot } from "../../../shared/shell/kernel-call.mts";
import { parse, type ParseEntry } from "../../../util/vendor/shell-quote-parse.mjs";
import {
  classifyPrefixedCommand,
  classifySegment,
  fallThrough,
  INERT_ROOTS,
  type Classification,
  type ClassifyText,
  type Dialect,
  type GuardContext,
  type Judgement,
  type Reading,
  type Segment,
  type SegmentScope,
  type Token,
} from "./rules.mts";

export type Split = { segments: Segment[]; sawWriteRedirect: boolean; sawBackground: boolean; redirectTargets: (string | null)[] };
export type SubstitutionState = { bodies: string[]; bodyCtx: GuardContext; taintedNames: Set<string>; carriesOutput: (token: Token) => boolean };

type ShellText = { command: string; expanded: string };
type PendingHeredoc = { delimiter: string; stripTabs: boolean; expands: boolean };
type Substituted = { command: string; bodies: string[]; denial?: Judgement };

export const VARIABLE_MARK = "__picket_variable__";
export const SUBSTITUTION_WORD = "__picket_substitution__";
export const MAX_SUBSTITUTION_DEPTH = 2;

const HEREDOC_START = /^<<(-?)[ \t]*(?:'([^'\n]*)'|"([^"\n]*)"|\\?([^\s;&|<>()'"`\\]+)(?=[\s;&|<>()]|$))/;
const WORD_BREAK = /[\s;&|()]/;
const PLAIN_PARAMETER_CHAR = /^[A-Za-z0-9_:\-./+= ]$/;
const MARKED_NAME = new RegExp(`${VARIABLE_MARK}(.*?)${VARIABLE_MARK}`, "g");
const PLAIN_NAME = /^(?:[A-Za-z_][A-Za-z0-9_]*|[0-9]+|[?#$!@*-])$/;
const ASSIGNMENT_IN_TEXT = /(?:^|[\s;&|(])([A-Za-z_][A-Za-z0-9_]*)=/g;
const LAST_ARGUMENT = "_";
const SHELL_BEHAVIOUR_NAMES = new Set(["PATH", "CDPATH", "IFS", "BASH_ENV", "ENV", "GLOBIGNORE", "HOME", "SHELLOPTS", "BASHOPTS", "PS4"]);
const CHAIN_OPS = new Set(["&&", "||", ";", "|", "|&", ";;"]);
const WRITE_REDIRECT_OPS = new Set([">", ">>"]);
const DISCARD_TARGET = "/dev/null";
export const LEAVE_HINT = 'Cleanup after the work is never escalated: record it with `picket leave <id> --command "<command>"` and it is listed when the item closes.';
const ESCALATE_HINT = `If the user asked for this action in this session or the work cannot continue without it, run it alone as \`PICKET_ESCALATE="<why>" <command>\` and the user decides in the dialog. ${LEAVE_HINT}`;
const DESTRUCTIVE_DENIAL = `guard.bash: command contains a destructive sub-command (e.g. rm, sudo, git push/reset/rebase/checkout/merge/clean). ${ESCALATE_HINT}`;

export function hasHiddenExecution(rawCommand: string): boolean {
  return /\$\(/.test(rawCommand) || /`/.test(rawCommand) || /<\(/.test(rawCommand) || />\(/.test(rawCommand);
}

function quotedEnd(raw: string, i: number): number {
  const ansi = raw[i] === "$";
  const quote = raw[ansi ? i + 1 : i];
  const escapes = ansi || quote === '"';
  for (let j = ansi ? i + 2 : i + 1; j < raw.length; j++) {
    if (escapes && raw[j] === "\\") j++;
    else if (raw[j] === quote) return j + 1;
  }
  return raw.length;
}

function readHeredocBody(raw: string, start: number, { delimiter, stripTabs }: PendingHeredoc): { body: string; next: number } | null {
  for (let i = start; i < raw.length; ) {
    const end = raw.indexOf("\n", i);
    const next = end === -1 ? raw.length : end + 1;
    const line = raw.slice(i, end === -1 ? raw.length : end);
    if ((stripTabs ? line.replace(/^\t+/, "") : line) === delimiter) return { body: raw.slice(start, i), next };
    i = next;
  }
  return null;
}

export function shellText(raw: string): ShellText | null {
  let command = "";
  let expanded = "";
  const pending: PendingHeredoc[] = [];
  let i = 0;
  while (i < raw.length) {
    const ch = raw[i];
    if (ch === "'" || ch === '"' || (ch === "$" && raw[i + 1] === "'")) {
      const end = quotedEnd(raw, i);
      command += raw.slice(i, end);
      i = end;
    } else if (ch === "\\") {
      if (raw[i + 1] !== "\n") command += raw.slice(i, i + 2);
      i += 2;
    } else if (ch === "#" && (i === 0 || WORD_BREAK.test(raw[i - 1]))) {
      const end = raw.indexOf("\n", i);
      i = end === -1 ? raw.length : end;
    } else if (raw.startsWith("<<<", i)) {
      command += "<<<";
      i += 3;
    } else if (raw.startsWith("<<", i) && HEREDOC_START.test(raw.slice(i))) {
      const [token, dash, single, double, bare] = HEREDOC_START.exec(raw.slice(i)) as RegExpExecArray;
      pending.push({ delimiter: single ?? double ?? bare, stripTabs: dash === "-", expands: bare !== undefined && !token.includes("\\") });
      command += token;
      i += token.length;
    } else if (raw.startsWith("&>", i) && !/[&>]/.test(raw[i - 1] ?? "")) {
      const append = raw[i + 2] === ">";
      command += append ? ">>" : ">";
      i += append ? 3 : 2;
    } else if (ch === "\n") {
      command += " ; ";
      i++;
      for (const heredoc of pending.splice(0)) {
        const read = readHeredocBody(raw, i, heredoc);
        if (!read) return null;
        if (heredoc.expands) expanded += read.body;
        i = read.next;
      }
    } else {
      command += ch;
      i++;
    }
  }
  return pending.length ? null : { command, expanded };
}

function opensSingleQuote(command: string, i: number): boolean {
  return command[i] === "'" || command.startsWith("$'", i);
}

function outsideSingleQuotes(command: string): string {
  let out = "";
  let inDouble = false;
  for (let i = 0; i < command.length; ) {
    if (command[i] === "\\") {
      out += command.slice(i, i + 2);
      i += 2;
    } else if (!inDouble && opensSingleQuote(command, i)) {
      i = quotedEnd(command, i);
    } else {
      if (command[i] === '"') inDouble = !inDouble;
      out += command[i++];
    }
  }
  return out;
}

function plainParameterEnd(command: string, start: number): number {
  for (let i = start; i < command.length; i++) {
    if (command[i] === "}") return i;
    if (command.startsWith("${", i)) {
      const close = plainParameterEnd(command, i + 2);
      if (close < 0) return -1;
      i = close;
    } else if (!PLAIN_PARAMETER_CHAR.test(command[i])) return -1;
  }
  return -1;
}

function hasOpaqueQuotedParameter(command: string): boolean {
  let inDouble = false;
  for (let i = 0; i < command.length; i++) {
    if (command[i] === "\\") i++;
    else if (!inDouble && opensSingleQuote(command, i)) i = quotedEnd(command, i) - 1;
    else if (command[i] === '"') inDouble = !inDouble;
    else if (inDouble && command.startsWith("${", i)) {
      const close = plainParameterEnd(command, i + 2);
      if (close < 0) return true;
      i = close;
    }
  }
  return false;
}

function closingParen(command: string, start: number): number {
  let open = 1;
  for (let i = start; i < command.length; i++) {
    const ch = command[i];
    if (ch === "\\") i++;
    else if (ch === '"' || opensSingleQuote(command, i)) i = quotedEnd(command, i) - 1;
    else if (ch === "(") open++;
    else if (ch === ")" && --open === 0) return i;
  }
  return -1;
}

function evaluateSubstitution(command: string, start: number, ctx: GuardContext): { body: string; close: number; result: Judgement } | null {
  const close = closingParen(command, start + 2);
  if (close === -1) return null;
  const body = command.slice(start + 2, close);
  return { body, close, result: ctx.evaluate(body, { ...ctx, depth: ctx.depth + 1 }) };
}

function substituteCommands(command: string, ctx: GuardContext): Substituted {
  const bodies: string[] = [];
  if (ctx.depth >= MAX_SUBSTITUTION_DEPTH) return { command, bodies };
  let out = "";
  let inDouble = false;
  for (let i = 0; i < command.length; ) {
    if (command[i] === "\\") {
      out += command.slice(i, i + 2);
      i += 2;
      continue;
    }
    if (!inDouble && opensSingleQuote(command, i)) {
      const end = quotedEnd(command, i);
      out += command.slice(i, end);
      i = end;
      continue;
    }
    const substitution = command.startsWith("$(", i) && command[i + 2] !== "(" ? evaluateSubstitution(command, i, ctx) : null;
    if (substitution?.result.decision === "deny") return { command, bodies, denial: substitution.result };
    if (substitution?.result.decision === "allow") {
      bodies.push(substitution.body);
      out += SUBSTITUTION_WORD;
      i = substitution.close + 1;
      continue;
    }
    if (command[i] === '"') inDouble = !inDouble;
    out += command[i++];
  }
  return { command: out, bodies };
}

function recheckBodies(bodies: string[], cwd: string | null, ctx: GuardContext): Judgement | null {
  if (!cwd) return fallThrough("hidden-execution");
  for (const body of bodies) {
    const result = ctx.evaluate(body, { ...ctx, cwd, depth: ctx.depth + 1 });
    if (result.decision !== "allow") return result;
  }
  return null;
}

function carriesSubstitution(token: Token): boolean {
  return typeof token === "string" && token.includes(SUBSTITUTION_WORD);
}

export function markVariable(name: string): string | undefined {
  return name ? `${VARIABLE_MARK}${name}${VARIABLE_MARK}` : undefined;
}

function markedNames(token: Token): string[] {
  return typeof token === "string" ? [...token.matchAll(MARKED_NAME)].map((match) => match[1]) : [];
}

function carriesVariable(token: string): boolean {
  return token.includes(VARIABLE_MARK);
}

export function isOpaqueWord(value: string): boolean {
  return value.includes(VARIABLE_MARK) || value.includes(SUBSTITUTION_WORD);
}

function outputCarrier(taintedNames: Set<string>): (token: Token) => boolean {
  return (token) => carriesSubstitution(token) || markedNames(token).some((name) => taintedNames.has(name) || !PLAIN_NAME.test(name));
}

function namesAssignedAnywhere(command: string): string[] {
  return [...command.matchAll(ASSIGNMENT_IN_TEXT)].map((match) => match[1]);
}

function classifyAssignment(names: string[], env: NodeJS.ProcessEnv): Classification {
  return names.some((name) => SHELL_BEHAVIOUR_NAMES.has(name) || env[name] !== undefined) ? "unknown" : "safe";
}

function withSubstitutedOutput(seg: Segment, plain: Classification, carriesOutput: (token: Token) => boolean): Classification {
  if (plain === "deny" || !seg.some(carriesOutput)) return plain;
  if (carriesOutput(seg[0])) return "unknown";
  const root = normalizeRoot(seg[0]);
  return plain === "safe" && typeof root === "string" && INERT_ROOTS.has(root) ? "safe" : "unknown";
}

function isClobberPipe(token: ParseEntry | undefined): boolean {
  return typeof token === "object" && "op" in token && token.op === "|";
}

function redirectTarget(next: ParseEntry | undefined, split: Split): number {
  split.sawWriteRedirect = true;
  if (typeof next === "string") {
    split.redirectTargets.push(next);
    return 1;
  }
  split.redirectTargets.push(null);
  return 0;
}

export function splitIntoSegments(tokens: ParseEntry[]): Split {
  const split: Split = { segments: [], sawWriteRedirect: false, sawBackground: false, redirectTargets: [] };
  let current: Segment = [];
  const endSegment = (): void => {
    if (current.length) split.segments.push(current);
    current = [];
  };
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    if (typeof tok !== "object" || !("op" in tok) || !tok.op) {
      current.push(tok);
      continue;
    }
    if (tok.op === "(" || tok.op === ")") continue;
    if (tok.op === ">&") {
      const next = tokens[i + 1];
      if ((typeof next === "string" && /^\d+$/.test(next)) || next === DISCARD_TARGET) i++;
      else i += redirectTarget(next, split);
      continue;
    }
    if (tok.op === "&") {
      split.sawBackground = true;
      endSegment();
      continue;
    }
    if (WRITE_REDIRECT_OPS.has(tok.op)) {
      if (tok.op === ">" && isClobberPipe(tokens[i + 1])) i++;
      const target = tokens[i + 1];
      if (target === DISCARD_TARGET) i++;
      else i += redirectTarget(target, split);
      continue;
    }
    if (CHAIN_OPS.has(tok.op)) endSegment();
  }
  endSegment();
  return split;
}

export function nodePath(p: string): string {
  const msys = /^\/([A-Za-z])(\/|$)/.exec(p);
  return msys ? `${msys[1]}:${p.slice(2) || "/"}` : p;
}

export function applyCd(seg: Segment, currentCwd: string | null): string | null {
  const target = seg[1];
  if (seg.length !== 2 || typeof target !== "string") return null;
  if (target === "-" || carriesVariable(target)) return null;
  return currentCwd ? resolve(currentCwd, nodePath(target)) : null;
}

export function textClassifier(platform: NodeJS.Platform): ClassifyText {
  const classifyText: ClassifyText = (text, cwd, depth) => {
    let innerTokens: ParseEntry[];
    try {
      innerTokens = parse(text);
    } catch {
      return "unknown";
    }
    if (hasHiddenExecution(text)) return "unknown";
    const { segments, sawWriteRedirect, sawBackground } = splitIntoSegments(innerTokens);
    if (!segments.length) return "unknown";
    if (sawWriteRedirect || sawBackground) return "unknown";
    const results = segments.map((seg) => classifySegment(seg, { cwd, depth: depth + 1, hookRoot: null, platform, classifyText }));
    if (results.includes("deny")) return "deny";
    if (results.every((r) => r === "safe")) return "safe";
    return "unknown";
  };
  return classifyText;
}

export function segmentScope(cwd: string | null, ctx: GuardContext): SegmentScope {
  return { cwd, depth: 0, hookRoot: ctx.root, platform: ctx.platform, classifyText: textClassifier(ctx.platform) };
}

function readBash(command: string, ctx: GuardContext): Reading<SubstitutionState> | Judgement {
  const text = shellText(command);
  if (!text) return fallThrough("unterminated-heredoc");
  if (text.command.includes(VARIABLE_MARK)) return fallThrough("variable-mark");
  if (hasOpaqueQuotedParameter(text.command)) return fallThrough("hidden-execution");
  const inheritedTaint = ctx.taintedNames ?? [];
  const bodyCtx = { ...ctx, taintedNames: [...inheritedTaint, ...namesAssignedAnywhere(text.command)] };
  const substituted = substituteCommands(text.command, bodyCtx);
  if (substituted.denial) return substituted.denial;
  const hiddenExecution = hasHiddenExecution(outsideSingleQuotes(substituted.command)) || hasHiddenExecution(text.expanded);
  let tokens: ParseEntry[];
  try {
    tokens = parse(substituted.command, markVariable);
  } catch {
    return fallThrough("unparsable");
  }
  const split = splitIntoSegments(tokens);
  if (!split.segments.length) return fallThrough("no-segments");
  const taintedNames = new Set([LAST_ARGUMENT, ...inheritedTaint]);
  return { ...split, command, hiddenExecution, state: { bodies: substituted.bodies, bodyCtx, taintedNames, carriesOutput: outputCarrier(taintedNames) } };
}

export const bashDialect: Dialect<SubstitutionState> = {
  name: "bash",
  read: readBash,
  classify: ({ seg, hit, cwd, startCwd }, { state }, ctx) => {
    const unallowed = cwd !== startCwd && seg.some(carriesSubstitution) ? recheckBodies(state.bodies, cwd, state.bodyCtx) : null;
    if (unallowed?.decision === "deny") return unallowed;
    const { assignments, command } = leadingAssignments(seg);
    const prefixNames = assignments.map(({ name }) => name);
    const onlyAssignments = !command.length;
    const plain = hit ? "safe" : classifySegment(command, segmentScope(cwd, ctx));
    const judged = onlyAssignments
      ? classifyAssignment(prefixNames, ctx.env)
      : prefixNames.length
        ? classifyPrefixedCommand(plain)
        : withSubstitutedOutput(seg, plain, state.carriesOutput);
    if (onlyAssignments) for (const name of prefixNames) state.taintedNames.add(name);
    return unallowed ? "unknown" : judged;
  },
  cdTarget: (seg, cwd) => (normalizeRoot(seg[0]) === "cd" ? { to: applyCd(seg, cwd) } : null),
  allows: true,
  hints: { escalate: ESCALATE_HINT, denial: () => DESTRUCTIVE_DENIAL },
};
