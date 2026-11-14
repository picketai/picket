import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const RECORDED_MODEL = join(HERE, "compose-config.json");
const RECORDED_ROOT = '"/umbrella/';
const VALUE_FLAGS = new Set(["--project-directory", "-f", "-p"]);
const COMPOSE_GLOBAL_FLAGS = new Set([...VALUE_FLAGS, "--profile"]);
const PUBLISHED = "0.0.0.0:49153";
const FAKE_IMAGE = "sha256:0f0f0f0f0f0f";
const DATA_PROFILE = "picket-data";
const ESC = "\u001b";
const COMPOSE_PROVIDER = "/usr/libexec/docker/cli-plugins/docker-compose";
const PROVIDER_BANNER = `>>>> Executing external compose provider "${COMPOSE_PROVIDER}". Please see podman-compose(1) for how to disable this message. <<<<`;

function flagValues(pairs) {
  const valuesOf = (flag) => pairs.filter(([name]) => name === flag).map(([, value]) => value);
  return { files: valuesOf("-f"), projectDirectory: valuesOf("--project-directory").at(-1) ?? null, profiles: valuesOf("--profile") };
}

function parsedCompose(args) {
  const pairs = [];
  let next = 1;
  while (next < args.length && COMPOSE_GLOBAL_FLAGS.has(args[next])) {
    pairs.push([args[next], args[next + 1]]);
    next += 2;
  }
  const rest = args.slice(next);
  return { ...flagValues(pairs), words: ["compose", ...rest], misplaced: rest.find((arg) => COMPOSE_GLOBAL_FLAGS.has(arg)) ?? null };
}

function parsedEngine(args) {
  const pairs = [];
  const words = [];
  for (let i = 0; i < args.length; i++) {
    if (!VALUE_FLAGS.has(args[i])) {
      words.push(args[i]);
      continue;
    }
    pairs.push([args[i], args[i + 1]]);
    i++;
  }
  return { ...flagValues(pairs), words, misplaced: null };
}

function parsed(args) {
  return args[0] === "compose" ? parsedCompose(args) : parsedEngine(args);
}

function unknownFlag(flag) {
  return flag.startsWith("--") ? `unknown flag: ${flag}` : `unknown shorthand flag: '${flag.slice(1)}' in ${flag}`;
}

function recordedModel(projectDirectory) {
  const text = readFileSync(RECORDED_MODEL, "utf8");
  if (projectDirectory === null) return text;
  const root = dirname(dirname(projectDirectory)).replaceAll("\\", "/");
  return text.replaceAll(RECORDED_ROOT, `"${root}/`);
}

function imageInspect(image) {
  const revision = image.slice(image.lastIndexOf(":") + 1);
  return `${JSON.stringify([{ Config: { Labels: { "org.opencontainers.image.revision": revision } } }])}\n`;
}

function answer({ words, projectDirectory, profiles }) {
  const call = words.join(" ");
  if (call === "info --format json") return `${JSON.stringify({ OSType: "linux", MemTotal: 8589934592 })}\n`;
  if (call === "compose version --format json") return `${JSON.stringify({ version: "v2.99.0-fixture" })}\n`;
  if (call === "compose config --profiles") return `${DATA_PROFILE}\n`;
  if (call === "compose config --format json" && profiles.includes(DATA_PROFILE)) return recordedModel(projectDirectory);
  if (words[0] === "image" && words[1] === "inspect" && words.length === 3) return imageInspect(words[2]);
  if (words[0] === "compose" && words[1] === "port" && words.length === 4) return `${PUBLISHED}\n`;
  if (words[0] === "compose" && ["build", "up", "stop", "down"].includes(words[1])) return "";
  if (words[0] === "image" && words[1] === "ls") return `${FAKE_IMAGE}\n`;
  if (words[0] === "ps") return "";
  if (["volume", "network"].includes(words[0]) && words[1] === "ls") return "";
  if (words[0] === "image" && words[1] === "rm") return "";
  return null;
}

function failureCause(call) {
  const missing = call.files.find((file) => !existsSync(file));
  if (call.misplaced !== null) return unknownFlag(call.misplaced);
  if (missing !== undefined) return `fake engine: open ${missing}: no such file or directory`;
  return `fake engine: no answer for "${call.words.join(" ")}"`;
}

function podmanComposeStderr(cause, composeArgs) {
  const banner = `${ESC}[4m${PROVIDER_BANNER}\n\n${ESC}[0m`;
  return `${banner}${cause}\nError: executing ${COMPOSE_PROVIDER} ${composeArgs.join(" ")}: exit status 1\n`;
}

const args = process.argv.slice(2);
const call = parsed(args);
const ready = call.misplaced === null && call.files.every((file) => existsSync(file));
const output = ready ? answer(call) : null;

if (output === null) {
  const cause = failureCause(call);
  process.stderr.write(args[0] === "compose" ? podmanComposeStderr(cause, args.slice(1)) : `${cause}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(output);
}
