import { createHash } from "node:crypto";
import { once } from "node:events";
import { createWriteStream, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { finished } from "node:stream/promises";
import { dirname, join } from "node:path";
import { extractEntry, readEntries } from "../../../../util/zip.mts";
import type { ProgramResult } from "../../../../util/process.mts";
import { pluginRoot } from "../../../paths.mts";
import type { Change, Component } from "../../change.mts";
import type { Host } from "../../host.mts";
import { picketHome, type ItemFields, type Manifest, type ManifestItem, type Unapplied } from "../../manifest.mts";

export type Pin = { version: string; url: string; sha256: string; family: string; files: string };
export type FontPresence = { present: boolean; where: string | null };

type FontData = { preexisting: boolean; where?: string | null; via?: "brew" | "files"; files: string[]; registry: string[] };
type Installed = { files: string[]; registry: string[] };

const NAME = "font";
const CASK = "font-jetbrains-mono-nerd-font";
const USER_FONTS_KEY = "HKCU\\Software\\Microsoft\\Windows NT\\CurrentVersion\\Fonts";
const MACHINE_FONTS_KEY = "HKLM\\Software\\Microsoft\\Windows NT\\CurrentVersion\\Fonts";
const RESTART = "your terminal, so it sees JetBrainsMono Nerd Font Mono";

export function readPin(): Pin {
  return JSON.parse(readFileSync(join(pluginRoot(), "lib", "shared", "styling", "nerd-font.json"), "utf8"));
}

function failure(message: string, manual: string): Error & { manual: string } {
  return Object.assign(new Error(message), { manual });
}

function succeeded(run: ProgramResult): boolean {
  return run.status === 0;
}

function usesFontconfig(host: Host): boolean {
  return host.platform !== "win32" && host.platform !== "darwin";
}

export function fontDir(host: Host): string {
  if (host.platform === "win32") return join(host.env.LOCALAPPDATA ?? join(host.home, "AppData", "Local"), "Microsoft", "Windows", "Fonts");
  if (host.platform === "darwin") return join(host.home, "Library", "Fonts");
  return join(host.env.XDG_DATA_HOME || join(host.home, ".local", "share"), "fonts");
}

function systemFontDirs(host: Host): string[] {
  if (host.platform === "win32") return host.env.WINDIR ? [join(host.env.WINDIR, "Fonts")] : [];
  if (host.platform === "darwin") return ["/Library/Fonts"];
  return [];
}

function folderHolds(dir: string, pattern: RegExp): boolean {
  try {
    return readdirSync(dir).some((name) => pattern.test(name));
  } catch {
    return false;
  }
}

function hasBrew(host: Host): boolean {
  return host.platform === "darwin" && succeeded(host.exec("brew", ["--version"]));
}

function registeredIn(host: Host, key: string, family: string): boolean {
  const run = host.exec("reg", ["query", key]);
  return succeeded(run) && run.stdout.includes(family);
}

function softwareSource(host: Host, pin: Pin): string | null {
  if (host.platform === "win32") return [USER_FONTS_KEY, MACHINE_FONTS_KEY].find((key) => registeredIn(host, key, pin.family)) ?? null;
  if (host.platform === "darwin") return succeeded(host.exec("brew", ["list", "--cask", CASK])) ? `brew cask ${CASK}` : null;
  const run = host.exec("fc-list", [":", "family"]);
  return succeeded(run) && run.stdout.includes(pin.family) ? "fontconfig" : null;
}

export function detectFont(host: Host, pin: Pin): FontPresence {
  const pattern = new RegExp(pin.files);
  const where = softwareSource(host, pin) ?? [fontDir(host), ...systemFontDirs(host)].find((dir) => folderHolds(dir, pattern)) ?? null;
  return { present: where !== null, where };
}

function styleOf(file: string): string {
  const style = file.replace(/^.*-/, "").replace(/\.ttf$/i, "");
  return style.replace(/([a-z])([A-Z])/g, "$1 $2");
}

export function registryName(family: string, file: string): string {
  return `${family} ${styleOf(file)} (TrueType)`;
}

function byHand(pin: Pin, target: string): string {
  return `download ${pin.url} and copy its JetBrainsMonoNerdFontMono-*.ttf files into ${target}`;
}

async function download(host: Host, pin: Pin, path: string): Promise<string> {
  const response = await host.fetch(pin.url);
  if (!response.ok) throw new Error(`download failed with HTTP ${response.status}`);
  if (response.body === null) throw new Error("download failed: the response has no body");
  mkdirSync(dirname(path), { recursive: true });
  const hash = createHash("sha256");
  const out = createWriteStream(path);
  try {
    for await (const chunk of response.body) {
      hash.update(chunk);
      if (!out.write(chunk)) await once(out, "drain");
    }
  } finally {
    out.end();
    await finished(out);
  }
  return hash.digest("hex");
}

function fileName(entryName: string): string {
  return entryName.split(/[\\/]/).pop() ?? entryName;
}

function unpack(zip: string, pin: Pin, target: string): string[] {
  const pattern = new RegExp(pin.files);
  const written: string[] = [];
  mkdirSync(target, { recursive: true });
  for (const entry of readEntries(zip)) {
    const name = fileName(entry.name);
    if (!pattern.test(name)) continue;
    const path = join(target, name);
    writeFileSync(path, extractEntry(zip, entry));
    written.push(path);
  }
  if (written.length === 0) throw new Error(`the archive holds no file matching ${pin.files}`);
  return written;
}

function deleteValue(host: Host, name: string): ProgramResult {
  return host.exec("reg", ["delete", USER_FONTS_KEY, "/v", name, "/f"]);
}

function register(host: Host, pin: Pin, files: string[]): string[] {
  if (usesFontconfig(host)) host.exec("fc-cache", ["-f"]);
  if (host.platform !== "win32") return [];
  const added: string[] = [];
  for (const path of files) {
    const name = registryName(pin.family, fileName(path));
    const run = host.exec("reg", ["add", USER_FONTS_KEY, "/v", name, "/t", "REG_SZ", "/d", path, "/f"]);
    if (!succeeded(run)) {
      const left = added.filter((done) => !succeeded(deleteValue(host, done)));
      const leftText = left.length ? `; remove these values by hand: ${left.join(", ")}` : "";
      throw new Error(`reg add for ${name} failed: ${run.stderr.trim()}${leftText}`);
    }
    added.push(name);
  }
  return added;
}

async function installFiles(host: Host, pin: Pin): Promise<Installed> {
  const target = fontDir(host);
  const zip = join(picketHome(host.home), "cache", "JetBrainsMono.zip");
  const files: string[] = [];
  try {
    const digest = await download(host, pin, zip);
    if (digest !== pin.sha256) throw new Error(`sha256 of the download is ${digest}, expected ${pin.sha256}; nothing was installed`);
    files.push(...unpack(zip, pin, target));
    return { files, registry: register(host, pin, files) };
  } catch (err) {
    for (const path of files) rmSync(path, { force: true });
    throw failure((err as Error).message, byHand(pin, target));
  } finally {
    rmSync(zip, { force: true });
  }
}

function installBrew(host: Host): void {
  const run = host.exec("brew", ["install", "--cask", CASK]);
  if (!succeeded(run)) throw failure(`brew install --cask ${CASK} failed: ${run.stderr.trim()}`, `run brew install --cask ${CASK}`);
}

function external(data: Partial<FontData>): ItemFields {
  return { kind: "external", data };
}

function recordChange(pin: Pin, where: string | null): Change {
  return {
    id: NAME,
    summary: `${pin.family} is already installed (${where}); record it so removal never touches it`,
    restart: null,
    apply: () => external({ preexisting: true, where }),
  };
}

function installChange(host: Host, pin: Pin): Change {
  const brew = hasBrew(host);
  return {
    id: NAME,
    summary: brew ? `install ${pin.family} with brew install --cask ${CASK}` : `download ${pin.family} ${pin.version} from ${pin.url}, check its SHA-256 and install it into ${fontDir(host)}`,
    restart: RESTART,
    async apply(host) {
      if (brew) {
        installBrew(host);
        return external({ preexisting: false, via: "brew", files: [], registry: [] });
      }
      return external({ preexisting: false, via: "files", ...(await installFiles(host, pin)) });
    },
  };
}

function deleted(path: string): boolean {
  try {
    rmSync(path, { force: true });
  } catch {}
  return !existsSync(path);
}

function removeFiles(host: Host, data: FontData): void {
  const files = data.files.filter((path) => !deleted(path));
  const registry = data.registry.filter((name) => !succeeded(deleteValue(host, name)));
  if (usesFontconfig(host)) host.exec("fc-cache", ["-f"]);
  data.files = files;
  data.registry = registry;
  if (files.length + registry.length === 0) return;
  const steps = [...files.map((path) => `delete ${path}`), ...registry.map((name) => `delete the "${name}" value under ${USER_FONTS_KEY}`)];
  throw failure(`could not remove ${files.length} font file(s) and ${registry.length} registry value(s)`, `${steps.join("; ")} by hand`);
}

function unapply(item: ManifestItem, host: Host): Unapplied {
  const data = item.data as FontData;
  if (data.preexisting) return { result: "kept", detail: "installed before setup" };
  if (data.via === "brew") {
    const run = host.exec("brew", ["uninstall", "--cask", CASK]);
    if (!succeeded(run)) throw failure(`brew uninstall failed: ${run.stderr.trim()}`, `run brew uninstall --cask ${CASK}`);
    return { result: "removed" };
  }
  removeFiles(host, data);
  return { result: "removed" };
}

export function fontComponent(pin: Pin = readPin()): Component {
  return {
    name: NAME,
    plan(host: Host, manifest: Manifest) {
      if (manifest.items.some((recorded) => recorded.id === NAME)) return [];
      const { present, where } = detectFont(host, pin);
      return [present ? recordChange(pin, where) : installChange(host, pin)];
    },
    unapply,
  };
}

export const component = fontComponent();
