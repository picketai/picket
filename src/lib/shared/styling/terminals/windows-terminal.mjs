import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { applyEdits, modify, parse } from "../../../util/vendor/jsonc-parser.mjs";
import { installedAt, sha256File } from "../manifest.mjs";
import { ANSI, TERMINAL } from "../palette.mts";

const WRITER = "windows-terminal";
const SCHEME_NAME = "PicketAI";
const DEFAULTS = ["profiles", "defaults"];
const FLAVORS = [
  ["stable", ["Packages", "Microsoft.WindowsTerminal_8wekyb3d8bbwe", "LocalState", "settings.json"]],
  ["preview", ["Packages", "Microsoft.WindowsTerminalPreview_8wekyb3d8bbwe", "LocalState", "settings.json"]],
  ["unpackaged", ["Microsoft", "Windows Terminal", "settings.json"]],
];

function brightName(slot) {
  return `bright${slot.charAt(0).toUpperCase()}${slot.slice(1)}`;
}

export function picketScheme() {
  const scheme = {
    name: SCHEME_NAME,
    foreground: TERMINAL.foreground,
    background: TERMINAL.background,
    cursorColor: TERMINAL.cursor,
    selectionBackground: TERMINAL.selection,
  };
  for (const [slot, [normal]] of Object.entries(ANSI)) scheme[slot] = normal;
  for (const [slot, [, bright]] of Object.entries(ANSI)) scheme[brightName(slot)] = bright;
  return scheme;
}

function localAppData(host) {
  return host.env.LOCALAPPDATA ?? join(host.home, "AppData", "Local");
}

export function settingsFiles(host) {
  return FLAVORS.map(([flavor, parts]) => ({ flavor, path: join(localAppData(host), ...parts) })).filter(({ path }) => existsSync(path));
}

function readSettings(path) {
  const text = readFileSync(path, "utf8");
  const errors = [];
  const settings = parse(text, errors, { allowTrailingComma: true });
  if (errors.length > 0 || settings === null || typeof settings !== "object") throw new Error(`${path} is not valid JSON with comments, left as is`);
  return { text, settings };
}

function edited(text, path, value) {
  const formattingOptions = { insertSpaces: true, tabSize: 4, eol: text.includes("\r\n") ? "\r\n" : "\n" };
  return applyEdits(text, modify(text, path, value, { formattingOptions }));
}

function schemeIndex(settings) {
  return Array.isArray(settings.schemes) ? settings.schemes.findIndex((scheme) => scheme?.name === SCHEME_NAME) : -1;
}

function defaultsOf(settings) {
  return settings.profiles?.defaults ?? {};
}

function writeItem(host, { id, path, backup, text, previous, data }) {
  const backupPath = backup(path);
  writeFileSync(path, text);
  return {
    id,
    component: "terminal",
    kind: "edited",
    path,
    ...(backupPath ? { backup: backupPath } : {}),
    sha256: sha256File(path),
    previous,
    data: { writer: WRITER, ...data },
    installedAt: installedAt(host),
  };
}

function withScheme(text, settings) {
  if (!Array.isArray(settings.schemes)) return edited(text, ["schemes"], [picketScheme()]);
  const at = schemeIndex(settings);
  return edited(text, ["schemes", at >= 0 ? at : -1], picketScheme());
}

function schemeChange(file, settings) {
  const at = schemeIndex(settings);
  if (at >= 0 && isDeepStrictEqual(settings.schemes[at], picketScheme())) return [];
  const id = `${WRITER}-scheme@${file.flavor}`;
  return [
    {
      id,
      summary: `add the PicketAI colour scheme to ${file.path}`,
      restart: null,
      apply(host, backup) {
        const { text, settings: current } = readSettings(file.path);
        const index = schemeIndex(current);
        const previous = index >= 0 ? { scheme: current.schemes[index] } : {};
        return writeItem(host, { id, path: file.path, backup, text: withScheme(text, current), previous, data: { part: "scheme" } });
      },
    },
  ];
}

