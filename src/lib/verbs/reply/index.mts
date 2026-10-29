import { action, done, refuse, Refused, type Outcome } from "../../shared/action.mts";
import { securityPaths } from "../../shared/config.mjs";
import type { Context } from "../../shared/context.mts";
import { route } from "../../shared/route/route.mts";
import type { VerbSpec } from "../../shared/verb-spec.mts";
import type { SendView } from "../../shared/views.mts";
import { appendComment, appendWaiver } from "../../shared/work/approvals.mts";
import { blockField, COMMENT_SEPARATOR, commentProposal, parseBlock, proposals, readBlock, WAIVER_SEPARATOR, waiverProposal } from "../../shared/work/block.mts";
import { workId, type WorkId } from "../../shared/work/files.mts";
import { nextStep, type NextStep } from "../../shared/work/next-step.mts";
import { readNext, type NextView } from "../../shared/work/next-view.mts";
import { appendReply } from "../../shared/work/replies.mts";
import { messageTo, renderNextStep } from "../../shared/work/send.mts";
import { readSnapshot, type WorkSnapshot } from "../../shared/work/snapshot.mts";
import { isSessionId, writeState, type Status, type WorkState } from "../../shared/work/state.mts";
import { UsageError, type Args } from "../../util/args.mts";
import { GATE_ACTIONS, matchReply, PUBLISH_REPLY, type Matched, type Proposals } from "./table.mts";

export type ReplyInput = { id: WorkId; reply: string };
export type ReplyResult = { id: WorkId; reply: string; applied: string[]; next: NextView; send: SendView[] };

type Effect = { applied: string[]; send: SendView | null; fresh: boolean };
type Gate = { snap: WorkSnapshot; step: NextStep; phase: number | null; session: string | null; ctx: Context };

const FRESH_DEVELOPER = "[c] continue with a fresh developer";
const REDESIGN_IN_DESIGN_LANE = "abandoned; open the same request in the design lane";
const RESEARCH_REPLY = "on a research item reply takes p; a, d and x are the lead's (picket:researching)";
const NO_PROPOSALS: Proposals = { comments: [], waivers: [] };

function blockProposals(root: string, id: WorkId, phase: number | null): Proposals {
  if (phase === null) return NO_PROPOSALS;
  const block = parseBlock(readBlock(root, id, phase));
  return { comments: proposals(blockField(block, "Comments"), COMMENT_SEPARATOR), waivers: proposals(blockField(block, "Waivers"), WAIVER_SEPARATOR) };
}

function effect(applied: string[], send: SendView | null = null, fresh = false): Effect {
  return { applied, send, fresh };
}

function developerMessage({ snap, phase, session }: Gate, line: string): SendView {
  return messageTo(snap, "developer", session, [`work: ${snap.state.id}`, `phase: ${phase}`, line]);
}

function routeUser({ snap, phase, session, ctx }: Gate, verdict: "approved" | "rejected", extra: { through?: number; reason?: string; publish?: boolean }): string[] {
  return route({ id: snap.state.id, verdict, agent: "user", phase: phase ?? undefined, session, ...extra }, ctx).applied;
}

function setStatus({ snap, ctx }: Gate, status: Status): string[] {
  const { blocked_reason: _dropped, ...rest } = snap.state;
  writeState(ctx.root, { ...rest, status }, ctx.now());
  return [`status=${status}`];
}

function keepComment(gate: Gate, proposal: string): Effect {
  const comment = commentProposal(proposal);
  if (!comment) throw new Refused(`comment proposal "${proposal}" is not <path>:<line> "<text>"`);
  appendComment(gate.ctx.root, gate.snap.state.id, comment, { cwd: gate.ctx.cwd, now: gate.ctx.now() });
  const line = `comment approved: ${comment.path}:${comment.line} "${comment.text}"`;
  return effect([line], developerMessage(gate, line));
}

