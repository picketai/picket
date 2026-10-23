import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { applyEdits, modify, parse, type JSONPath, type ParseError } from "../../../../util/vendor/jsonc-parser.mjs";
import type { Change } from "../../change.mts";
import type { Host } from "../../host.mts";
import { writeTracked, type Backup, type ItemFields, type ManifestItem, type Unapplied } from "../../manifest.mts";
import { ANSI, TERMINAL } from "../../palette.mts";
import type { PlanOptions, TerminalWriter } from "../../terminals.mts";

const WRITER = "windows-terminal";
const SCHEME_NAME = "PicketAI";
const DEFAULTS = ["profiles", "defaults"];
const FLAVORS: [string, string[]][] = [
  ["stable", ["Packages", "Microsoft.WindowsTerminal_8wekyb3d8bbwe", "LocalState", "settings.json"]],
  ["preview", ["Packages", "Microsoft.WindowsTerminalPreview_8wekyb3d8bbwe", "LocalState", "settings.json"]],
  ["unpackaged", ["Microsoft", "Windows Terminal", "settings.json"]],
];

type Scheme = Record<string, string>;
type Look = { colorScheme?: string; font?: { face?: string } & Record<string, unknown> } & Record<string, unknown>;
type Profile = Look & { name?: string; guid?: string };
type WtSettings = { schemes?: Scheme[]; profiles?: { defaults?: Look; list?: Profile[] } };
type SettingsFile = { flavor: string; path: string };
type SettingsWrite = { path: string; backup: Backup; text: string; previous: Record<string, unknown>; data: Record<string, unknown> };

function brightName(slot: string): string {
  return `bright${slot.charAt(0).toUpperCase()}${slot.slice(1)}`;
}

