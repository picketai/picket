import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PLUGIN_MANIFEST = "core/.claude-plugin/plugin.json";
const VERSION_VALUE = /("version"\s*:\s*")[^"]*(")/g;

export function syncPluginVersion(manifestText, version) {
  const found = manifestText.match(VERSION_VALUE)?.length ?? 0;
  if (found !== 1) throw new Error(`${PLUGIN_MANIFEST} holds ${found} version values; expected exactly one`);
  return manifestText.replace(VERSION_VALUE, `$1${version}$2`);
}

function packageVersion(root) {
  return JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version;
}

function syncVersion(root) {
  const manifest = join(root, PLUGIN_MANIFEST);
  writeFileSync(manifest, syncPluginVersion(readFileSync(manifest, "utf8"), packageVersion(root)));
}

function rootOption(args) {
  const i = args.indexOf("--root");
  return i >= 0 && args[i + 1] ? resolve(args[i + 1]) : process.cwd();
}

function main(args) {
  const [verb, ...rest] = args;
  switch (verb) {
    case "sync-version":
      return syncVersion(rootOption(rest));
    default:
      throw new Error(`unknown verb: ${verb ?? "(none)"}; expected sync-version`);
  }
}

function isMainModule() {
  return Boolean(process.argv[1]) && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isMainModule()) {
  try {
    main(process.argv.slice(2));
  } catch (err) {
    console.error(`release: ${err.message}`);
    process.exit(1);
  }
}
