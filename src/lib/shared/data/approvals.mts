import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import { Refused } from "../action.mts";
import { DATA_DIR, ENV_DIR } from "../env/standard.mts";
import { statePath, STATE_FILES } from "../paths.mts";
import { appendJsonl, readJsonl } from "../../util/io.mts";

export type ApprovalStatus = "approved" | "not approved" | "changed since approval";
export type DataApproval = { path: string; sha256: string; at: string; session: string | null };
export type SqlFile = { path: string; abs: string };

function insideData(root: string, abs: string): boolean {
  const rel = relative(resolve(root, DATA_DIR), abs);
  return rel !== "" && !rel.startsWith("..") && !isAbsolute(rel);
}

export function sqlFile(root: string, path: string): SqlFile {
  const abs = resolve(root, ENV_DIR, path);
  if (isAbsolute(path) || !insideData(root, abs)) throw new Refused(`${path} is not a file under ${DATA_DIR}/; name it from ${ENV_DIR}/, such as data/customer.sql`);
  if (!existsSync(abs) || !statSync(abs).isFile()) throw new Refused(`${path} does not exist under ${ENV_DIR}/`);
  return { path: relative(resolve(root, ENV_DIR), abs).replaceAll("\\", "/"), abs };
}

export function fileDigest(abs: string): string {
  return createHash("sha256").update(readFileSync(abs)).digest("hex");
}

function approvalsPath(root: string): string {
  return statePath(root, STATE_FILES.dataApprovals);
}

function latestApproval(root: string, path: string): DataApproval | null {
  return readJsonl<DataApproval>(approvalsPath(root)).rows.filter((row) => row.path === path).at(-1) ?? null;
}

export function approvalStatus(root: string, file: SqlFile): ApprovalStatus {
  const latest = latestApproval(root, file.path);
  if (latest === null) return "not approved";
  return latest.sha256 === fileDigest(file.abs) ? "approved" : "changed since approval";
}

export function recordApproval(root: string, path: string, sha256: string, session: string | null, now: Date): DataApproval {
  const row: DataApproval = { path, sha256, at: now.toISOString(), session };
  appendJsonl(approvalsPath(root), row);
  return row;
}
