import { isAbsolute, relative, resolve } from "node:path";
import { appendJsonl, readJsonl } from "../../util/io.mts";
import { workFile, type WorkId } from "./files.mts";
import { isActive, listOpenWork, readState } from "./state.mts";

export type Approval = { ts: string; path: string; text: string | null; deleted?: boolean };
export type ItemApproval = Approval & { id: WorkId };
export type ApprovalSite = { cwd: string; now: Date };

type ApprovalFile = "comments.jsonl" | "waivers.jsonl";

const COMMENTS_FILE: ApprovalFile = "comments.jsonl";
const WAIVERS_FILE: ApprovalFile = "waivers.jsonl";

function isInside(dir: string, root: string): boolean {
  const rel = relative(root, dir);
  return !rel.startsWith("..") && !isAbsolute(rel);
}

function rootRelative(path: string, root: string, cwd: string): string {
  const base = isInside(cwd, root) ? cwd : root;
  return relative(root, resolve(base, String(path))).replaceAll("\\", "/");
}

function samePath(a: string, b: string): boolean {
  return process.platform === "win32" ? a.toLowerCase() === b.toLowerCase() : a === b;
}

function appendApproval(root: string, id: WorkId, file: ApprovalFile, { path, ...fields }: Omit<Approval, "ts">, { cwd, now }: ApprovalSite): Approval {
  const entry = { ts: now.toISOString(), path: rootRelative(path, root, cwd), ...fields };
  appendJsonl(workFile(root, id, file), entry);
  return entry;
}

function readApprovals(root: string, id: WorkId, file: ApprovalFile): ItemApproval[] {
  return readJsonl<Approval>(workFile(root, id, file)).rows.map((row) => ({ id, ...row }));
}

function approvalsFor(root: string, file: ApprovalFile, rel: string): ItemApproval[] {
  const target = rootRelative(rel, root, root);
  return listOpenWork(root)
    .flatMap((id) => readApprovals(root, id, file))
    .filter((entry) => samePath(rootRelative(entry.path, root, root), target));
}

export function appendComment(root: string, id: WorkId, { path, text }: { path: string; text: string }, site: ApprovalSite): Approval {
  return appendApproval(root, id, COMMENTS_FILE, { path, text: String(text) }, site);
}

export function approvedCommentsFor(root: string, rel: string): ItemApproval[] {
  return approvalsFor(root, COMMENTS_FILE, rel);
}

export function appendWaiver(root: string, id: WorkId, { path, text = null, deleted = false }: { path: string; text?: string | null; deleted?: boolean }, site: ApprovalSite): Approval {
  const { status } = readState(root, id);
  if (!isActive(status)) throw new Error(`work item ${id} is ${status}; a waiver applies to an open or blocked item only`);
  return appendApproval(root, id, WAIVERS_FILE, { path, text: deleted ? null : String(text), deleted: Boolean(deleted) }, site);
}

export function itemWaivers(root: string, id: WorkId): ItemApproval[] {
  return readApprovals(root, id, WAIVERS_FILE);
}

export function waiversFor(root: string, rel: string): ItemApproval[] {
  return approvalsFor(root, WAIVERS_FILE, rel);
}