function waive(gate: Gate, proposal: string): Effect {
  const waiver = waiverProposal(proposal);
  if (!waiver) throw new Refused(`waiver proposal "${proposal}" is neither <path>:<line> "<text>" because <why> nor <path> deleted because <why>`);
  appendWaiver(gate.ctx.root, gate.snap.state.id, waiver, { cwd: gate.ctx.cwd, now: gate.ctx.now() });
  const line = waiver.deleted ? `waiver approved: ${waiver.path} deleted` : `waiver approved: ${waiver.path} "${waiver.text}"`;
  return effect([line], developerMessage(gate, line));
}

function redesign(gate: Gate): Effect {
  const { snap, session } = gate;
  if (snap.state.lane !== "design") return effect([...setStatus(gate, "abandoned"), REDESIGN_IN_DESIGN_LANE]);
  const reason = snap.state.blocked_reason ?? gate.step.detail;
  return effect(setStatus(gate, "open"), messageTo(snap, "architect", session, [`work: ${snap.state.id}`, `amend: ${reason}`]));
}

function applyMatched(gate: Gate, matched: Matched, found: Proposals): Effect {
  switch (matched.kind) {
    case "approve":
      return effect(routeUser(gate, "approved", { through: matched.through }));
    case "reject":
      return effect(routeUser(gate, "rejected", { reason: matched.why }), developerMessage(gate, `rejected: ${matched.why}`));
    case "keep":
      return keepComment(gate, found.comments[matched.n - 1]);
    case "waive":
      return waive(gate, found.waivers[matched.n - 1]);
    case "continue":
      return effect(setStatus(gate, "open"), null, "options" in gate.step && gate.step.options.includes(FRESH_DEVELOPER));
    case "redesign":
      return redesign(gate);
    case "abandon":
      return effect(setStatus(gate, "abandoned"));
    case "publish":
      return effect(routeUser(gate, "approved", { publish: true }));
  }
}

function optionsOf(step: NextStep): string[] {
  return "options" in step ? step.options : [];
}

function unmatched(reply: string, step: NextStep, { id, lane, title }: WorkState): Outcome<never> {
  if (lane === "research" && PUBLISH_REPLY.test(reply.trim())) {
    return refuse(`publish is not offered: the title "${title}" gives no file name; rename the item with picket set ${id} --title, then reply p`, { options: optionsOf(step) });
  }
  if (lane === "research") return refuse(RESEARCH_REPLY, { options: optionsOf(step) });
  return refuse(`"${reply}" matches no option at ${step.action}; options: ${optionsOf(step).join(" · ")}`, { options: optionsOf(step) });
}

export const applyReply = action<ReplyInput, ReplyResult>(async ({ id, reply }, ctx) => {
  const snap = readSnapshot(ctx.root, id);
  const { lane } = snap.state;
  const step = nextStep(snap, securityPaths(ctx.root));
  if (!GATE_ACTIONS.includes(step.action)) return refuse(`${id} is at ${step.action}, not a gate; reply applies at ${GATE_ACTIONS.join(", ")}`, { action: step.action });
  const phase = "phase" in step ? step.phase : null;
  const found = lane === "research" ? NO_PROPOSALS : blockProposals(ctx.root, id, phase);
  const matched = matchReply(reply, step, found, lane);
  if (!matched) return unmatched(reply, step, snap.state);
  const session = isSessionId(ctx.session) ? ctx.session : null;
  const result = applyMatched({ snap, step, phase, session, ctx }, matched, found);
  appendReply(ctx.root, id, { ...(session ? { session } : {}), action: step.action, phase, reply: reply.trim(), ...(result.fresh ? { fresh: true as const } : {}) }, ctx.now());
  const next = readNext(ctx.root, id, session);
  return done({ id, reply: reply.trim(), applied: result.applied, next, send: result.send ? [result.send] : next.send });
});

function parseReply(args: Args): ReplyInput {
  const [id, ...words] = args.pos;
  if (!id || words.length === 0) throw new UsageError("reply needs <id> and the user's reply");
  return { id: workId(id), reply: words.join(" ") };
}

function renderReply(v: ReplyResult): string {
  return [...v.applied, renderNextStep(v.next, v.send)].join("\n");
}

export const verb: VerbSpec<ReplyInput, ReplyResult> = {
  usage: "reply <id> <reply...>",
  output: "json",
  parse: parseReply,
  run: applyReply,
  render: renderReply,
};
