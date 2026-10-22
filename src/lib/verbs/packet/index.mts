import { action, done } from "../../shared/action.mts";
import type { VerbSpec } from "../../shared/verb-spec.mts";
import { workId, type WorkId } from "../../shared/work/files.mts";
import { int, UsageError, type Args } from "../../util/args.mts";
import { packet } from "./packet.mjs";

export type PacketInput = { id: WorkId; width: number | undefined };
export type GatePacket = { lines: string[]; text: string; next: Record<string, unknown> };

export const gatePacket = action<PacketInput, GatePacket>(async ({ id, width }, { root }) => done(packet(id, root, { width }) as GatePacket));

function parsePacket(args: Args): PacketInput {
  const [id] = args.pos;
  if (!id) throw new UsageError("packet needs <id>");
  return { id: workId(id), width: int(args, "width") };
}

export const verb: VerbSpec<PacketInput, GatePacket> = {
  usage: "packet <id> [--width <n>] [--json]",
  output: "text",
  parse: parsePacket,
  run: gatePacket,
  render: (value) => value.text,
};
