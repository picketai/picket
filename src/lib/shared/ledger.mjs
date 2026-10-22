import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { projectRoot, stateDir, statePath, STATE_FILES } from "./paths.mjs";

export function appendLedger(root, row) {
  mkdirSync(stateDir(root), { recursive: true });
  appendFileSync(statePath(root, STATE_FILES.ledger), JSON.stringify({ v: 2, ts: new Date().toISOString(), ...row }) + "\n");
}

export function readLedger(root = projectRoot()) {
  const p = statePath(root, STATE_FILES.ledger);
  if (!existsSync(p)) return [];
  return readFileSync(p, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        return null;
      }
    })
    .filter((r) => r && r.v === 2);
}
