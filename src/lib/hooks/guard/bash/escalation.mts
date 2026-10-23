import { maskEnvValues } from "../../../shared/drive-log.mts";
import { ASKING_MODES, commandKey, escalationMarker, notRunBefore, recordEscalation, withoutMarker } from "../../../shared/escalation.mts";
import { readLedger } from "../../../shared/ledger.mts";
import { escalationAllowRules } from "../../../shared/saved-rules.mjs";
import { currentItem } from "../../../shared/work/state.mts";
import { isOpaqueWord } from "./bash.mts";
import { decide, fallThrough, type Classification, type GuardContext, type Judgement, type ReadingFlags, type Segment } from "./rules.mts";

type Outcome = "ask" | "denied";
type Verdict = { outcome: Outcome; why: string | null; cause?: string };
type SavedRule = { rule: string; file: string };
type EscalationShape = { shapeProblem: string | null; reason: string | null };
type VerdictInput = { shapeProblem: string | null; commandClass: Classification | undefined; mode: string | null; savedRules: SavedRule[]; refusedBefore: boolean };

const ONE_COMMAND = "escalate one command, alone";

function readEscalation(segments: Segment[], { hiddenExecution, sawWriteRedirect, sawBackground }: ReadingFlags): EscalationShape {
  if (segments.length !== 1 || hiddenExecution || sawWriteRedirect || sawBackground) return { shapeProblem: ONE_COMMAND, reason: null };
  const marker = escalationMarker(segments[0], { isOpaque: isOpaqueWord });
  if (marker !== null && "invalid" in marker) return { shapeProblem: `${ONE_COMMAND}: ${marker.invalid}`, reason: null };
  return { shapeProblem: null, reason: marker?.reason ?? null };
}

function escalationVerdict({ shapeProblem, commandClass, mode, savedRules, refusedBefore }: VerdictInput): Verdict | null {
  if (shapeProblem) return { outcome: "denied", why: "shape", cause: shapeProblem };
  if (commandClass !== "deny") return null;
  if (!ASKING_MODES.has(mode ?? "")) return { outcome: "denied", why: "mode", cause: `escalation is off in permission mode ${mode ?? "unknown"}, where the dialog is not proven` };
  if (savedRules.length) {
    const { rule, file } = savedRules[0];
    return { outcome: "denied", why: "saved_rule", cause: `the saved allow rule ${rule} in ${file} could approve it without a dialog; remove the rule` };
  }
  if (refusedBefore) return { outcome: "denied", why: "refused_before", cause: "the earlier ask for this command in this session did not run (refused, interrupted or failed), so it is not asked again" };
  return { outcome: "ask", why: null };
}

export function logEscalation(command: string, rawReason: string | null, ctx: GuardContext, { outcome, why }: Pick<Verdict, "outcome" | "why">): string | null {
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

export function judgeEscalation(rawCommand: string, segments: Segment[], classifications: Classification[], flags: ReadingFlags, ctx: GuardContext): Judgement {
  const { root, escalation } = ctx;
  const command = maskEnvValues(withoutMarker(rawCommand));
  const { shapeProblem, reason: rawReason } = readEscalation(segments, flags);
  const commandClass = classifications[0];
  const passedMode = !shapeProblem && commandClass === "deny" && ASKING_MODES.has(escalation.mode ?? "");
  const savedRules: SavedRule[] = passedMode ? escalationAllowRules({ root, home: escalation.home, tool: ctx.tool, command }) : [];
  const refusedBefore = passedMode && !savedRules.length && notRunBefore(readLedger(root).rows, escalation.session, commandKey(command));
  const verdict = escalationVerdict({ shapeProblem, commandClass, mode: escalation.mode, savedRules, refusedBefore });
  if (!verdict) return fallThrough("escalation-not-destructive");
  const reason = logEscalation(command, rawReason, ctx, verdict);
  if (verdict.outcome === "ask") {
    return decide("ask", `guard.bash: escalation by ${escalation.agent ?? "main"}: "${reason}". Approving runs this one command once; nothing carries over.`);
  }
  return decide("deny", `guard.bash: ${verdict.cause}; run it yourself: ! ${command}`);
}
