import { randomUUID } from "node:crypto";
import type { Change } from "../../change.mts";
import type { Host } from "../../host.mts";
import type { ManifestItem, Unapplied } from "../../manifest.mts";
import { ANSI, TERMINAL } from "../../palette.mts";
import type { TerminalWriter } from "../../terminals.mts";
import { appendToList, dconfMissing, dconfRead, dconfResetDir, dconfWrite, externalFields, hasDconf, parseList, quote, quoteList, removeFromList, restoreKey, saveDump, unquote } from "../dconf.mts";

const WRITER = "gnome-terminal";
const BASE = "/org/gnome/terminal/legacy/profiles:/";
const LIST = `${BASE}list`;
const DEFAULT = `${BASE}default`;
const BUILT_IN_PROFILE = "b1dcc9dd-5262-4d8d-a863-c897e6d979b9";
const NAME = "PicketAI";

type ProfileState = { uuid: string | null };

function profilePath(uuid: string): string {
  return `${BASE}:${uuid}/`;
}

function palette(): string {
  return quoteList([...Object.values(ANSI).map(([normal]) => normal), ...Object.values(ANSI).map(([, bright]) => bright)]);
}

function profileKeys(family: string): [string, string][] {
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

function findProfile(host: Host): string | null {
  return parseList(dconfRead(host, LIST)).find((uuid) => unquote(dconfRead(host, `${profilePath(uuid)}visible-name`)) === NAME) ?? null;
}

function profileChange(state: ProfileState, family: string): Change {
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
      return externalFields({ backup, previous: { list }, data: { writer: WRITER, part: "profile", uuid } });
    },
  };
}

function defaultChange(state: ProfileState): Change {
  return {
    id: `${WRITER}-default`,
    summary: `make ${NAME} the default GNOME Terminal profile`,
    question: "Make PicketAI the default GNOME Terminal profile?",
    restart: null,
    setsFont: true,
    apply(host) {
      if (state.uuid === null) return null;
      const before = dconfRead(host, DEFAULT);
      dconfWrite(host, DEFAULT, quote(state.uuid));
      return externalFields({ previous: { default: before }, data: { writer: WRITER, part: "default", uuid: state.uuid } });
    },
  };
}

function plan(host: Host, family: string): Change[] {
  if (!hasDconf(host)) return dconfMissing(WRITER, "GNOME Terminal");
  const existing = findProfile(host);
  const state: ProfileState = { uuid: existing };
  const isDefault = existing !== null && unquote(dconfRead(host, DEFAULT)) === existing;
  return [...(existing === null ? [profileChange(state, family)] : []), ...(isDefault ? [] : [defaultChange(state)])];
}

function undo(item: ManifestItem, host: Host): Unapplied {
  const uuid = item.data?.uuid as string;
  const previous = item.previous ?? {};
  if (item.data?.part === "default") {
    if (unquote(dconfRead(host, DEFAULT)) !== uuid) return { result: "kept", detail: "the default profile was changed after setup" };
    restoreKey(host, DEFAULT, previous.default as string | null);
    return { result: "removed" };
  }
  dconfResetDir(host, profilePath(uuid));
  removeFromList(host, LIST, uuid, previous.list as string | null, [BUILT_IN_PROFILE]);
  return { result: "removed" };
}

function byHand(item: ManifestItem): string {
  if (item.backup) return `dconf load ${BASE} < ${item.backup}`;
  const before = item.previous?.default;
  return before === null ? `dconf reset ${DEFAULT}` : `dconf write ${DEFAULT} "${before}"`;
}

function unapply(item: ManifestItem, host: Host): Unapplied {
  try {
    return undo(item, host);
  } catch (err) {
    throw Object.assign(new Error((err as Error).message), { manual: `run ${byHand(item)}` });
  }
}

export const writer: TerminalWriter = {
  plan: (host, _manifest, { family }) => plan(host, family),
  unapply,
};
