import { appendFileSync, mkdirSync } from "node:fs";
import { stateDir, statePath, STATE_FILES } from "./paths.mjs";

export function appendLedger(root, row) {
  mkdirSync(stateDir(root), { recursive: true });
  appendFileSync(statePath(root, STATE_FILES.ledger), JSON.stringify({ v: 2, ts: new Date().toISOString(), ...row }) + "\n");
}
