import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { readState, workDir } from "./work.mjs";

const LEFT_FILE = "left.jsonl";
const MAX_COMMAND_CHARS = 300;
const CLOSED_STATUSES = new Set(["done", "abandoned"]);

export class LeaveRefused extends Error {}

function leftPath(id, root) {
  return join(workDir(id, root), LEFT_FILE);
}

export function leave(id, root, { command, why } = {}) {
  const text = typeof command === "string" ? command.trim() : "";
  if (!text) throw new LeaveRefused('leave needs <id> --command "<command>"');
  if (text.length > MAX_COMMAND_CHARS) throw new LeaveRefused(`the command is longer than ${MAX_COMMAND_CHARS} characters`);
  const { status } = readState(id, root);
  if (CLOSED_STATUSES.has(status)) throw new LeaveRefused(`${id} is ${status}; only an open or blocked item records what is left`);
  const entry = { ts: new Date().toISOString(), command: text, why: typeof why === "string" && why.trim() ? why.trim() : null };
  appendFileSync(leftPath(id, root), JSON.stringify(entry) + "\n");
  return entry;
}

export function readLeft(id, root) {
  const path = leftPath(id, root);
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .flatMap((line) => {
      try {
        return [JSON.parse(line)];
      } catch {
        return [];
      }
    });
}

export function leftLine({ command, why }) {
  return `left for you: ${command}${why ? ` (${why})` : ""}`;
}
