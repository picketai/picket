import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { confirmRun, sha256Hex } from "../../../shared/data/confirm.mts";
import { planRun, type RunPlan } from "../../../shared/data/plan.mts";
import { maskEnvValues } from "../../../shared/drive-log.mts";
import { ASKING_MODES, commandKey, escalationMarker, leadingAssignments, MARKER, notRunBefore, POWERSHELL_MARKER_TEXT, recordEscalation, withoutMarker } from "../../../shared/escalation.mts";
import { readLedger } from "../../../shared/ledger.mts";
import { escalationAllowRules } from "../../../shared/saved-rules.mjs";
import { kernelVerbStart } from "../../../shared/shell/kernel-call.mts";
import { workId } from "../../../shared/work/files.mts";
import { currentItem } from "../../../shared/work/state.mts";
import { isOpaqueWord } from "./bash.mts";
import { isConfirmedCall } from "./kernel.mts";
import { decide, fallThrough, type Classification, type GuardContext, type Judgement, type ReadingFlags, type Segment } from "./rules.mts";

type Denied = { outcome: "denied"; why: string; cause: string };
type Verdict = { outcome: "ask"; why: null } | Denied;
type SavedRule = { rule: string; file: string };
type EscalationShape = { shapeProblem: string | null; reason: string | null };
type DialogInput = { mode: string | null; savedRules: SavedRule[]; refusedBefore: boolean };
type DataRunWords = { launcher: string[]; id: string; entry: string };

export type RewrittenAsk = Judgement & { updatedInput: { command: string } };

const ONE_COMMAND = "escalate one command, alone";
const DATA_RUN = ["data", "run"];
const DATA_RUN_SHAPE = "escalate data run as picket data run <id> <entry>, alone";
const DATA_RUN_ROUTE = "data run asks only in the default, acceptEdits and auto modes, through this marked command";
const CONFIRMATION_FLAG = "--confirmation";
const NONCE_BYTES = 32;
const POWERSHELL_TOOL = "PowerShell";
const PLAIN_BASH_WORD = /^[A-Za-z0-9_@%+=:,.\/-]+$/;
const PLAIN_POWERSHELL_WORD = /^[A-Za-z0-9_.:\\/-]+$/;

function readEscalation(segments: Segment[], { hiddenExecution, sawWriteRedirect, sawBackground }: ReadingFlags): EscalationShape {
  if (segments.length !== 1 || hiddenExecution || sawWriteRedirect || sawBackground) return { shapeProblem: ONE_COMMAND, reason: null };
  const marker = escalationMarker(segments[0], { isOpaque: isOpaqueWord });
  if (marker !== null && "invalid" in marker) return { shapeProblem: `${ONE_COMMAND}: ${marker.invalid}`, reason: null };
  return { shapeProblem: null, reason: marker?.reason ?? null };
}

function dialogVerdict({ mode, savedRules, refusedBefore }: DialogInput): Verdict {
  if (!ASKING_MODES.has(mode ?? "")) return { outcome: "denied", why: "mode", cause: `escalation is off in permission mode ${mode ?? "unknown"}, where the dialog is not proven` };
  if (savedRules.length) {
    const { rule, file } = savedRules[0];
    return { outcome: "denied", why: "saved_rule", cause: `the saved allow rule ${rule} in ${file} could approve it without a dialog; remove the rule` };
  }
  if (refusedBefore) return { outcome: "denied", why: "refused_before", cause: "the earlier ask for this command in this session did not run (refused, interrupted or failed), so it is not asked again" };
  return { outcome: "ask", why: null };
}

function dialogInput(command: string, ctx: GuardContext): DialogInput {
  const { root, escalation } = ctx;
  const passedMode = ASKING_MODES.has(escalation.mode ?? "");
  const savedRules: SavedRule[] = passedMode ? escalationAllowRules({ root, home: escalation.home, tool: ctx.tool, command }) : [];
  const refusedBefore = passedMode && !savedRules.length && notRunBefore(readLedger(root).rows, escalation.session, commandKey(command));
  return { mode: escalation.mode, savedRules, refusedBefore };
}

function escalationVerdict(command: string, shapeProblem: string | null, commandClass: Classification | undefined, ctx: GuardContext): Verdict | null {
  if (shapeProblem) return { outcome: "denied", why: "shape", cause: shapeProblem };
  if (commandClass !== "deny") return null;
  return dialogVerdict(dialogInput(command, ctx));
}

export function logEscalation(command: string, rawReason: string | null, ctx: GuardContext, { outcome, why }: { outcome: Verdict["outcome"]; why: string | null }): string | null {
  const { root, escalation } = ctx;
  const reason = rawReason === null ? null : maskEnvValues(rawReason);
  const work_id = currentItem(root, { session: escalation.session ?? null })?.id ?? null;
  recordEscalation(root, { session: escalation.session, outcome, why, command, reason, agent: escalation.agent, work_id }, ctx.now());
  return reason;
}

export function markerReason(segments: Segment[]): string | null {
  if (segments.length !== 1) return null;
  const marker = escalationMarker(segments[0], { isOpaque: isOpaqueWord });
  return marker !== null && "reason" in marker ? marker.reason : null;
}