export function picketScheme(): Scheme {
  const scheme: Scheme = {
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

function localAppData(host: Host): string {
  return host.env.LOCALAPPDATA ?? join(host.home, "AppData", "Local");
}

export function settingsFiles(host: Host): SettingsFile[] {
  return FLAVORS.map(([flavor, parts]) => ({ flavor, path: join(localAppData(host), ...parts) })).filter(({ path }) => existsSync(path));
}

function readSettings(path: string): { text: string; settings: WtSettings } {
  const text = readFileSync(path, "utf8");
  const errors: ParseError[] = [];
  const settings = parse(text, errors, { allowTrailingComma: true });
  if (errors.length > 0 || settings === null || typeof settings !== "object") throw new Error(`${path} is not valid JSON with comments, left as is`);
  return { text, settings: settings as WtSettings };
}

function edited(text: string, path: JSONPath, value: unknown): string {
  const formattingOptions = { insertSpaces: true, tabSize: 4, eol: text.includes("\r\n") ? "\r\n" : "\n" };
  return applyEdits(text, modify(text, path, value, { formattingOptions }));
}

function schemeIndex(settings: WtSettings): number {
  return Array.isArray(settings.schemes) ? settings.schemes.findIndex((scheme) => scheme?.name === SCHEME_NAME) : -1;
}

function defaultsOf(settings: WtSettings): Look {
  return settings.profiles?.defaults ?? {};
}

function writeSettings({ path, backup, text, previous, data }: SettingsWrite): ItemFields {
  return { ...writeTracked(path, text, backup), previous, data: { writer: WRITER, ...data } };
}

function withScheme(text: string, settings: WtSettings): string {
  if (!Array.isArray(settings.schemes)) return edited(text, ["schemes"], [picketScheme()]);
  const at = schemeIndex(settings);
  return edited(text, ["schemes", at >= 0 ? at : -1], picketScheme());
}

function schemeChange(file: SettingsFile, settings: WtSettings): Change[] {
  const at = schemeIndex(settings);
  if (at >= 0 && isDeepStrictEqual(settings.schemes?.[at], picketScheme())) return [];
  return [
    {
      id: `${WRITER}-scheme@${file.flavor}`,
      summary: `add the PicketAI colour scheme to ${file.path}`,
      restart: null,
      apply(_host, { backup }) {
        const { text, settings: current } = readSettings(file.path);
        const index = schemeIndex(current);
        const previous = index >= 0 ? { scheme: current.schemes?.[index] } : {};
        return writeSettings({ path: file.path, backup, text: withScheme(text, current), previous, data: { part: "scheme" } });
      },
    },
  ];
}

function profilesWithOwnLook(settings: WtSettings): string[] {
  const list = Array.isArray(settings.profiles?.list) ? settings.profiles.list : [];
  return list.filter((profile) => profile && ("colorScheme" in profile || profile.font?.face !== undefined)).map((profile) => String(profile.name ?? profile.guid));
}

function previousDefaults(defaults: Look): Record<string, unknown> {
  return {
    ...("colorScheme" in defaults ? { colorScheme: defaults.colorScheme } : {}),
    ...(defaults.font && "face" in defaults.font ? { face: defaults.font.face } : {}),
    hadFont: defaults.font !== undefined,
  };
}

function defaultsChange(file: SettingsFile, settings: WtSettings, { family }: PlanOptions): Change[] {
  const defaults = defaultsOf(settings);
  if (defaults.colorScheme === SCHEME_NAME && defaults.font?.face === family) return [];
  const ownLook = profilesWithOwnLook(settings);
  return [
    {
      id: `${WRITER}-defaults@${file.flavor}`,
      summary: `set profiles.defaults colorScheme "${SCHEME_NAME}" and font.face "${family}" in ${file.path}`,
      question: "Make PicketAI the default for all Windows Terminal profiles?",
      restart: null,
      setsFont: true,
      ...(ownLook.length ? { manual: `these Windows Terminal profiles set their own colour scheme or font and keep it: ${ownLook.join(", ")}` } : {}),
      apply(_host, { backup }) {
        const { text, settings: current } = readSettings(file.path);
        const withColor = edited(text, [...DEFAULTS, "colorScheme"], SCHEME_NAME);
        const withFont = edited(withColor, [...DEFAULTS, "font", "face"], family);
        return writeSettings({ path: file.path, backup, text: withFont, previous: previousDefaults(defaultsOf(current)), data: { part: "defaults", face: family } });
      },
    },
  ];
}

function note(id: string, summary: string, manual: string): Change {
  return { id, summary, manual };
}

function planFile(file: SettingsFile, options: PlanOptions): Change[] {
  const { settings } = readSettings(file.path);
  if (Array.isArray(settings.profiles)) {
    return [note(`${WRITER}-legacy@${file.flavor}`, `${file.path} keeps its profiles as a plain list`, `${file.path} uses the old profiles list, so Picket did not edit it; add the PicketAI scheme and pick it in Settings`)];
  }
  return [...schemeChange(file, settings), ...defaultsChange(file, settings, options)];
}

function plan(host: Host, options: PlanOptions): Change[] {
  const files = settingsFiles(host);
  if (files.length === 0) {
    return [note(`${WRITER}-missing`, "no Windows Terminal settings.json found", `open Windows Terminal, choose Settings > Open JSON file once, then run picket style apply again`)];
  }
  return files.flatMap((file) => planFile(file, options));
}

function restored(text: string, path: JSONPath, previous: Record<string, unknown>, key: string): string {
  return edited(text, path, key in previous ? previous[key] : undefined);
}

function withoutScheme(text: string, settings: WtSettings, previous: Record<string, unknown>): string {
  const at = schemeIndex(settings);
  return at < 0 ? text : restored(text, ["schemes", at], previous, "scheme");
}

function withoutDefaults(text: string, settings: WtSettings, previous: Record<string, unknown>, face: unknown): string {
  const defaults = defaultsOf(settings);
  let next = text;
  if (defaults.colorScheme === SCHEME_NAME) next = restored(next, [...DEFAULTS, "colorScheme"], previous, "colorScheme");
  if (defaults.font?.face === face) next = restored(next, [...DEFAULTS, "font", "face"], previous, "face");
  const font = defaultsOf(parse(next, [], { allowTrailingComma: true }) as WtSettings).font;
  if (!previous.hadFont && font && Object.keys(font).length === 0) next = edited(next, [...DEFAULTS, "font"], undefined);
  return next;
}

function unapply(item: ManifestItem): Unapplied {
  const path = item.path as string;
  const previous = item.previous ?? {};
  const { text, settings } = readSettings(path);
  const next = item.data?.part === "scheme" ? withoutScheme(text, settings, previous) : withoutDefaults(text, settings, previous, item.data?.face);
  if (next !== text) writeFileSync(path, next);
  return { result: "removed" };
}

export const writer: TerminalWriter = {
  plan: (host, _manifest, options) => plan(host, options),
  unapply,
};
