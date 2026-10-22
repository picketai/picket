import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { backupsDir, installedAt, stampOf } from "../manifest.mjs";
import { ANSI, TERMINAL } from "../palette.mjs";

const WRITER = "gnome-terminal";
const BASE = "/org/gnome/terminal/legacy/profiles:/";
const LIST = `${BASE}list`;
const DEFAULT = `${BASE}default`;
const BUILT_IN_PROFILE = "b1dcc9dd-5262-4d8d-a863-c897e6d979b9";
const NAME = "PicketAI";

export function quote(text) {
  return `'${text.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
}

export function quoteList(items) {
  return `[${items.map(quote).join(", ")}]`;
}

export function parseList(raw) {
  return [...(raw ?? "").matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((match) => match[1].replace(/\\(.)/g, "$1"));
}

export function unquote(raw) {
  return parseList(raw)[0] ?? null;
}

function dconf(host, args) {
  const run = host.exec("dconf", args);
  if (run.status !== 0) throw new Error(`dconf ${args.join(" ")} failed: ${run.stderr.trim()}`);
  return run.stdout;
}

export function hasDconf(host) {
  return host.exec("dconf", ["help"]).status === 0;
}

export function dconfRead(host, key) {
  const value = dconf(host, ["read", key]).trim();
  return value === "" ? null : value;
}

export function dconfWrite(host, key, value) {
  dconf(host, ["write", key, value]);
}

export function dconfResetDir(host, path) {
  dconf(host, ["reset", "-f", path]);
}

export function restoreKey(host, key, raw) {
  if (raw === null) dconf(host, ["reset", key]);
  else dconfWrite(host, key, raw);
}

export function saveDump(host, id, path) {
  const target = join(backupsDir(host.home), stampOf(host), `${id}.dconf`);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, dconf(host, ["dump", path]));
  return target;
}

export function appendToList(host, key, uuid, implicit) {
  const raw = dconfRead(host, key);
  const current = raw === null ? implicit : parseList(raw);
  dconfWrite(host, key, quoteList([...current, uuid]));
  return raw;
}

export function removeFromList(host, key, uuid, previous, implicit) {
  const remaining = parseList(dconfRead(host, key)).filter((entry) => entry !== uuid);
  if (previous === null && remaining.join() === implicit.join()) dconf(host, ["reset", key]);
  else dconfWrite(host, key, quoteList(remaining));
}

export function dconfMissing(writer, terminal) {
  return [{ id: `${writer}-no-dconf`, summary: `dconf is not available, so ${terminal} cannot be set up`, manual: `install dconf (the dconf-cli package), then run picket style apply again` }];
}

export function externalItem(host, { id, backup, previous, data }) {
  return { id, component: "terminal", kind: "external", ...(backup ? { backup } : {}), previous, data, installedAt: installedAt(host) };
}

function profilePath(uuid) {
  return `${BASE}:${uuid}/`;
}

function palette() {
  return quoteList([...Object.values(ANSI).map(([normal]) => normal), ...Object.values(ANSI).map(([, bright]) => bright)]);
}

function profileKeys(family) {
  return [
    ["visible-name", quote(NAME)],
    ["use-theme-colors", "false"],
    ["foreground-color", quote(TERMINAL.foreground)],
    ["background-color", quote(TERMINAL.background)],
    ["palette", palette()],
    ["cursor-colors-set", "true"],
    ["cursor-background-color", quote(TERMINAL.cursor)],
    ["highlight-colors-set", "true"],
    ["highlight-background-color", quote(TERMINAL.selection)],
    ["use-system-font", "false"],
    ["font", quote(`${family} 12`)],
  ];
}

function findProfile(host) {
  return parseList(dconfRead(host, LIST)).find((uuid) => unquote(dconfRead(host, `${profilePath(uuid)}visible-name`)) === NAME) ?? null;
}

function profileChange(state, family) {
  const id = `${WRITER}-profile`;
  return {
    id,
    summary: `create the GNOME Terminal profile ${NAME} under ${BASE}`,
    restart: null,
    apply(host) {
      const backup = saveDump(host, id, BASE);
      const uuid = randomUUID();
      for (const [key, value] of profileKeys(family)) dconfWrite(host, `${profilePath(uuid)}${key}`, value);
      const list = appendToList(host, LIST, uuid, [BUILT_IN_PROFILE]);
      state.uuid = uuid;
      return externalItem(host, { id, backup, previous: { list }, data: { writer: WRITER, part: "profile", uuid } });
    },
  };
}

function defaultChange(state, run) {
  const id = `${WRITER}-default`;
  return {
    id,
    summary: `make ${NAME} the default GNOME Terminal profile`,
    question: "Make PicketAI the default GNOME Terminal profile?",
    restart: null,
    setsFont: true,
    apply(host) {
      if (state.uuid === null) return null;
      const before = dconfRead(host, DEFAULT);
      dconfWrite(host, DEFAULT, quote(state.uuid));
      run.fontSet = true;
      return externalItem(host, { id, previous: { default: before }, data: { writer: WRITER, part: "default", uuid: state.uuid } });
    },
  };
}

function plan(host, manifest, { family, run }) {
  if (!hasDconf(host)) return dconfMissing(WRITER, "GNOME Terminal");
  const existing = findProfile(host);
  const state = { uuid: existing };
  const isDefault = existing !== null && unquote(dconfRead(host, DEFAULT)) === existing;
  return [...(existing === null ? [profileChange(state, family)] : []), ...(isDefault ? [] : [defaultChange(state, run)])];
}

function undo(item, host) {
  const { uuid } = item.data;
  if (item.data.part === "default") {
    if (unquote(dconfRead(host, DEFAULT)) !== uuid) return { result: "kept", detail: "the default profile was changed after setup" };
    restoreKey(host, DEFAULT, item.previous.default);
    return { result: "removed" };
  }
  dconfResetDir(host, profilePath(uuid));
  removeFromList(host, LIST, uuid, item.previous.list, [BUILT_IN_PROFILE]);
  return { result: "removed" };
}

function byHand(item) {
  if (item.backup) return `dconf load ${BASE} < ${item.backup}`;
  return item.previous.default === null ? `dconf reset ${DEFAULT}` : `dconf write ${DEFAULT} "${item.previous.default}"`;
}

function unapply(item, host) {
  try {
    return undo(item, host);
  } catch (err) {
    throw Object.assign(new Error(err.message), { manual: `run ${byHand(item)}` });
  }
}

export const gnomeTerminal = { id: WRITER, name: "GNOME Terminal", plan, unapply };
