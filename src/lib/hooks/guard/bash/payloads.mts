import { isAbsolute, relative, resolve } from "node:path";
import { extOf, LANGS } from "../../../shared/comments.mjs";
import { leadingAssignments } from "../../../shared/escalation.mts";
import { stateRel } from "../../../shared/paths.mts";
import { kernelVerbStart, normalizeRoot } from "../../../shared/shell/kernel-call.mts";
import { readPowerShell } from "../../../shared/shell/powershell.mts";
import type { SourceRoot } from "../../../shared/sources/protection.mts";
import { parseArgs } from "../../../util/args.mts";
import { parse, type ParseEntry } from "../../../util/vendor/shell-quote-parse.mjs";
import { hasHiddenExecution, isOpaqueWord, markVariable, MAX_SUBSTITUTION_DEPTH, nodePath, shellText, splitIntoSegments, textClassifier } from "./bash.mts";
import { isLeadOnly, wrappedCommands } from "./kernel.mts";
import { classifySegment, type Refusal, type Segment, type Token } from "./rules.mts";
import { redirectSource, segmentSource, sourceAllowed, sourceDenial } from "./sources.mts";

type PayloadDialect = "sh" | "ps";
type TextPayload = { text: string; dialect: PayloadDialect };
type TailPayload = { tail: Segment; readsInput?: boolean };
type Payload = TextPayload | TailPayload;
type ParsedPayload = { segments: Segment[]; redirectTargets: (string | null)[] };
export type WrappedCheck = Refusal | { fallThrough: string } | null;

