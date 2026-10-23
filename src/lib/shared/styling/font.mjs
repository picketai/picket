import { createHash } from "node:crypto";
import { once } from "node:events";
import { createWriteStream, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { finished } from "node:stream/promises";
import { dirname, join } from "node:path";
import { pluginRoot } from "../paths.mts";
import { picketHome } from "./manifest.mts";
import { extractEntry, readEntries } from "./zip.mjs";

const NAME = "font";
const CASK = "font-jetbrains-mono-nerd-font";
const USER_FONTS_KEY = "HKCU\\Software\\Microsoft\\Windows NT\\CurrentVersion\\Fonts";
const MACHINE_FONTS_KEY = "HKLM\\Software\\Microsoft\\Windows NT\\CurrentVersion\\Fonts";
const RESTART = "your terminal, so it sees JetBrainsMono Nerd Font Mono";

export function readPin() {
  return JSON.parse(readFileSync(join(pluginRoot(), "lib", "shared", "styling", "nerd-font.json"), "utf8"));
}

function failure(message, manual) {
  return Object.assign(new Error(message), { manual });
}

function succeeded(run) {
  return run.status === 0;
}

function usesFontconfig(host) {
  return host.platform !== "win32" && host.platform !== "darwin";
}

export function fontDir(host) {
  if (host.platform === "win32") return join(host.env.LOCALAPPDATA ?? join(host.home, "AppData", "Local"), "Microsoft", "Windows", "Fonts");
  if (host.platform === "darwin") return join(host.home, "Library", "Fonts");
  return join(host.env.XDG_DATA_HOME || join(host.home, ".local", "share"), "fonts");
}

function systemFontDirs(host) {
  if (host.platform === "win32") return host.env.WINDIR ? [join(host.env.WINDIR, "Fonts")] : [];
  if (host.platform === "darwin") return ["/Library/Fonts"];
  return [];
}

function folderHolds(dir, pattern) {
  try {
    return readdirSync(dir).some((name) => pattern.test(name));
  } catch {
    return false;
  }
}

function hasBrew(host) {
  return host.platform === "darwin" && succeeded(host.exec("brew", ["--version"]));
}

function registeredIn(host, key, family) {
  const run = host.exec("reg", ["query", key]);
  return succeeded(run) && run.stdout.includes(family);
}

function softwareSource(host, pin) {
  if (host.platform === "win32") return [USER_FONTS_KEY, MACHINE_FONTS_KEY].find((key) => registeredIn(host, key, pin.family)) ?? null;
  if (host.platform === "darwin") return succeeded(host.exec("brew", ["list", "--cask", CASK])) ? `brew cask ${CASK}` : null;
  const run = host.exec("fc-list", [":", "family"]);
  return succeeded(run) && run.stdout.includes(pin.family) ? "fontconfig" : null;
}

export function detectFont(host, pin) {
  const pattern = new RegExp(pin.files);
  const where = softwareSource(host, pin) ?? [fontDir(host), ...systemFontDirs(host)].find((dir) => folderHolds(dir, pattern)) ?? null;
  return { present: where !== null, where };
}

function styleOf(file) {
  const style = file.replace(/^.*-/, "").replace(/\.ttf$/i, "");
  return style.replace(/([a-z])([A-Z])/g, "$1 $2");
}

export function registryName(family, file) {
  return `${family} ${styleOf(file)} (TrueType)`;
}

function byHand(pin, target) {
  return `download ${pin.url} and copy its JetBrainsMonoNerdFontMono-*.ttf files into ${target}`;
}

async function download(host, pin, path) {
  const response = await host.fetch(pin.url);
  if (!response.ok) throw new Error(`download failed with HTTP ${response.status}`);
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

function fileName(entryName) {
  return entryName.split(/[\\/]/).pop();
}

function unpack(zip, pin, target) {
  const pattern = new RegExp(pin.files);
  const written = [];
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

function register(host, pin, files) {
  if (usesFontconfig(host)) host.exec("fc-cache", ["-f"]);
  if (host.platform !== "win32") return [];
  const added = [];
  for (const path of files) {
    const name = registryName(pin.family, path.split(/[\\/]/).pop());
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

function deleteValue(host, name) {
  return host.exec("reg", ["delete", USER_FONTS_KEY, "/v", name, "/f"]);
}

async function installFiles(host, pin) {
  const target = fontDir(host);
  const zip = join(picketHome(host.home), "cache", "JetBrainsMono.zip");
  const files = [];
  try {
    const digest = await download(host, pin, zip);
    if (digest !== pin.sha256) throw new Error(`sha256 of the download is ${digest}, expected ${pin.sha256}; nothing was installed`);
    files.push(...unpack(zip, pin, target));
    return { files, registry: register(host, pin, files) };
  } catch (err) {
    for (const path of files) rmSync(path, { force: true });
    throw failure(err.message, byHand(pin, target));
  } finally {
    rmSync(zip, { force: true });
  }
}

function installBrew(host) {
  const run = host.exec("brew", ["install", "--cask", CASK]);
  if (!succeeded(run)) throw failure(`brew install --cask ${CASK} failed: ${run.stderr.trim()}`, `run brew install --cask ${CASK}`);
}

function external(data) {
  return { kind: "external", data };
}

function recordChange(pin, where) {
  return {
    id: NAME,
    summary: `${pin.family} is already installed (${where}); record it so removal never touches it`,
    restart: null,
    apply: () => external({ preexisting: true, where }),
  };
}

function installChange(host, pin) {
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

function deleted(path) {
  try {
    rmSync(path, { force: true });
  } catch {}
  return !existsSync(path);
}

function removeFiles(host, item) {
  const files = item.data.files.filter((path) => !deleted(path));
  const registry = item.data.registry.filter((name) => !succeeded(deleteValue(host, name)));
  if (usesFontconfig(host)) host.exec("fc-cache", ["-f"]);
  item.data.files = files;
  item.data.registry = registry;
  if (files.length + registry.length === 0) return;
  const steps = [...files.map((path) => `delete ${path}`), ...registry.map((name) => `delete the "${name}" value under ${USER_FONTS_KEY}`)];
  throw failure(`could not remove ${files.length} font file(s) and ${registry.length} registry value(s)`, `${steps.join("; ")} by hand`);
}

function unapply(item, host) {
  if (item.data.preexisting) return { result: "kept", detail: "installed before setup" };
  if (item.data.via === "brew") {
    const run = host.exec("brew", ["uninstall", "--cask", CASK]);
    if (!succeeded(run)) throw failure(`brew uninstall failed: ${run.stderr.trim()}`, `run brew uninstall --cask ${CASK}`);
    return { result: "removed" };
  }
  removeFiles(host, item);
  return { result: "removed" };
}

export function fontComponent(pin = readPin()) {
  return {
    name: NAME,
    plan(host, manifest) {
      if (manifest.items.some((recorded) => recorded.id === NAME)) return [];
      const { present, where } = detectFont(host, pin);
      return [present ? recordChange(pin, where) : installChange(host, pin)];
    },
    unapply,
  };
}
