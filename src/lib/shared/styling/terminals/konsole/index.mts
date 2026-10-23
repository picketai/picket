import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getKey, removeKey, renderIni, setKey } from "../../../../util/ini.mts";
import type { Change } from "../../change.mts";
import type { Host } from "../../host.mts";
import { writeTracked, type ManifestItem, type Unapplied } from "../../manifest.mts";
import { ANSI, TERMINAL, rgb } from "../../palette.mts";
import type { TerminalWriter } from "../../terminals.mts";
import { keptFile, keyfileChange } from "../keyfile.mts";

const WRITER = "konsole";
const PROFILE_FILE = "PicketAI.profile";
const RC_SECTION = "Desktop Entry";
const RC_KEY = "DefaultProfile";

function dataHome(host: Host): string {
  return join(host.env.XDG_DATA_HOME || join(host.home, ".local", "share"), "konsole");
}

function konsolerc(host: Host): string {
  return join(host.env.XDG_CONFIG_HOME || join(host.home, ".config"), "konsolerc");
}

function color(hex: string): [string, string][] {
  return [["Color", rgb(hex).join(",")]];
}

export function colorscheme(): string {
  const slots = Object.values(ANSI);
  return renderIni([
    ["Background", color(TERMINAL.background)],
    ["BackgroundIntense", color(TERMINAL.background)],
    ...slots.map(([normal], i): [string, [string, string][]] => [`Color${i}`, color(normal)]),
    ...slots.map(([, bright], i): [string, [string, string][]] => [`Color${i}Intense`, color(bright)]),
    ["Foreground", color(TERMINAL.foreground)],
    ["ForegroundIntense", color(ANSI.white[1])],
    ["General", [["Description", "PicketAI"], ["Opacity", "1"]]],
  ]);
}

export function profile(family: string): string {
  return renderIni([
    ["Appearance", [["ColorScheme", "PicketAI"], ["Font", `${family},11,-1,5,50,0,0,0,0,0`]]],
    ["General", [["Name", "PicketAI"]]],
  ]);
}

function defaultChange(host: Host): Change[] {
  const path = konsolerc(host);
  const current = existsSync(path) ? readFileSync(path, "utf8") : "";
  if (getKey(current, RC_SECTION, RC_KEY) === PROFILE_FILE) return [];
  const id = `${WRITER}-default`;
  return [
    {
      id,
      summary: `set ${RC_KEY}=${PROFILE_FILE} in ${path}`,
      question: "Make PicketAI the default Konsole profile?",
      restart: "Konsole, so new windows open with PicketAI",
      setsFont: true,
      apply(_host, { backup }) {
        const text = existsSync(path) ? readFileSync(path, "utf8") : "";
        const before = getKey(text, RC_SECTION, RC_KEY);
        return {
          ...writeTracked(path, setKey(text, RC_SECTION, RC_KEY, PROFILE_FILE), backup),
          previous: before === undefined ? {} : { [RC_KEY]: before },
          data: { writer: WRITER, part: "default" },
        };
      },
    },
  ];
}

function unapply(item: ManifestItem): Unapplied {
  if (item.data?.part === "file") return keptFile(item);
  const path = item.path as string;
  const previous = item.previous ?? {};
  const text = readFileSync(path, "utf8");
  if (getKey(text, RC_SECTION, RC_KEY) !== PROFILE_FILE) return { result: "kept", detail: `${RC_KEY} was changed after setup` };
  const next = RC_KEY in previous ? setKey(text, RC_SECTION, RC_KEY, String(previous[RC_KEY])) : removeKey(text, RC_SECTION, RC_KEY);
  writeFileSync(path, next);
  return { result: "removed" };
}

export const writer: TerminalWriter = {
  plan: (host, _manifest, { family }) => [
    ...keyfileChange({ id: `${WRITER}-colorscheme`, path: join(dataHome(host), "PicketAI.colorscheme"), content: colorscheme(), writer: WRITER }),
    ...keyfileChange({ id: `${WRITER}-profile`, path: join(dataHome(host), PROFILE_FILE), content: profile(family), writer: WRITER }),
    ...defaultChange(host),
  ],
  unapply,
};
