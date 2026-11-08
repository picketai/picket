import { tmpdir } from "node:os";
import { join } from "node:path";
import { action, done } from "../../shared/action.mts";
import type { VerbSpec } from "../../shared/verb-spec.mts";
import type { Args } from "../../util/args.mts";
import { factsOf, workspaceDir, type StatuslineInput } from "./facts.mts";
import { layout } from "./layout.mts";
import { paint } from "./paint.mts";
import { directProbe, iconsMode, liveProbe, type Probe } from "./probe.mts";

export type Statusline = { line: string };
export type RenderOptions = { now: number; columns: number | undefined; icons?: string; probe?: Probe };

const PROBE_CACHE = "picket-statusline";

export function renderStatusline(input: StatuslineInput, { now, columns, icons = "plain", probe = directProbe }: RenderOptions): string {
  const dir = workspaceDir(input);
  const facts = factsOf(input, { now, skill: probe.skill(input.transcript_path), git: dir === null ? null : probe.git(dir) });
  return paint(layout(facts, { columns, icons }));
}

export const statusline = action<StatuslineInput, Statusline>(async (input, { now, env, home }) => {
  const at = now().getTime();
  const probe = liveProbe({ cacheDir: join(tmpdir(), PROBE_CACHE), now: at });
  const line = renderStatusline(input, { now: at, columns: Number(env.COLUMNS), icons: iconsMode(home), probe });
  return done({ line });
});

function parseStatusline(args: Args): StatuslineInput {
  try {
    return JSON.parse(args.stdin()) ?? {};
  } catch {
    return {};
  }
}

export const verb: VerbSpec<StatuslineInput, Statusline> = {
  usage: "statusline",
  output: "text",
  parse: parseStatusline,
  run: statusline,
  render: ({ line }) => line,
};
