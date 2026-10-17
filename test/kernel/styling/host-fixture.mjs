import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";

export const FIXED_NOW = Date.UTC(2026, 9, 17, 12, 0, 0);

function succeed() {
  return { status: 0, stdout: "", stderr: "" };
}

export function fakeHost({ platform = "linux", files = {}, env = {}, answers = [], interactive = true, exec = succeed, fetch = null } = {}) {
  const home = mkdtempSync(join(tmpdir(), "picket-styling-"));
  for (const [rel, text] of Object.entries(files)) writeHomeFile(home, rel, text);
  const queue = [...answers];
  const host = {
    platform,
    home,
    env,
    now: () => FIXED_NOW,
    calls: [],
    questions: [],
    interactive,
    fetch,
    exec(command, args) {
      host.calls.push([command, ...args]);
      return exec(command, args);
    },
    async ask(question, { fallback }) {
      host.questions.push(question);
      return interactive && queue.length > 0 ? queue.shift() : fallback;
    },
    dispose() {
      rmSync(home, { recursive: true, force: true });
    },
  };
  return host;
}

export function writeHomeFile(home, rel, text) {
  const path = join(home, ...rel.split("/"));
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
}

export function homeFiles(home, dir = home) {
  return readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => (entry.isDirectory() ? homeFiles(home, join(dir, entry.name)) : [relative(home, join(dir, entry.name)).replaceAll("\\", "/")]))
    .sort();
}
