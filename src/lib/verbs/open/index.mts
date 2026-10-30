import { action, done, refuse } from "../../shared/action.mts";
import { admit, overridesAdmission } from "../../shared/admission/admit.mts";
import { NO_LANE, type Admission } from "../../shared/admission/lane.mts";
import { loadConfig } from "../../shared/config.mjs";
import { configRel, WORK_DIR } from "../../shared/paths.mts";
import { recordBases } from "../../shared/repos.mts";
import { writeIntake } from "../../shared/sources/intake.mts";
import { liveLookup } from "../../shared/sources/places.mts";
import { resolveReferences, type Resolution } from "../../shared/sources/resolve.mts";
import { isReachable, type Source } from "../../shared/sources/source.mts";
import type { VerbSpec } from "../../shared/verb-spec.mts";
import { hasBriefHeading, withBrief, type Brief } from "../../shared/work/brief.mts";
import type { WorkId } from "../../shared/work/files.mts";
import { readNext, type NextView } from "../../shared/work/next-view.mts";
import { createItem, LANES, type Lane } from "../../shared/work/state.mts";
import { appendVerdict } from "../../shared/work/verdict-log.mts";
import { flag, str, UsageError, type Args } from "../../util/args.mts";
import { readText } from "../../util/io.mts";

export type Request = { text: string } | { file: string };
export type OpenInput = {
  lane: string;
  title: string;
  id: string | undefined;
  request: Request | null;
  brief: Brief | null;
  ticket: string | undefined;
  story: string | undefined;
  source: string | undefined;
  session: string | undefined;
  userLane: boolean;
};
export type Opened = { id: string; lane: string; dir: string; warnings: string[]; next: NextView } & Record<string, unknown>;

const STDIN = "-";
const EMPTY_REQUEST = 'open: the request is empty; pass the request text with --text "<request>" or drop the flag';
const USER_LANE = "user-lane";
const BRIEF_FLAGS: Record<keyof Brief, string> = { purpose: "purpose", in_scope: "in-scope", out_of_scope: "out-of-scope" };
const BRIEF_USAGE = "open needs --purpose, --in-scope and --out-of-scope together, each one non-empty line, and only with a request";
const UNFLAGGED_BRIEF = 'open: the request already holds a "## Brief" heading; pass --purpose, --in-scope and --out-of-scope so the saved brief is the one given, or remove the heading from the request';

function readFile(path: string): string {
  const text = readText(path);
  if (text === null) throw new Error(`open cannot read ${path}`);
  return text;
}

function requestText(request: Request | null): string | null {
  if (request === null) return null;
  const text = "text" in request ? request.text : readFile(request.file);
  if (!text) throw new Error(EMPTY_REQUEST);
  return text;
}

function storyResolution(story: string | null, sources: readonly Source[]): Resolution | null {
  if (story === null || !sources.some(isReachable)) return null;
  return resolveReferences(story, sources, liveLookup());
}

function notFoundMessage(failures: readonly string[]): string {
  return `source references not found:\n${failures.map((f) => `- ${f}`).join("\n")}`;
}

function sourceWarnings(story: string | null, sources: readonly Source[]): string[] {
  if (story === null || sources.some(isReachable)) return [];
  const why = sources.map((s) => `${s.name}: ${s.reason}`).join("; ") || `none declared in ${configRel()}`;
  return [`story.md saved without snapshots: no reachable source (${why})`];
}

function isLane(lane: string): lane is Lane {
  return (LANES as readonly string[]).includes(lane);
}

function overriddenAdmission(root: string, lane: string, request: string | null): Admission | null {
  if (request === null || !isLane(lane)) return null;
  const admission = admit(root, request);
  return overridesAdmission(lane, admission.lane) ? admission : null;
}

function laneRefusal(asked: string, { lane, reasons }: Admission): string {
  const remedy = lane === NO_LANE ? "follow admit's reason" : `open it with --lane ${lane}`;
  return `open: admit answers ${lane} for this request (${reasons.join("; ")}), not ${asked}; ${remedy}, or add --${USER_LANE} only on the user's word`;
}

