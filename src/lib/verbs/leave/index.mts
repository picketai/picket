import { action, done, refuse } from "../../shared/action.mts";
import type { VerbSpec } from "../../shared/verb-spec.mts";
import { workFile, workId, type WorkId } from "../../shared/work/files.mts";
import { leftLine, type LeftEntry } from "../../shared/work/left.mts";
import { appendJsonl } from "../../util/io.mts";
import { str, UsageError, type Args } from "../../util/args.mts";
import { readState, type Status } from "../../shared/work/state.mts";

export type LeaveInput = { id: WorkId; command: string; why: string | null };

const MAX_COMMAND_CHARS = 300;
const CLOSED_STATUSES: readonly Status[] = ["done", "abandoned"];

export const leave = action<LeaveInput, LeftEntry>(async ({ id, command, why }, { root, now }) => {
  if (command.length > MAX_COMMAND_CHARS) return refuse(`the command is longer than ${MAX_COMMAND_CHARS} characters`, { id });
  const { status } = readState(root, id);
  if (CLOSED_STATUSES.includes(status)) return refuse(`${id} is ${status}; only an open or blocked item records what is left`, { id, status });
  const entry = { ts: now().toISOString(), command, why };
  appendJsonl(workFile(root, id, "left.jsonl"), entry);
  return done(entry);
});

function parseLeave(args: Args): LeaveInput {
  const [id] = args.pos;
  const command = str(args, "command")?.trim();
  if (!id || !command) throw new UsageError('leave needs <id> --command "<command>"');
  return { id: workId(id), command, why: str(args, "why")?.trim() || null };
}

export const verb: VerbSpec<LeaveInput, LeftEntry> = {
  usage: 'leave <id> --command "<command>" [--why "<why>"]',
  output: "json",
  parse: parseLeave,
  run: leave,
  render: leftLine,
};