function profilesWithOwnLook(settings) {
  const list = Array.isArray(settings.profiles?.list) ? settings.profiles.list : [];
  return list.filter((profile) => profile && ("colorScheme" in profile || profile.font?.face !== undefined)).map((profile) => profile.name ?? profile.guid);
}

function previousDefaults(defaults) {
  return {
    ...("colorScheme" in defaults ? { colorScheme: defaults.colorScheme } : {}),
    ...(defaults.font && "face" in defaults.font ? { face: defaults.font.face } : {}),
    hadFont: defaults.font !== undefined,
  };
}

function defaultsChange(file, settings, { family, run }) {
  const defaults = defaultsOf(settings);
  if (defaults.colorScheme === SCHEME_NAME && defaults.font?.face === family) return [];
  const id = `${WRITER}-defaults@${file.flavor}`;
  const ownLook = profilesWithOwnLook(settings);
  return [
    {
      id,
      summary: `set profiles.defaults colorScheme "${SCHEME_NAME}" and font.face "${family}" in ${file.path}`,
      question: "Make PicketAI the default for all Windows Terminal profiles?",
      restart: null,
      setsFont: true,
      ...(ownLook.length ? { manual: `these Windows Terminal profiles set their own colour scheme or font and keep it: ${ownLook.join(", ")}` } : {}),
      apply(host, backup) {
        const { text, settings: current } = readSettings(file.path);
        const withColor = edited(text, [...DEFAULTS, "colorScheme"], SCHEME_NAME);
        const withFont = edited(withColor, [...DEFAULTS, "font", "face"], family);
        run.fontSet = true;
        return writeItem(host, { id, path: file.path, backup, text: withFont, previous: previousDefaults(defaultsOf(current)), data: { part: "defaults", face: family } });
      },
    },
  ];
}

function note(id, summary, manual) {
  return { id, summary, manual };
}

function planFile(file, options) {
  const { settings } = readSettings(file.path);
  if (Array.isArray(settings.profiles)) {
    return [note(`${WRITER}-legacy@${file.flavor}`, `${file.path} keeps its profiles as a plain list`, `${file.path} uses the old profiles list, so Picket did not edit it; add the PicketAI scheme and pick it in Settings`)];
  }
  return [...schemeChange(file, settings), ...defaultsChange(file, settings, options)];
}

function plan(host, manifest, options) {
  const files = settingsFiles(host);
  if (files.length === 0) {
    return [note(`${WRITER}-missing`, "no Windows Terminal settings.json found", `open Windows Terminal, choose Settings > Open JSON file once, then run picket style apply again`)];
  }
  return files.flatMap((file) => planFile(file, options));
}

function restored(text, path, previous, key) {
  return edited(text, path, key in previous ? previous[key] : undefined);
}

function withoutScheme(text, settings, previous) {
  const at = schemeIndex(settings);
  return at < 0 ? text : restored(text, ["schemes", at], previous, "scheme");
}

function withoutDefaults(text, settings, previous, face) {
  const defaults = defaultsOf(settings);
  let next = text;
  if (defaults.colorScheme === SCHEME_NAME) next = restored(next, [...DEFAULTS, "colorScheme"], previous, "colorScheme");
  if (defaults.font?.face === face) next = restored(next, [...DEFAULTS, "font", "face"], previous, "face");
  const font = defaultsOf(parse(next, [], { allowTrailingComma: true })).font;
  if (!previous.hadFont && font && Object.keys(font).length === 0) next = edited(next, [...DEFAULTS, "font"], undefined);
  return next;
}

function unapply(item) {
  const { text, settings } = readSettings(item.path);
  const next = item.data.part === "scheme" ? withoutScheme(text, settings, item.previous) : withoutDefaults(text, settings, item.previous, item.data.face);
  if (next !== text) writeFileSync(item.path, next);
  return { result: "removed" };
}

export const windowsTerminal = { id: WRITER, name: "Windows Terminal", plan, unapply };
