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

export function notFound(command) {
  return { status: null, stdout: "", stderr: `${command}: not found` };
}

export function exited(status, stdout = "") {
  return { status, stdout, stderr: status === 0 ? "" : "failed" };
}

export function fakeExec(programs) {
  return (command, args) => (programs[command] ? programs[command](args) : notFound(command));
}

export function fakeRegistry(values = {}) {
  const keys = new Map(Object.entries(values).map(([key, entries]) => [key, new Map(Object.entries(entries))]));
  const valuesOf = (key) => keys.get(key) ?? keys.set(key, new Map()).get(key);
  const run = ([verb, key, ...rest]) => {
    const option = (flag) => rest[rest.indexOf(flag) + 1];
    if (verb === "query") {
      if (!keys.has(key)) return exited(1);
      return exited(0, [...keys.get(key)].map(([name, data]) => `    ${name}    REG_SZ    ${data}`).join("\r\n"));
    }
    if (verb === "add") {
      valuesOf(key).set(option("/v"), option("/d"));
      return exited(0);
    }
    if (verb === "delete") return exited(valuesOf(key).delete(option("/v")) ? 0 : 1);
    return exited(1);
  };
  return { keys, run };
}

export function servingFetch(body) {
  const fetch = async (url) => {
    fetch.urls.push(url);
    return new Response(body);
  };
  fetch.urls = [];
  return fetch;
}

function zipHeader(fields) {
  const buffer = Buffer.alloc(fields.reduce((sum, [, size]) => sum + size, 0));
  let at = 0;
  for (const [value, size] of fields) {
    if (size === 2) buffer.writeUInt16LE(value, at);
    else buffer.writeUInt32LE(value, at);
    at += size;
  }
  return buffer;
}

export function buildZip(entries) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const { name, data, compressed = data, method = 0, flags = 0 } of entries) {
    const nameBytes = Buffer.from(name);
    const common = [[flags, 2], [method, 2], [0, 2], [0, 2], [0, 4], [compressed.length, 4], [data.length, 4], [nameBytes.length, 2], [0, 2]];
    const local = Buffer.concat([zipHeader([[0x04034b50, 4], [20, 2], ...common]), nameBytes, compressed]);
    centrals.push(Buffer.concat([zipHeader([[0x02014b50, 4], [20, 2], [20, 2], ...common, [0, 2], [0, 2], [0, 2], [0, 4], [offset, 4]]), nameBytes]));
    locals.push(local);
    offset += local.length;
  }
  const directory = Buffer.concat(centrals);
  const end = zipHeader([[0x06054b50, 4], [0, 2], [0, 2], [entries.length, 2], [entries.length, 2], [directory.length, 4], [offset, 4], [0, 2]]);
  return Buffer.concat([...locals, directory, end]);
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
