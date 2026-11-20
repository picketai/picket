import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { recordApproval, fileDigest } from "../../src/lib/shared/data/approvals.mts";
import type { WorkId } from "../../src/lib/shared/work/files.mts";
import { openItem, writeConfig } from "./project.mts";

export const DATA_VARIABLE = "PICKET_DATA_ORDERS_SQL";
export const DATA_CONNECTION = "Server=sql01;Database=orders_test;User Id=qa;Password=s3cret";
export const DATA_SECRET = "s3cret";
export const DATA_APPROVED_AT = "2026-11-18T09:00:00.000Z";
export const DATA_ENV: NodeJS.ProcessEnv = { [DATA_VARIABLE]: DATA_CONNECTION };

const SQL = "insert into customers (name) values ('PKT-seed');\n";
const ENTRY = "---\nkind: sql\nneed: a customer with orders\nfile: data/customer.sql\nservice: orders-sql\nformat: 1\n---\nrequest GET {orders}/customers?name=PKT-seed\ncapture id json 0.id\n";
const DECLARED = [{ server: "sql01", database: "orders_test" }];
const UNDECLARED = [{ server: "sql02", database: "orders_test" }];

export type DataRunSeed = { id: WorkId; sql: string; digest: string; plain: string; marked: string };

export function seedDataRun(root: string, { declared = true }: { declared?: boolean } = {}): DataRunSeed {
  const env = join(root, ".picket", "env");
  mkdirSync(join(env, "data"), { recursive: true });
  mkdirSync(join(env, "catalog"), { recursive: true });
  const sql = join(env, "data", "customer.sql");
  writeFileSync(sql, SQL);
  writeFileSync(join(env, "catalog", "customer.md"), ENTRY);
  writeConfig(root, { version: 1, data_targets: { "orders-sql": declared ? DECLARED : UNDECLARED } });
  recordApproval(root, "data/customer.sql", fileDigest(sql), "s-approve", new Date(DATA_APPROVED_AT));
  const { id } = openItem(root, { lane: "design", title: "Orders", source: "PROJ-481" });
  const plain = `picket data run ${id} customer`;
  return { id, sql, digest: fileDigest(sql), plain, marked: `PICKET_ESCALATE="seed one customer" ${plain}` };
}