export function dataRunWords(segment: Segment): DataRunWords | null {
  const { command } = leadingAssignments(segment);
  const start = kernelVerbStart(command);
  if (start === null || !command.every((word) => typeof word === "string")) return null;
  const words = command as string[];
  const [verb, subverb, id, entry, ...rest] = words.slice(start);
  if (verb !== DATA_RUN[0] || subverb !== DATA_RUN[1] || id === undefined || entry === undefined || rest.length) return null;
  if (id.startsWith("-") || entry.startsWith("-")) return null;
  return { launcher: words.slice(0, start), id, entry };
}

export function updatedInputOf(judgement: Judgement): { command: string } | undefined {
  return "updatedInput" in judgement ? (judgement as RewrittenAsk).updatedInput : undefined;
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function bashQuote(text: string): string {
  return `'${text.replaceAll("'", "'\\''")}'`;
}

function powerShellQuote(text: string): string {
  return `'${text.replaceAll("'", "''")}'`;
}

function confirmedCommand({ launcher, id, entry }: DataRunWords, reason: string, nonce: string, tool: string): string {
  const words = [...launcher, ...DATA_RUN, id, entry];
  const tail = `${CONFIRMATION_FLAG} ${nonce}`;
  if (tool === POWERSHELL_TOOL) {
    const quoted = words.map((word) => (PLAIN_POWERSHELL_WORD.test(word) ? word : powerShellQuote(word)));
    const call = PLAIN_POWERSHELL_WORD.test(words[0]) ? quoted.join(" ") : `& ${quoted.join(" ")}`;
    return `${POWERSHELL_MARKER_TEXT} = ${powerShellQuote(reason)}; ${call} ${tail}`;
  }
  const quoted = words.map((word) => (PLAIN_BASH_WORD.test(word) ? word : bashQuote(word)));
  return `${MARKER}=${bashQuote(reason)} ${quoted.join(" ")} ${tail}`;
}

function dataRunAskReason(plan: RunPlan, reason: string | null, agent: string | null): string {
  const shown = [`entry ${plan.entry}`, `file ${plan.path}`, `sha256 ${plan.sha256}`, `server ${plan.target.server}`, `database ${plan.target.database}`, `approved ${plan.approval.at}`].join(" · ");
  return `guard.bash: data run by ${agent ?? "main"}: "${reason}". ${shown}. Approving runs this snapshot once; nothing carries over.`;
}

function plannedRun(words: DataRunWords, ctx: GuardContext): RunPlan | Denied {
  try {
    return planRun(ctx.root, ctx.env, workId(words.id), words.entry);
  } catch (error) {
    return { outcome: "denied", why: "data_plan", cause: messageOf(error) };
  }
}

function confirmedAsk(plan: RunPlan, words: DataRunWords, rawReason: string, ctx: GuardContext): { command: string } | Denied {
  const nonce = randomBytes(NONCE_BYTES).toString("hex");
  try {
    confirmRun(ctx.root, plan, readFileSync(plan.abs), ctx.escalation.session, sha256Hex(nonce), ctx.now());
  } catch (error) {
    return { outcome: "denied", why: "data_plan", cause: messageOf(error) };
  }
  return { command: confirmedCommand(words, rawReason, nonce, ctx.tool) };
}

function judgeDataRun(rawCommand: string, segments: Segment[], flags: ReadingFlags, ctx: GuardContext): Judgement {
  const command = maskEnvValues(withoutMarker(rawCommand));
  const { shapeProblem, reason: rawReason } = readEscalation(segments, flags);
  const refuse = (denied: Denied): Judgement => {
    logEscalation(command, rawReason, ctx, denied);
    return decide("deny", `guard.bash: ${denied.cause}; ${DATA_RUN_ROUTE}`);
  };
  const words = shapeProblem === null ? dataRunWords(segments[0]) : null;
  if (shapeProblem !== null || words === null || rawReason === null) return refuse({ outcome: "denied", why: "shape", cause: shapeProblem ?? DATA_RUN_SHAPE });
  const plan = plannedRun(words, ctx);
  if ("outcome" in plan) return refuse(plan);
  const verdict = dialogVerdict(dialogInput(command, ctx));
  if (verdict.outcome === "denied") return refuse(verdict);
  const confirmed = confirmedAsk(plan, words, rawReason, ctx);
  if ("outcome" in confirmed) return refuse(confirmed);
  const reason = logEscalation(command, rawReason, ctx, verdict);
  const asked: RewrittenAsk = { ...decide("ask", dataRunAskReason(plan, reason, ctx.escalation.agent)), updatedInput: confirmed };
  return asked;
}

export function judgeEscalation(rawCommand: string, segments: Segment[], classifications: Classification[], flags: ReadingFlags, ctx: GuardContext): Judgement {
  if (segments.some(isConfirmedCall)) return judgeDataRun(rawCommand, segments, flags, ctx);
  const { escalation } = ctx;
  const command = maskEnvValues(withoutMarker(rawCommand));
  const { shapeProblem, reason: rawReason } = readEscalation(segments, flags);
  const verdict = escalationVerdict(command, shapeProblem, classifications[0], ctx);
  if (!verdict) return fallThrough("escalation-not-destructive");
  const reason = logEscalation(command, rawReason, ctx, verdict);
  if (verdict.outcome === "ask") {
    return decide("ask", `guard.bash: escalation by ${escalation.agent ?? "main"}: "${reason}". Approving runs this one command once; nothing carries over.`);
  }
  return decide("deny", `guard.bash: ${verdict.cause}; run it yourself: ! ${command}`);
}
