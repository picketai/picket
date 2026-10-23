import { carriesMarker, leadingAssignments, withoutMarker } from "../../../shared/escalation.mts";
import { maskEnvValues } from "../../../shared/drive-log.mts";
import { judgeEscalation, logEscalation, markerReason } from "./escalation.mts";
import { codeWriteDenial, codeWriteIn, codeWriteInside, codeWriteTarget, isSpawnedAgent, KERNEL_MENTION, leadOnlyInside, leadOnlyRefusal, wrappedVerbCheck } from "./payloads.mts";
import { decide, fallThrough, isSanctionedLogSink, LOG_SINK_DIR, type Classification, type Dialect, type GuardContext, type Judgement, type Reading, type Refusal, type Segment } from "./rules.mts";
import { redirectSource, sourceCheck, sourceDenial } from "./sources.mts";

const ALLOW_REASON = `guard.bash: every sub-command is read-only/inspection or a bare picket call that wraps no command, with no hidden execution and no write redirection outside the sanctioned ${LOG_SINK_DIR} log sink.`;

export function isEscalating(segments: Segment[], ctx: GuardContext): boolean {
  return ctx.depth === 0 && segments.some(carriesMarker);
}

function refusalLogger(rawCommand: string, segments: Segment[], ctx: GuardContext): (why: string) => void {
  if (!isEscalating(segments, ctx)) return () => {};
  return (why) => logEscalation(maskEnvValues(withoutMarker(rawCommand)), markerReason(segments), ctx, { outcome: "denied", why });
}

function writesOnlyToLogSinks(command: string, targets: (string | null)[]): boolean {
  return !/\$(?!\?)/.test(command) && targets.length > 0 && targets.every(isSanctionedLogSink);
}

function allowsAll(classifications: Classification[]): boolean {
  const inCompound = classifications.length > 1;
  return classifications.every((c) => c === "safe" || (c === "kernel" && inCompound));
}

export function judgeSegments(reading: Reading<unknown>, ctx: GuardContext, dialect: Dialect<unknown>): Judgement {
  const { command, segments } = reading;
  const { cwd, root, sources: roots, platform } = ctx;
  const logRefusal = refusalLogger(command, segments, ctx);
  const refuse = ({ why, reason }: Refusal): Judgement => {
    logRefusal(why);
    return decide("deny", reason);
  };
  const classifications: Classification[] = [];
  const cwdsSeen: (string | null)[] = [cwd];
  let effCwd: string | null = cwd;
  let codeWrite: string | null = null;
  const agent = ctx.escalation.agent;
  const mentionsKernel = KERNEL_MENTION.test(command);
  for (const seg of segments) {
    const { hit, refusal } = sourceCheck(seg, effCwd, roots, platform);
    if (refusal) return refuse(refusal);
    const leadOnly = leadOnlyRefusal(seg, agent) ?? leadOnlyInside(leadingAssignments(seg).command, agent, mentionsKernel);
    if (leadOnly) return refuse(leadOnly);
    codeWrite ??= codeWriteIn(seg, [effCwd], root) ?? codeWriteInside(leadingAssignments(seg).command, [effCwd], root);
    const judged = dialect.classify({ seg, hit, cwd: effCwd, startCwd: cwd }, reading, ctx);
    if (typeof judged !== "string") return judged;
    classifications.push(judged);
    const cd = dialect.cdTarget(seg, effCwd);
    if (cd) {
      effCwd = cd.to;
      cwdsSeen.push(effCwd);
    }
    const wrapped = wrappedVerbCheck(seg, effCwd, roots, agent, platform);
    if (wrapped && "fallThrough" in wrapped) return fallThrough(wrapped.fallThrough);
    if (wrapped) return refuse(wrapped);
  }

  const redirectHit = roots.length && reading.sawWriteRedirect ? redirectSource(reading.redirectTargets, cwdsSeen, roots, platform) : null;
  if (redirectHit) return refuse({ why: "source", reason: sourceDenial(redirectHit, "a write redirect") });
  codeWrite ??= reading.redirectTargets.map((t) => codeWriteTarget(t, cwdsSeen, root)).find(Boolean) ?? null;
  if (codeWrite && isSpawnedAgent(agent)) {
    if (isEscalating(segments, ctx)) return judgeEscalation(command, segments, ["deny"], { ...reading, sawWriteRedirect: false }, ctx);
    return refuse(codeWriteDenial(codeWrite, dialect.hints.escalate));
  }
  if (isEscalating(segments, ctx)) return judgeEscalation(command, segments, classifications, reading, ctx);
  if (classifications.includes("deny")) return decide("deny", dialect.hints.denial(command));
  if (!dialect.allows) return fallThrough(`${dialect.name}:[${classifications.join(",")}]`);
  if (reading.hiddenExecution) return fallThrough("hidden-execution");
  if (reading.sawWriteRedirect && !writesOnlyToLogSinks(command, reading.redirectTargets)) return fallThrough("write-redirect");
  if (reading.sawBackground) return fallThrough("background");
  if (allowsAll(classifications)) return decide("allow", ALLOW_REASON);
  return fallThrough(`unknown-segments:[${classifications.join(",")}]`);
}

export function judgeCommand(command: string, ctx: GuardContext, dialect: Dialect<unknown>): Judgement {
  const read = dialect.read(command, ctx);
  return "segments" in read ? judgeSegments(read, ctx, dialect) : read;
}