function recordUserLane(root: string, id: WorkId, admission: Admission, at: Date): void {
  appendVerdict(root, id, { agent: "user", verdict: USER_LANE, phase: null, scope: null, through: null, admitted: admission.lane }, at);
}

export const openItem = action<OpenInput, Opened>(async (input, { root, session, now }) => {
  const request = requestText(input.request);
  if (request !== null && !input.brief && hasBriefHeading(request)) return refuse(UNFLAGGED_BRIEF);
  const overridden = overriddenAdmission(root, input.lane, request);
  if (overridden && !input.userLane) return refuse(laneRefusal(input.lane, overridden), { admitted: overridden.lane, reasons: overridden.reasons });
  const story = input.story === undefined ? null : readFile(input.story);
  const sources = (loadConfig(root) as unknown as { sources: Source[] }).sources;
  const resolution = storyResolution(story, sources);
  if (resolution?.failures.length) return refuse(notFoundMessage(resolution.failures), { failures: resolution.failures });
  const at = now();
  const saved = request !== null && input.brief ? withBrief(request, input.brief) : request;
  const created = createItem(root, { lane: input.lane, title: input.title, id: input.id, source: input.ticket ?? input.source, request: saved, story, session: input.session ?? session }, at);
  if (overridden) recordUserLane(root, created.id, overridden, at);
  if (resolution) writeIntake(root, created.id, resolution);
  recordBases(root, created.id);
  return done({ ...created, dir: `${WORK_DIR}/${created.id}`, warnings: sourceWarnings(story, sources), next: readNext(root, created.id, input.session ?? session) });
});

function parseRequest(args: Args): Request | null {
  const text = str(args, "text");
  if (text !== undefined) {
    if (!text) throw new UsageError(EMPTY_REQUEST);
    return { text };
  }
  const file = str(args, "request");
  if (file === undefined) return null;
  if (file !== STDIN) return { file };
  const piped = args.stdin();
  if (!piped) throw new UsageError(EMPTY_REQUEST);
  return { text: piped };
}

function isBriefLine(value: string | undefined): value is string {
  return value !== undefined && value.trim() !== "" && !/[\r\n]/.test(value);
}

function parseBrief(args: Args, request: Request | null): Brief | null {
  const [purpose, in_scope, out_of_scope] = Object.values(BRIEF_FLAGS).map((name) => str(args, name));
  if (purpose === undefined && in_scope === undefined && out_of_scope === undefined) return null;
  if (request === null || !isBriefLine(purpose) || !isBriefLine(in_scope) || !isBriefLine(out_of_scope)) throw new UsageError(BRIEF_USAGE);
  return { purpose: purpose.trim(), in_scope: in_scope.trim(), out_of_scope: out_of_scope.trim() };
}

function parseOpen(args: Args): OpenInput {
  const lane = str(args, "lane");
  const title = str(args, "title");
  if (!lane || !title) throw new UsageError("open needs --lane and --title");
  const ticket = str(args, "ticket");
  const story = str(args, "story");
  if ((ticket === undefined) !== (story === undefined)) throw new UsageError("open needs --ticket <KEY> and --story <file> together");
  const request = parseRequest(args);
  return { lane, title, id: str(args, "id"), request, brief: parseBrief(args, request), ticket, story, source: str(args, "source"), session: str(args, "session"), userLane: flag(args, USER_LANE) };
}

function renderOpen(v: Opened): string {
  return `created ${v.dir} (${v.lane}) · next: ${v.next.action} by ${v.next.actor}${v.warnings.map((w) => `\nWARNING: ${w}`).join("")}`;
}

export const verb: VerbSpec<OpenInput, Opened> = {
  usage: 'open --lane <fast|order|design|research> --title "<title>" [--text "<request>" | --request <file|->] [--purpose "<p>" --in-scope "<s>" --out-of-scope "<o>"] [--ticket <KEY> --story <file>] [--id <id>] [--user-lane]',
  output: "json",
  parse: parseOpen,
  run: openItem,
  render: renderOpen,
};
