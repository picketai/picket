import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { ANSI, TERMINAL } from "../palette.mts";
import {
  appendToList,
  dconfMissing,
  dconfRead,
  dconfResetDir,
  dconfWrite,
  externalFields,
  hasDconf,
  parseList,
  quote,
  removeFromList,
  restoreKey,
  saveDump,
  unquote,
} from "./gnome-terminal.mjs";
import { keptFile, keyfileChange, renderIni } from "./ini.mjs";

const WRITER = "ptyxis";
const BASE = "/org/gnome/Ptyxis/";
const UUIDS = `${BASE}profile-uuids`;
const DEFAULT = `${BASE}default-profile-uuid`;
const USE_SYSTEM_FONT = `${BASE}use-system-font`;
const FONT_NAME = `${BASE}font-name`;
const PALETTE_ID = "picketai";
const NAME = "PicketAI";

function palettePath(host) {
  return join(host.env.XDG_DATA_HOME || join(host.home, ".local", "share"), "org.gnome.Ptyxis", "palettes", `${PALETTE_ID}.palette`);
}

export function paletteFile() {
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
        ...colors.map((color, i) => [`Color${i}`, color]),
      ],
    ],
  ]);
}

function profilePath(uuid) {
  return `${BASE}Profiles/${uuid}/`;
}

function findProfile(host) {
  return parseList(dconfRead(host, UUIDS)).find((uuid) => unquote(dconfRead(host, `${profilePath(uuid)}label`)) === NAME) ?? null;
}

function profileChange(state) {
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

function defaultChange(state) {
  const id = `${WRITER}-default`;
  return {
    id,
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

function fontValue(family) {
  return quote(`${family} 12`);
}

function fontChange(family) {
  const id = `${WRITER}-font`;
  return {
    id,
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

function plan(host, manifest, { family }) {
  if (!hasDconf(host)) return dconfMissing(WRITER, "Ptyxis");
  const existing = findProfile(host);
  const state = { uuid: existing };
  const isDefault = existing !== null && unquote(dconfRead(host, DEFAULT)) === existing;
  const fontSet = dconfRead(host, USE_SYSTEM_FONT) === "false" && dconfRead(host, FONT_NAME) === fontValue(family);
  return [
    ...keyfileChange({ id: `${WRITER}-palette`, path: palettePath(host), content: paletteFile(), writer: WRITER }),
    ...(existing === null ? [profileChange(state)] : []),
    ...(isDefault ? [] : [defaultChange(state)]),
    ...(fontSet ? [] : [fontChange(family)]),
  ];
}

function unapplyDefault(item, host) {
  if (unquote(dconfRead(host, DEFAULT)) !== item.data.uuid) return { result: "kept", detail: "the default profile was changed after setup" };
  restoreKey(host, DEFAULT, item.previous.default);
  return { result: "removed" };
}

function unapplyFont(item, host) {
  if (dconfRead(host, FONT_NAME) !== item.data.fontName) return { result: "kept", detail: "the Ptyxis font was changed after setup" };
  restoreKey(host, USE_SYSTEM_FONT, item.previous.useSystemFont);
  restoreKey(host, FONT_NAME, item.previous.fontName);
  return { result: "removed" };
}

function unapply(item, host) {
  if (item.data.part === "file") return keptFile(item);
  if (item.data.part === "default") return unapplyDefault(item, host);
  if (item.data.part === "font") return unapplyFont(item, host);
  dconfResetDir(host, profilePath(item.data.uuid));
  removeFromList(host, UUIDS, item.data.uuid, item.previous.list, []);
  return { result: "removed" };
}

export const ptyxis = { id: WRITER, name: "Ptyxis", plan, unapply };
