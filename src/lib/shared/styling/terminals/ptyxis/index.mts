import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { renderIni } from "../../../../util/ini.mts";
import type { Change } from "../../change.mts";
import type { Host } from "../../host.mts";
import type { ManifestItem, Unapplied } from "../../manifest.mts";
import { ANSI, TERMINAL } from "../../palette.mts";
import type { TerminalWriter } from "../../terminals.mts";
import { appendToList, dconfMissing, dconfRead, dconfResetDir, dconfWrite, externalFields, hasDconf, parseList, quote, removeFromList, restoreKey, saveDump, unquote } from "../dconf.mts";
import { keptFile, keyfileChange } from "../keyfile.mts";

const WRITER = "ptyxis";
const BASE = "/org/gnome/Ptyxis/";
const UUIDS = `${BASE}profile-uuids`;
const DEFAULT = `${BASE}default-profile-uuid`;
const USE_SYSTEM_FONT = `${BASE}use-system-font`;
const FONT_NAME = `${BASE}font-name`;
const PALETTE_ID = "picketai";
const NAME = "PicketAI";

type ProfileState = { uuid: string | null };

function palettePath(host: Host): string {
  return join(host.env.XDG_DATA_HOME || join(host.home, ".local", "share"), "org.gnome.Ptyxis", "palettes", `${PALETTE_ID}.palette`);
}

export function paletteFile(): string {
  const colors = [...Object.values(ANSI).map(([normal]) => normal), ...Object.values(ANSI).map(([, bright]) => bright)];
  return renderIni([
    ["Palette", [["Name", NAME]]],
    [
      "Dark",
      [
        ["Foreground", TERMINAL.foreground],
        ["Background", TERMINAL.background],
        ["CursorBackground", TERMINAL.cursor],
        ["CursorForeground", TERMINAL.background],
        ...colors.map((color, i): [string, string] => [`Color${i}`, color]),
      ],
    ],
  ]);
}

function profilePath(uuid: string): string {
  return `${BASE}Profiles/${uuid}/`;
}

function findProfile(host: Host): string | null {
  return parseList(dconfRead(host, UUIDS)).find((uuid) => unquote(dconfRead(host, `${profilePath(uuid)}label`)) === NAME) ?? null;
}

function profileChange(state: ProfileState): Change {
  const id = `${WRITER}-profile`;
  return {
    id,
    summary: `create the Ptyxis profile ${NAME} using the ${PALETTE_ID} palette`,
    restart: null,
    apply(host) {
      const backup = saveDump(host, id, BASE);
      const uuid = randomUUID().replaceAll("-", "");
      dconfWrite(host, `${profilePath(uuid)}label`, quote(NAME));
      dconfWrite(host, `${profilePath(uuid)}palette`, quote(PALETTE_ID));
      const list = appendToList(host, UUIDS, uuid, []);
      state.uuid = uuid;
      return externalFields({ backup, previous: { list }, data: { writer: WRITER, part: "profile", uuid } });
    },
  };
}

function defaultChange(state: ProfileState): Change {
  return {
    id: `${WRITER}-default`,
    summary: `make ${NAME} the default Ptyxis profile`,
    question: "Make PicketAI the default Ptyxis profile?",
    restart: null,
    apply(host) {
      if (state.uuid === null) return null;
      const before = dconfRead(host, DEFAULT);
      dconfWrite(host, DEFAULT, quote(state.uuid));
      return externalFields({ previous: { default: before }, data: { writer: WRITER, part: "default", uuid: state.uuid } });
    },
  };
}

function fontValue(family: string): string {
  return quote(`${family} 12`);
}

function fontChange(family: string): Change {
  return {
    id: `${WRITER}-font`,
    summary: `set the app-wide Ptyxis font to ${family} 12`,
    question: `Use ${family} in every Ptyxis profile?`,
    restart: null,
    setsFont: true,
    apply(host) {
      const previous = { useSystemFont: dconfRead(host, USE_SYSTEM_FONT), fontName: dconfRead(host, FONT_NAME) };
      dconfWrite(host, USE_SYSTEM_FONT, "false");
      dconfWrite(host, FONT_NAME, fontValue(family));
      return externalFields({ previous, data: { writer: WRITER, part: "font", fontName: fontValue(family) } });
    },
  };
}

function plan(host: Host, family: string): Change[] {
  if (!hasDconf(host)) return dconfMissing(WRITER, "Ptyxis");
  const existing = findProfile(host);
  const state: ProfileState = { uuid: existing };
  const isDefault = existing !== null && unquote(dconfRead(host, DEFAULT)) === existing;
  const fontSet = dconfRead(host, USE_SYSTEM_FONT) === "false" && dconfRead(host, FONT_NAME) === fontValue(family);
  return [
    ...keyfileChange({ id: `${WRITER}-palette`, path: palettePath(host), content: paletteFile(), writer: WRITER }),
    ...(existing === null ? [profileChange(state)] : []),
    ...(isDefault ? [] : [defaultChange(state)]),
    ...(fontSet ? [] : [fontChange(family)]),
  ];
}

function unapplyDefault(item: ManifestItem, host: Host): Unapplied {
  if (unquote(dconfRead(host, DEFAULT)) !== item.data?.uuid) return { result: "kept", detail: "the default profile was changed after setup" };
  restoreKey(host, DEFAULT, item.previous?.default as string | null);
  return { result: "removed" };
}

function unapplyFont(item: ManifestItem, host: Host): Unapplied {
  if (dconfRead(host, FONT_NAME) !== item.data?.fontName) return { result: "kept", detail: "the Ptyxis font was changed after setup" };
  restoreKey(host, USE_SYSTEM_FONT, item.previous?.useSystemFont as string | null);
  restoreKey(host, FONT_NAME, item.previous?.fontName as string | null);
  return { result: "removed" };
}

function unapplyProfile(item: ManifestItem, host: Host): Unapplied {
  const uuid = item.data?.uuid as string;
  dconfResetDir(host, profilePath(uuid));
  removeFromList(host, UUIDS, uuid, item.previous?.list as string | null, []);
  return { result: "removed" };
}

function unapply(item: ManifestItem, host: Host): Unapplied {
  if (item.data?.part === "file") return keptFile(item);
  if (item.data?.part === "default") return unapplyDefault(item, host);
  if (item.data?.part === "font") return unapplyFont(item, host);
  return unapplyProfile(item, host);
}

export const writer: TerminalWriter = {
  plan: (host, _manifest, { family }) => plan(host, family),
  unapply,
};
