import { tmpdir } from "node:os";
import { join } from "node:path";
import { action, done } from "../../shared/action.mts";
import type { VerbSpec } from "../../shared/verb-spec.mts";
import type { Args } from "../../util/args.mts";
import { iconsMode, liveProbe, recordSessionCost, renderStatusline } from "./statusline.mjs";

export type StatuslineInput = Record<string, unknown>;
export type Statusline = { line: string };

type Probe = unknown;
type Render = (input: StatuslineInput, options: { now: number; columns: number; icons: string; probe: Probe }) => string;

const PROBE_CACHE = "picket-statusline";
const renderTyped = renderStatusline as unknown as Render;

export const statusline = action<StatuslineInput, Statusline>(async (input, { now, env, home }) => {
  const at = now().getTime();
  const probe = liveProbe({ cacheDir: join(tmpdir(), PROBE_CACHE), now: at });
  const line = renderTyped(input, { now: at, columns: Number(env.COLUMNS), icons: iconsMode(home), probe });
  recordSessionCost(input);
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
