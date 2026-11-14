import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const RECORDED_MODEL = join(HERE, "compose-config.json");
const RECORDED_ROOT = '"/umbrella/';
const VALUE_FLAGS = new Set(["--project-directory", "-f", "-p"]);
const PUBLISHED = "0.0.0.0:49153";

function parsed(args) {
  const flags = { files: [], projectDirectory: null };
  const rest = [];
  for (let i = 0; i < args.length; i++) {
    if (!VALUE_FLAGS.has(args[i])) {
      rest.push(args[i]);
      continue;
    }
    if (args[i] === "-f") flags.files.push(args[i + 1]);
    if (args[i] === "--project-directory") flags.projectDirectory = args[i + 1];
    i++;
  }
  return { ...flags, words: rest };
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

function answer({ words, projectDirectory }) {
  const call = words.join(" ");
  if (call === "info --format json") return `${JSON.stringify({ OSType: "linux", MemTotal: 8589934592 })}\n`;
  if (call === "compose version --format json") return `${JSON.stringify({ version: "v2.99.0-fixture" })}\n`;
  if (call === "compose config --profiles") return "picket-data\n";
  if (call === "compose config --format json --profile picket-data") return recordedModel(projectDirectory);
  if (words[0] === "image" && words[1] === "inspect" && words.length === 3) return imageInspect(words[2]);
  if (words[0] === "compose" && words[1] === "port" && words.length === 4) return `${PUBLISHED}\n`;
  if (words[0] === "compose" && ["build", "up", "stop"].includes(words[1])) return "";
  return null;
}

const call = parsed(process.argv.slice(2));
const missing = call.files.find((file) => !existsSync(file));
const output = missing === undefined ? answer(call) : null;

if (missing !== undefined) {
  process.stderr.write(`fake engine: open ${missing}: no such file or directory\n`);
  process.exitCode = 1;
} else if (output === null) {
  process.stderr.write(`fake engine: no answer for "${call.words.join(" ")}"\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(output);
}
