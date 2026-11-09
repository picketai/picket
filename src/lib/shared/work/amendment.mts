import { createHash } from "node:crypto";
import type { VerdictRow } from "./verdict-log.mts";

export function recordDigest(body: string): string {
  return createHash("sha256").update(body, "utf8").digest("hex");
}

export function isUnchangedAmendment(prior: readonly VerdictRow[], record: string | undefined): boolean {
  if (record === undefined) return false;
  const asked = prior.filter((row) => Boolean(row.amend)).at(-1);
  return asked?.record === record;
}
