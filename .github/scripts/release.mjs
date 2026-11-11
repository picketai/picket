import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PLUGIN_MANIFESTS = ["src/.claude-plugin/plugin.json"];
const VERSION_VALUE = /("version"\s*:\s*")[^"]*(")/g;

export function syncPluginVersion(manifestText, version, manifestPath = "the plugin manifest") {
  const found = manifestText.match(VERSION_VALUE)?.length ?? 0;
  if (found !== 1) throw new Error(`${manifestPath} holds ${found} version values; expected exactly one`);
  return manifestText.replace(VERSION_VALUE, `$1${version}$2`);
}

export function checkTag(refName, version) {
  if (refName !== `v${version}`) throw new Error(`tag ${refName} does not match package.json version ${version} (expected v${version})`);
}

export function distTag(version) {
  const prerelease = version.split("+")[0].split("-").slice(1).join("-");
  if (!prerelease) return "latest";
  const identifier = prerelease.split(".")[0];
  if (!/^[a-z]+$/.test(identifier)) throw new Error(`version ${version} has prerelease identifier "${identifier}"; a dist-tag needs lowercase letters such as alpha`);
  return identifier;
}

const NEWEST_HEADING = /^## [^\r\n]*/m;
const UNRELEASED_HEADING = /^## (\S+) \(not released yet\)$/;

function newestHeading(changelogText) {
  const found = changelogText.match(NEWEST_HEADING);
  if (!found) throw new Error('CHANGELOG.md has no "## " heading');
  return { line: found[0], index: found.index };
}

export function releaseVersion(changelogText) {
  const { line } = newestHeading(changelogText);
  const unreleased = line.match(UNRELEASED_HEADING);
  if (!unreleased) throw new Error(`newest CHANGELOG.md heading "${line}" does not end "(not released yet)"`);
  return unreleased[1];
}

export function renameRelease(changelogText, version) {
  const prepared = releaseVersion(changelogText);
  if (prepared !== version) throw new Error(`newest CHANGELOG.md heading prepares ${prepared}, not ${version}`);
  const { line, index } = newestHeading(changelogText);
  return changelogText.slice(0, index) + `## ${version}` + changelogText.slice(index + line.length);
}

function changelogPath(root) {
  return join(root, "CHANGELOG.md");
}

function printReleaseVersion(root) {
  console.log(releaseVersion(readFileSync(changelogPath(root), "utf8")));
}

function renameChangelog(root, version) {
  const file = changelogPath(root);
  writeFileSync(file, renameRelease(readFileSync(file, "utf8"), version));
}

function packageVersion(root) {
  return JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version;
}

function syncVersion(root) {
  const version = packageVersion(root);
  const synced = PLUGIN_MANIFESTS.map((manifestPath) => {
    const file = join(root, manifestPath);
    return { file, text: syncPluginVersion(readFileSync(file, "utf8"), version, manifestPath) };
  });
  for (const { file, text } of synced) writeFileSync(file, text);
}

function printDistTag(root, refName) {
  const version = packageVersion(root);
  if (refName) checkTag(refName, version);
  console.log(distTag(version));
}

function rootOption(args) {
  const i = args.indexOf("--root");
  return i >= 0 && args[i + 1] ? resolve(args[i + 1]) : process.cwd();
}

function requiredVersion(args) {
  const version = args[0];
  if (!version || version === "--root") throw new Error("changelog-rename needs a version: changelog-rename <version> [--root <dir>]");
  return version;
}

function main(args) {
  const [verb, ...rest] = args;
  switch (verb) {
    case "sync-version":
      return syncVersion(rootOption(rest));
    case "dist-tag":
      return printDistTag(process.cwd(), rest[0]);
    case "changelog-check":
      return printReleaseVersion(rootOption(rest));
    case "changelog-rename":
      return renameChangelog(rootOption(rest), requiredVersion(rest));
    default:
      throw new Error(`unknown verb: ${verb ?? "(none)"}; expected sync-version, dist-tag, changelog-check or changelog-rename`);
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
