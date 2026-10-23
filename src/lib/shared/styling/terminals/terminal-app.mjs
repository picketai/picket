import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { picketHome, writeTracked } from "../manifest.mts";
import { ANSI, TERMINAL, rgb } from "../palette.mts";
import { xmlPlist } from "./plist.mjs";

const WRITER = "terminal-app";
const PROFILE = "PicketAI";
const DOMAIN = "com.apple.Terminal";
const DEFAULT_KEYS = ["Default Window Settings", "Startup Window Settings"];
const FONT_POSTSCRIPT_NAME = "JetBrainsMonoNFM-Regular";
const FONT_SIZE = 13;
const SLOT_NAMES = { black: "Black", red: "Red", green: "Green", yellow: "Yellow", blue: "Blue", purple: "Magenta", cyan: "Cyan", white: "White" };
const LOW_COLOUR_NOTE = "Terminal.app versions without 24-bit colour approximate the PicketAI hex values";

export function profileColors() {
  const colors = {
    BackgroundColor: TERMINAL.background,
    TextColor: TERMINAL.foreground,
    TextBoldColor: TERMINAL.foreground,
    CursorColor: TERMINAL.cursor,
    SelectionColor: TERMINAL.selection,
  };
  for (const [slot, [normal, bright]] of Object.entries(ANSI)) {
    colors[`ANSI${SLOT_NAMES[slot]}Color`] = normal;
    colors[`ANSIBright${SLOT_NAMES[slot]}Color`] = bright;
  }
  return colors;
}

function bridge(framework) {
  return `ObjC.import(${JSON.stringify(framework)});`;
}

export function archiveScript() {
  const colors = Object.fromEntries(Object.entries(profileColors()).map(([key, hex]) => [key, rgb(hex)]));
  return [
    bridge("AppKit"),
    "function archived(object) {",
    "  return $.NSKeyedArchiver.archivedDataWithRootObjectRequiringSecureCodingError(object, false, null).base64EncodedStringWithOptions(0).js;",
    "}",
    `const colors = ${JSON.stringify(colors)};`,
    "const out = {};",
    "for (const key in colors) {",
    "  const [r, g, b] = colors[key];",
    "  out[key] = archived($.NSColor.colorWithSRGBRedGreenBlueAlpha(r / 255, g / 255, b / 255, 1));",
    "}",
    `out.Font = archived($.NSFont.fontWithNameSize(${JSON.stringify(FONT_POSTSCRIPT_NAME)}, ${FONT_SIZE}));`,
    "JSON.stringify(out);",
  ].join("\n");
}

export function removalScript() {
  return [
    bridge("Foundation"),
    "const defaults = $.NSUserDefaults.standardUserDefaults;",
    `const domain = defaults.persistentDomainForName(${JSON.stringify(DOMAIN)}).mutableCopy;`,
    'const settings = domain.objectForKey("Window Settings").mutableCopy;',
    `settings.removeObjectForKey(${JSON.stringify(PROFILE)});`,
    'domain.setObjectForKey(settings, "Window Settings");',
    `defaults.setPersistentDomainForName(domain, ${JSON.stringify(DOMAIN)});`,
    '"removed";',
  ].join("\n");
}

function profilePath(host) {
  return join(picketHome(host.home), "terminal", `${PROFILE}.terminal`);
}

function run(host, command, args) {
  const result = host.exec(command, args);
  if (result.status !== 0) throw new Error(`${command} ${args[0]} failed: ${result.stderr.trim()}`);
  return result.stdout;
}

function archivedValues(host) {
  const values = JSON.parse(run(host, "osascript", ["-l", "JavaScript", "-e", archiveScript()]));
  return Object.fromEntries(Object.entries(values).map(([key, base64]) => [key, { data: base64 }]));
}

export function profileFile(values) {
  return xmlPlist({ name: PROFILE, type: "Window Settings", ProfileCurrentVersion: 2.07, ...values });
}

function readDefault(host, key) {
  const result = host.exec("defaults", ["read", DOMAIN, key]);
  return result.status === 0 ? result.stdout.trim() : null;
}

function profileChange(host) {
  const path = profilePath(host);
  const id = `${WRITER}-profile`;
  return {
    id,
    summary: `write the ${PROFILE} Terminal.app profile to ${path} and import it`,
    restart: "Terminal.app, so it loads the PicketAI profile",
    manual: LOW_COLOUR_NOTE,
    apply(host, { backup }) {
      const written = writeTracked(path, profileFile(archivedValues(host)), backup);
      run(host, "open", [path]);
      return { ...written, kind: "external", previous: {}, data: { writer: WRITER, part: "profile" } };
    },
  };
}

function defaultChange() {
  const id = `${WRITER}-default`;
  return {
    id,
    summary: `make ${PROFILE} the default and startup Terminal.app profile`,
    question: "Make PicketAI the default Terminal.app profile?",
    restart: "Terminal.app, so new windows open with PicketAI",
    setsFont: true,
    apply(host) {
      const previous = Object.fromEntries(DEFAULT_KEYS.map((key) => [key, readDefault(host, key)]));
      for (const key of DEFAULT_KEYS) run(host, "defaults", ["write", DOMAIN, key, "-string", PROFILE]);
      return { kind: "external", previous, data: { writer: WRITER, part: "default" } };
    },
  };
}

function plan(host, manifest) {
  const imported = manifest.items.some((recorded) => recorded.id === `${WRITER}-profile`) && existsSync(profilePath(host));
  const isDefault = DEFAULT_KEYS.every((key) => readDefault(host, key) === PROFILE);
  return [...(imported ? [] : [profileChange(host)]), ...(isDefault ? [] : [defaultChange()])];
}

function unapplyDefault(item, host) {
  for (const key of DEFAULT_KEYS) {
    if (readDefault(host, key) !== PROFILE) continue;
    const before = item.previous[key];
    run(host, "defaults", before === null ? ["delete", DOMAIN, key] : ["write", DOMAIN, key, "-string", before]);
  }
  return { result: "removed" };
}

function unapply(item, host) {
  if (item.data.part === "default") return unapplyDefault(item, host);
  run(host, "osascript", ["-l", "JavaScript", "-e", removalScript()]);
  rmSync(item.path, { force: true });
  return { result: "removed" };
}

export const terminalApp = { id: WRITER, name: "Terminal.app", plan, unapply };
