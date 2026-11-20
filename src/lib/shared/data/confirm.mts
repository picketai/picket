import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { Refused } from "../action.mts";
import { statePath, STATE_FILES } from "../paths.mts";
import { appendJsonl, readJsonl } from "../../util/io.mts";
import type { RunPlan } from "./plan.mts";

export type Confirmation = {
  id: string;
  at: string;
  session: string;
  item: string;
  entry: string;
  service: string;
  path: string;
  sha256: string;
  server: string;
  database: string;
  snapshot: string;
  nonce_sha256: string;
};

export type Voided = { id: string; voided_at: string };
export type Taken = { id: string; taken_at: string };
export type ConfirmationRow = Confirmation | Voided | Taken;

export function sha256Hex(data: string | Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}

export function confirmationsPath(root: string): string {
  return statePath(root, STATE_FILES.dataConfirmations);
}

export function snapshotRel(sha256: string): string {
  return `${STATE_FILES.dataSnapshots}/${sha256}.sql`;
}

export function readConfirmations(root: string): ConfirmationRow[] {
  return readJsonl<ConfirmationRow>(confirmationsPath(root)).rows;
}

function isConfirmation(row: ConfirmationRow): row is Confirmation {
  return "nonce_sha256" in row;
}

function writeSnapshot(root: string, rel: string, bytes: Buffer): void {
  const abs = statePath(root, rel);
  mkdirSync(dirname(abs), { recursive: true });
  const temporary = `${abs}.${process.pid}.tmp`;
  writeFileSync(temporary, bytes);
  renameSync(temporary, abs);
}

export function confirmRun(root: string, plan: RunPlan, bytes: Buffer, session: string | null, nonceSha256: string, now: Date): Confirmation {
  if (session === null) throw new Refused("the hook payload names no session, so no confirmation is written and nothing can run");
  const sha256 = sha256Hex(bytes);
  if (sha256 !== plan.sha256) throw new Refused(`${plan.path} changed while the dialog was prepared; ask again`);
  const snapshot = snapshotRel(sha256);
  writeSnapshot(root, snapshot, bytes);
  const row: Confirmation = {
    id: randomUUID(),
    at: now.toISOString(),
    session,
    item: plan.item,
    entry: plan.entry,
    service: plan.service,
    path: plan.path,
    sha256,
    server: plan.target.server,
    database: plan.target.database,
    snapshot,
    nonce_sha256: nonceSha256,
  };
  appendJsonl(confirmationsPath(root), row);
  return row;
}

export function voidPending(root: string, session: string, now: Date): number {
  const rows = readConfirmations(root);
  const settled = new Set(rows.filter((row) => !isConfirmation(row)).map((row) => row.id));
  const pending = rows.filter((row): row is Confirmation => isConfirmation(row) && row.session === session && !settled.has(row.id));
  for (const { id } of pending) appendJsonl(confirmationsPath(root), { id, voided_at: now.toISOString() } satisfies Voided);
  return pending.length;
}
