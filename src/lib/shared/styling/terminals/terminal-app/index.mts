import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { xmlPlist, type PlistValue } from "../../../../util/plist.mts";
import type { Change } from "../../change.mts";
import type { Host } from "../../host.mts";
import { picketHome, writeTracked, type Manifest, type ManifestItem, type Unapplied } from "../../manifest.mts";
import { ANSI, TERMINAL, rgb } from "../../palette.mts";
import type { TerminalWriter } from "../../terminals.mts";

const WRITER = "terminal-app";
const PROFILE = "PicketAI";
const DOMAIN = "com.apple.Terminal";
const DEFAULT_KEYS = ["Default Window Settings", "Startup Window Settings"];
const FONT_POSTSCRIPT_NAME = "JetBrainsMonoNFM-Regular";
const FONT_SIZE = 13;
const SLOT_NAMES: Record<string, string> = { black: "Black", red: "Red", green: "Green", yellow: "Yellow", blue: "Blue", purple: "Magenta", cyan: "Cyan", white: "White" };
const LOW_COLOUR_NOTE = "Terminal.app versions without 24-bit colour approximate the PicketAI hex values";

export function profileColors(): Record<string, string> {
  const colors: Record<string, string> = {
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

function bridge(framework: string): string {
  return `ObjC.import(${JSON.stringify(framework)});`;
}

export function archiveScript(): string {
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

export function removalScript(): string {
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

function profilePath(host: Host): string {
  return join(picketHome(host.home), "terminal", `${PROFILE}.terminal`);
}

function run(host: Host, command: string, args: string[]): string {
  const result = host.exec(command, args);
  if (result.status !== 0) throw new Error(`${command} ${args[0]} failed: ${result.stderr.trim()}`);
  return result.stdout;
}

function archivedValues(host: Host): Record<string, PlistValue> {
  const values: Record<string, string> = JSON.parse(run(host, "osascript", ["-l", "JavaScript", "-e", archiveScript()]));
  return Object.fromEntries(Object.entries(values).map(([key, base64]) => [key, { data: base64 }]));
}

export function profileFile(values: Record<string, PlistValue>): string {
  return xmlPlist({ name: PROFILE, type: "Window Settings", ProfileCurrentVersion: 2.07, ...values });
}

function readDefault(host: Host, key: string): string | null {
  const result = host.exec("defaults", ["read", DOMAIN, key]);
  return result.status === 0 ? result.stdout.trim() : null;
}

function profileChange(host: Host): Change {
  const path = profilePath(host);
  return {
    id: `${WRITER}-profile`,
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

function defaultChange(): Change {
  return {
    id: `${WRITER}-default`,
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

function plan(host: Host, manifest: Manifest): Change[] {
  const imported = manifest.items.some((recorded) => recorded.id === `${WRITER}-profile`) && existsSync(profilePath(host));
  const isDefault = DEFAULT_KEYS.every((key) => readDefault(host, key) === PROFILE);
  return [...(imported ? [] : [profileChange(host)]), ...(isDefault ? [] : [defaultChange()])];
}

function unapplyDefault(item: ManifestItem, host: Host): Unapplied {
  for (const key of DEFAULT_KEYS) {
    if (readDefault(host, key) !== PROFILE) continue;
    const before = item.previous?.[key] as string | null;
    run(host, "defaults", before === null ? ["delete", DOMAIN, key] : ["write", DOMAIN, key, "-string", before]);
  }
  return { result: "removed" };
}

function unapply(item: ManifestItem, host: Host): Unapplied {
  if (item.data?.part === "default") return unapplyDefault(item, host);
  run(host, "osascript", ["-l", "JavaScript", "-e", removalScript()]);
  rmSync(item.path as string, { force: true });
  return { result: "removed" };
}

export const writer: TerminalWriter = {
  plan,
  unapply,
};