export const KERNEL_MENTION = /(?:^|[\s;&|(`'"=\\/])picket(?:\.mjs|\.cmd)?(?=$|[\s;&|)`'"])/i;

const SPAWNED_AGENTS = new Set(["analyst", "architect", "developer", "reviewer"]);
const HIDDEN_PAYLOAD_REFUSAL: Refusal = Object.freeze({
  why: "lead_only",
  reason: "guard.bash: a spawned agent's command runs a picket call inside a wrapper whose payload cannot be read (an expansion, an unparsable string, or a verb read from input); `picket waive` and `picket comment` are the lead's, so write the picket call out in full.",
});
const SHELL_PAYLOAD_ROOTS = new Set(["sh", "bash", "zsh", "ksh", "dash"]);
const POWERSHELL_HOSTS = new Set(["powershell", "pwsh"]);
const EXPRESSION_ROOTS = new Map<string, PayloadDialect>([["eval", "sh"], ["Invoke-Expression", "ps"], ["iex", "ps"]].map(([name, dialect]) => [name.toLowerCase(), dialect as PayloadDialect]));
const ARGV_TAIL_ROOTS = new Set(["xargs", "env", "nohup", "timeout", "watch", "command", "exec", "nice"]);
const SHELL_COMMAND_FLAG = /^-[a-z]*c[a-z]*$/;
const POWERSHELL_COMMAND_FLAG = /^-(c|command)$/i;
const CMD_RUN_FLAG = /^\/c$/i;
const STATE_PREFIX_REL = `${stateRel("")}/`.toLowerCase();
const POWERSHELL_WRITERS = new Set(["Set-Content", "sc", "Add-Content", "ac", "Out-File"].map((name) => name.toLowerCase()));
const POWERSHELL_PATH_PARAMS = /^-(path|filepath|literalpath)$/i;
const POWERSHELL_PATH_COLON = /^-(path|filepath|literalpath):(.+)$/i;
const POWERSHELL_VALUE_PARAMS = /^-(value|encoding|inputobject|width|stream)$/i;
const SED_SCRIPT_FLAGS = new Set(["-e", "--expression", "-f", "--file"]);
const WRAPPED_QUOTE_CHARS = 60;

export function isSpawnedAgent(agent: string | null): boolean {
  return agent !== null && SPAWNED_AGENTS.has(agent);
}

function stringWords(seg: readonly Token[]): string[] {
  return seg.map((t) => (typeof t === "string" ? t : ""));
}

function valueAfter(words: string[], flag: RegExp): string | null {
  const i = words.findIndex((w, k) => k > 0 && flag.test(w));
  return i > 0 && words[i + 1] ? words[i + 1] : null;
}

export function leadOnlyRefusal(seg: Segment, agent: string | null): Refusal | null {
  if (!isSpawnedAgent(agent)) return null;
  const start = kernelVerbStart(seg);
  if (start === null) return null;
  const verb = parseArgs(stringWords(seg.slice(start))).pos[0];
  if (typeof verb === "string" && (isOpaqueWord(verb) || /[$`]/.test(verb))) {
    return { why: "lead_only", reason: "guard.bash: a spawned agent writes its picket verb out in full; an expansion in the verb position could hide `picket waive` or `picket comment`, which only the lead runs after the user answers at the gate." };
  }
  if (!isLeadOnly(verb)) return null;
  return { why: "lead_only", reason: `guard.bash: \`picket ${verb}\` records the user's approval, so only the lead runs it after the user answers at the gate. The ${agent} proposes it on its block instead.` };
}

function textPayload(text: string | null, dialect: PayloadDialect): TextPayload | null {
  return text === null ? null : { text, dialect };
}

function metaPayload(seg: Segment): Payload | null {
  const words = stringWords(seg);
  const root = normalizeRoot(words[0] ?? "").toLowerCase();
  const expression = EXPRESSION_ROOTS.get(root);
  if (expression) return { text: words.slice(1).join(" "), dialect: expression };
  if (SHELL_PAYLOAD_ROOTS.has(root)) return textPayload(valueAfter(words, SHELL_COMMAND_FLAG), "sh");
  if (POWERSHELL_HOSTS.has(root)) return textPayload(valueAfter(words, POWERSHELL_COMMAND_FLAG), "ps");
  if (root === "cmd") {
    const i = words.findIndex((w) => CMD_RUN_FLAG.test(w));
    return i < 0 ? null : { tail: seg.slice(i + 1) };
  }
  return ARGV_TAIL_ROOTS.has(root) ? { tail: seg.slice(1), readsInput: root === "xargs" } : null;
}

function payloadParse(text: string, dialect: PayloadDialect): ParsedPayload | null {
  if (dialect === "ps") {
    const reading = readPowerShell(text);
    return reading && !reading.hiddenExecution ? { segments: reading.segments, redirectTargets: reading.redirectTargets } : null;
  }
  const shell = shellText(text);
  if (!shell || hasHiddenExecution(shell.command)) return null;
  try {
    const { segments, redirectTargets } = splitIntoSegments(parse(shell.command, markVariable));
    return { segments, redirectTargets };
  } catch {
    return null;
  }
}

function isOpaquePayload(payload: TextPayload, segments: Segment[] | null): segments is null {
  if (!segments) return true;
  if (/[$`]/.test(payload.text)) return true;
  return segments.some((s) => s.some((t) => typeof t === "string" && isOpaqueWord(t)));
}

function leadOnlyInTail({ tail, readsInput }: TailPayload, agent: string | null, mentionsKernel: boolean, depth: number): Refusal | null {
  for (let i = 0; i < tail.length; i++) {
    const rest = tail.slice(i);
    if (typeof rest[0] !== "string") continue;
    const start = kernelVerbStart(rest);
    if (start !== null) return leadOnlyRefusal(rest, agent) ?? (readsInput && !parseArgs(stringWords(rest.slice(start))).pos[0] ? HIDDEN_PAYLOAD_REFUSAL : null);
    if (metaPayload(rest)) return leadOnlyInside(rest, agent, mentionsKernel, depth + 1);
  }
  return null;
}

export function leadOnlyInside(seg: Segment, agent: string | null, mentionsKernel: boolean, depth = 0): Refusal | null {
  if (!isSpawnedAgent(agent) || depth > MAX_SUBSTITUTION_DEPTH) return null;
  const payload = metaPayload(seg);
  if (!payload) return null;
  if ("tail" in payload) return leadOnlyInTail(payload, agent, mentionsKernel, depth);
  const segments = payloadParse(payload.text, payload.dialect)?.segments ?? null;
  if (isOpaquePayload(payload, segments)) return mentionsKernel ? HIDDEN_PAYLOAD_REFUSAL : null;
  for (const inner of segments) {
    const found = leadOnlyRefusal(inner, agent) ?? leadOnlyInside(inner, agent, mentionsKernel, depth + 1);
    if (found) return found;
  }
  return null;
}

export function codeWriteTarget(target: string | null, cwds: (string | null)[], root: string): string | null {
  if (typeof target !== "string" || !target || isOpaqueWord(target) || /[$`*?]/.test(target)) return null;
  const p = nodePath(target);
  for (const base of isAbsolute(p) ? [null] : cwds.filter(Boolean)) {
    const rel = relative(root, base ? resolve(base, p) : resolve(p)).replaceAll("\\", "/");
    if (!rel || rel === ".." || rel.startsWith("../") || isAbsolute(rel)) continue;
    if (rel.toLowerCase().startsWith(STATE_PREFIX_REL)) continue;
    if (Object.hasOwn(LANGS, extOf(rel))) return rel;
  }
  return null;
}

function sedInPlaceFiles(words: string[]): string[] {
  if (!words.some((w) => w.startsWith("-i") || w === "--in-place" || w.startsWith("--in-place="))) return [];
  const positional: string[] = [];
  let scripted = false;
  for (let i = 1; i < words.length; i++) {
    if (SED_SCRIPT_FLAGS.has(words[i])) {
      scripted = true;
      i++;
    } else if (!words[i].startsWith("-")) positional.push(words[i]);
  }
  return scripted ? positional : positional.slice(1);
}

function powerShellWriterFiles(words: string[]): string[] {
  const attached = words.map((w) => POWERSHELL_PATH_COLON.exec(w)?.[2]).find(Boolean);
  if (attached) return [attached];
  const named = valueAfter(words, POWERSHELL_PATH_PARAMS);
  if (named) return [named];
  for (let i = 1; i < words.length; i++) {
    if (POWERSHELL_VALUE_PARAMS.test(words[i])) i++;
    else if (!words[i].startsWith("-")) return [words[i]];
  }
  return [];
}

function segmentWriteTargets(seg: Segment): string[] {
  const words = seg.filter((t): t is string => typeof t === "string");
  const root = normalizeRoot(words[0] ?? "").toLowerCase();
  if (root === "tee") return words.slice(1).filter((w) => !w.startsWith("-"));
  if (root === "sed") return sedInPlaceFiles(words);
  if (POWERSHELL_WRITERS.has(root)) return powerShellWriterFiles(words);
  return [];
}

export function codeWriteIn(seg: Segment, cwds: (string | null)[], root: string): string | null {
  return segmentWriteTargets(seg).map((t) => codeWriteTarget(t, cwds, root)).find(Boolean) ?? null;
}

function codeWriteInTail(tail: Segment, cwds: (string | null)[], root: string, depth: number): string | null {
  for (let i = 0; i < tail.length; i++) {
    const rest = tail.slice(i);
    if (typeof rest[0] !== "string") continue;
    const hit = codeWriteIn(rest, cwds, root) ?? (metaPayload(rest) ? codeWriteInside(rest, cwds, root, depth + 1) : null);
    if (hit) return hit;
  }
  return null;
}

export function codeWriteInside(seg: Segment, cwds: (string | null)[], root: string, depth = 0): string | null {
  if (depth > MAX_SUBSTITUTION_DEPTH) return null;
  const payload = metaPayload(seg);
  if (!payload) return null;
  if ("tail" in payload) return codeWriteInTail(payload.tail, cwds, root, depth);
  const parsed = payloadParse(payload.text, payload.dialect);
  if (!parsed) return null;
  for (const inner of parsed.segments) {
    const hit = codeWriteIn(inner, cwds, root) ?? codeWriteInside(inner, cwds, root, depth + 1);
    if (hit) return hit;
  }
  return parsed.redirectTargets.map((t) => codeWriteTarget(t, cwds, root)).find(Boolean) ?? null;
}

export function codeWriteDenial(rel: string, hint: string): Refusal {
  return { why: "code_write", reason: `guard.bash: ${rel} is code; a shell write skips guard.comments and guard.silenced. Write it with the Edit or Write tool. ${hint}` };
}

function parseWrapped(inner: string): ParseEntry[] | null {
  const innerText = shellText(inner);
  if (!innerText) return null;
  try {
    return parse(innerText.command);
  } catch {
    return null;
  }
}

export function wrappedVerbCheck(seg: Segment, cwd: string | null, roots: SourceRoot[], agent: string | null, platform: NodeJS.Platform): WrappedCheck {
  for (const inner of wrappedCommands(seg)) {
    if (hasHiddenExecution(inner)) return { fallThrough: "wrapped-hidden-execution" };
    const innerTokens = parseWrapped(inner);
    if (!innerTokens) return { fallThrough: "wrapped-unparsable" };
    const { segments: innerSegs, redirectTargets: innerTargets } = splitIntoSegments(innerTokens);
    const leadOnly = innerSegs.map((s) => leadOnlyRefusal(s, agent) ?? leadOnlyInside(s, agent, KERNEL_MENTION.test(inner))).find(Boolean);
    if (leadOnly) return leadOnly;
    const scope = { cwd, depth: 0, hookRoot: null, platform, classifyText: textClassifier(platform) };
    if (innerSegs.some((s) => classifySegment(leadingAssignments(s).command, scope) === "deny")) {
      return { why: "wrapped_verb", reason: `guard.bash: the command wrapped in a picket verb (${inner.slice(0, WRAPPED_QUOTE_CHARS)}) contains a destructive sub-command; run it directly so the permission prompt sees it.` };
    }
    if (roots.length) {
      const hit = innerSegs.map((s) => (sourceAllowed(s) ? null : segmentSource(s, cwd, roots, platform))).find(Boolean) ?? redirectSource(innerTargets, [cwd], roots, platform);
      if (hit) return { why: "source", reason: sourceDenial(hit, `the command wrapped in a picket verb (${inner.slice(0, WRAPPED_QUOTE_CHARS)}); run it directly so the permission prompt sees it`) };
    }
  }
  return null;
}
