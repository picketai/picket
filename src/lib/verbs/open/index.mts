import { action, done, refuse } from "../../shared/action.mts";
import { loadConfig } from "../../shared/config.mjs";
import { configRel, WORK_DIR } from "../../shared/paths.mts";
import { recordBases } from "../../shared/repos.mts";
import { writeIntake } from "../../shared/sources/intake.mts";
import { liveLookup } from "../../shared/sources/places.mts";
import { resolveReferences, type Resolution } from "../../shared/sources/resolve.mts";
import { isReachable, type Source } from "../../shared/sources/source.mts";
import type { VerbSpec } from "../../shared/verb-spec.mts";
import { readNext } from "../../shared/work/next-view.mts";
import { createItem } from "../../shared/work/state.mts";
import { str, UsageError, type Args } from "../../util/args.mts";
import { readText } from "../../util/io.mts";

export type Request = { text: string } | { file: string };
export type OpenInput = {
  lane: string;
  title: string;
  id: string | undefined;
  request: Request | null;
  ticket: string | undefined;
  story: string | undefined;
  source: string | undefined;
  session: string | undefined;
};
export type Opened = { id: string; lane: string; dir: string; warnings: string[]; next: { action: string; actor: string | null } } & Record<string, unknown>;

const STDIN = "-";
const EMPTY_REQUEST = 'open: the request is empty; pass the request text with --text "<request>" or drop the flag';

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

export const openItem = action<OpenInput, Opened>(async (input, { root, session, now }) => {
  const request = requestText(input.request);
  const story = input.story === undefined ? null : readFile(input.story);
  const sources = (loadConfig(root) as unknown as { sources: Source[] }).sources;
  const resolution = storyResolution(story, sources);
  if (resolution?.failures.length) return refuse(notFoundMessage(resolution.failures), { failures: resolution.failures });
  const created = createItem(root, { lane: input.lane, title: input.title, id: input.id, source: input.ticket ?? input.source, request, story, session: input.session ?? session }, now());
  if (resolution) writeIntake(root, created.id, resolution);
  recordBases(root, created.id);
  return done({ ...created, dir: `${WORK_DIR}/${created.id}`, warnings: sourceWarnings(story, sources), next: readNext(root, created.id) });
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

function parseOpen(args: Args): OpenInput {
  const lane = str(args, "lane");
  const title = str(args, "title");
  if (!lane || !title) throw new UsageError("open needs --lane and --title");
  const ticket = str(args, "ticket");
  const story = str(args, "story");
  if ((ticket === undefined) !== (story === undefined)) throw new UsageError("open needs --ticket <KEY> and --story <file> together");
  return { lane, title, id: str(args, "id"), request: parseRequest(args), ticket, story, source: str(args, "source"), session: str(args, "session") };
}

function renderOpen(v: Opened): string {
  return `created ${v.dir} (${v.lane}) · next: ${v.next.action} by ${v.next.actor}${v.warnings.map((w) => `\nWARNING: ${w}`).join("")}`;
}

export const verb: VerbSpec<OpenInput, Opened> = {
  usage: 'open --lane <fast|order|design|research> --title "<title>" [--text "<request>" | --request <file|->] [--ticket <KEY> --story <file>] [--id <id>]',
  output: "json",
  parse: parseOpen,
  run: openItem,
  render: renderOpen,
};
