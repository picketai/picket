import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { installedAt, sha256File } from "../manifest.mjs";
import { ANSI, TERMINAL, rgb } from "../palette.mjs";
import { getKey, keptFile, keyfileChange, removeKey, renderIni, setKey } from "./ini.mjs";

const WRITER = "konsole";
const PROFILE_FILE = "PicketAI.profile";
const RC_SECTION = "Desktop Entry";
const RC_KEY = "DefaultProfile";

function dataHome(host) {
  return join(host.env.XDG_DATA_HOME || join(host.home, ".local", "share"), "konsole");
}

function konsolerc(host) {
  return join(host.env.XDG_CONFIG_HOME || join(host.home, ".config"), "konsolerc");
}

function color(hex) {
  return [["Color", rgb(hex).join(",")]];
}

export function colorscheme() {
  const slots = Object.values(ANSI);
  return renderIni([
    ["Background", color(TERMINAL.background)],
    ["BackgroundIntense", color(TERMINAL.background)],
    ...slots.map(([normal], i) => [`Color${i}`, color(normal)]),
    ...slots.map(([, bright], i) => [`Color${i}Intense`, color(bright)]),
    ["Foreground", color(TERMINAL.foreground)],
    ["ForegroundIntense", color(ANSI.white[1])],
    ["General", [["Description", "PicketAI"], ["Opacity", "1"]]],
  ]);
}

export function profile(family) {
  return renderIni([
    ["Appearance", [["ColorScheme", "PicketAI"], ["Font", `${family},11,-1,5,50,0,0,0,0,0`]]],
    ["General", [["Name", "PicketAI"]]],
  ]);
}

function defaultChange(host, run) {
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
      apply(host, backup) {
        const existed = existsSync(path);
        const text = existed ? readFileSync(path, "utf8") : "";
        const before = getKey(text, RC_SECTION, RC_KEY);
        const backupPath = existed ? backup(path) : undefined;
        mkdirSync(dirname(path), { recursive: true });
        writeFileSync(path, setKey(text, RC_SECTION, RC_KEY, PROFILE_FILE));
        run.fontSet = true;
        return {
          id,
          component: "terminal",
          kind: existed ? "edited" : "created",
          path,
          ...(backupPath ? { backup: backupPath } : {}),
          sha256: sha256File(path),
          previous: before === undefined ? {} : { [RC_KEY]: before },
          data: { writer: WRITER, part: "default" },
          installedAt: installedAt(host),
        };
      },
    },
  ];
}

function plan(host, manifest, { family, run }) {
  return [
    ...keyfileChange({ id: `${WRITER}-colorscheme`, path: join(dataHome(host), "PicketAI.colorscheme"), content: colorscheme(), writer: WRITER }),
    ...keyfileChange({ id: `${WRITER}-profile`, path: join(dataHome(host), PROFILE_FILE), content: profile(family), writer: WRITER }),
    ...defaultChange(host, run),
  ];
}

function unapply(item) {
  if (item.data.part === "file") return keptFile(item);
  const text = readFileSync(item.path, "utf8");
  if (getKey(text, RC_SECTION, RC_KEY) !== PROFILE_FILE) return { result: "kept", detail: `${RC_KEY} was changed after setup` };
  const next = RC_KEY in item.previous ? setKey(text, RC_SECTION, RC_KEY, item.previous[RC_KEY]) : removeKey(text, RC_SECTION, RC_KEY);
  writeFileSync(item.path, next);
  return { result: "removed" };
}

export const konsole = { id: WRITER, name: "Konsole", plan, unapply };
