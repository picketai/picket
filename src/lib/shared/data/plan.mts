import { Refused } from "../action.mts";
import { listEntries, type CatalogEntry } from "../catalog/entry.mts";
import { loadConfig } from "../config.mjs";
import { dataVariable } from "../env/standard.mts";
import { configRel, statePath, STATE_FILES } from "../paths.mts";
import type { WorkId } from "../work/files.mts";
import { readState } from "../work/state.mts";
import { readJsonl } from "../../util/io.mts";
import { fileDigest, sqlFile, type DataApproval } from "./approvals.mts";
import { readTarget, type ConnectionTarget } from "./connection.mts";
import { isDeclared, type DataTargets } from "./targets.mts";

export type RunPlan = {
  item: WorkId;
  entry: string;
  service: string;
  variable: string;
  path: string;
  abs: string;
  sha256: string;
  target: ConnectionTarget;
  approval: DataApproval;
};

type SqlEntry = CatalogEntry & { file: string; service: string };
type ApprovedFile = { path: string; abs: string; sha256: string; approval: DataApproval };

const CLOSED_STATUSES = ["done", "abandoned"];
const SQL_KIND = "sql";

function sqlEntry(root: string, name: string): SqlEntry {
  const found = listEntries(root).find((file) => file.name === name);
  if (found === undefined) throw new Refused(`no catalog entry ${name}`);
  const { entry } = found;
  if (entry === null) throw new Refused(`the catalog entry ${name} has problems; run picket env check`);
  if (entry.kind !== SQL_KIND || entry.file === null || entry.service === null) throw new Refused(`${name} is a ${entry.kind} entry; only a sql entry has a file to run`);
  return { ...entry, file: entry.file, service: entry.service };
}

function latestApproval(root: string, path: string): DataApproval | null {
  return readJsonl<DataApproval>(statePath(root, STATE_FILES.dataApprovals)).rows.filter((row) => row.path === path).at(-1) ?? null;
}

function approvedFile(root: string, path: string): ApprovedFile {
  const file = sqlFile(root, path);
  const sha256 = fileDigest(file.abs);
  const approval = latestApproval(root, file.path);
  if (approval === null) throw new Refused(`${file.path} is not approved; the user reads it with picket data show ${file.path} and approves it`);
  if (approval.sha256 !== sha256) throw new Refused(`${file.path} changed since approval; the user reads it again with picket data show ${file.path}`);
  return { ...file, sha256, approval };
}

function connection(env: NodeJS.ProcessEnv, variable: string): string {
  const value = env[variable];
  if (value === undefined || value === "") throw new Refused(`${variable} is unset; set it to the connection string in the shell that starts Claude Code. Picket never stores it`);
  return value;
}

function connectionTarget(variable: string, value: string): ConnectionTarget {
  const read = readTarget(value);
  if ("problem" in read) throw new Refused(`${variable} does not name one server and one database: ${read.problem}`);
  return read.target;
}

function declaredTarget(targets: DataTargets, service: string, target: ConnectionTarget): ConnectionTarget {
  if (isDeclared(targets, service, target)) return target;
  const pair = JSON.stringify(target);
  throw new Refused(`${service} may reach only the targets data_targets.${service} in ${configRel()} lists, and it does not list server ${target.server}, database ${target.database}. Check them, then add ${pair} to that list`);
}

function openItem(root: string, id: WorkId): void {
  const { status } = readState(root, id);
  if (CLOSED_STATUSES.includes(status)) throw new Refused(`${id} is ${status}; data run runs only for an open or blocked item`, { id });
}

export function planRun(root: string, env: NodeJS.ProcessEnv, id: WorkId, name: string): RunPlan {
  const entry = sqlEntry(root, name);
  const file = approvedFile(root, entry.file);
  const variable = dataVariable(entry.service);
  const read = connectionTarget(variable, connection(env, variable));
  const target = declaredTarget(loadConfig(root, env).data_targets, entry.service, read);
  openItem(root, id);
  return { item: id, entry: name, service: entry.service, variable, path: file.path, abs: file.abs, sha256: file.sha256, target, approval: file.approval };
}
