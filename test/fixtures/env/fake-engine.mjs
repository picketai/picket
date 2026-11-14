import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const RECORDED_MODEL = join(HERE, "compose-config.json");
const FILE_FLAGS = new Set(["--project-directory", "-f", "-p"]);

const ANSWERS = {
  "info --format json": () => `${JSON.stringify({ OSType: "linux", MemTotal: 8589934592 })}\n`,
  "compose version --format json": () => `${JSON.stringify({ version: "v2.99.0-fixture" })}\n`,
  "compose config --profiles": () => "picket-data\n",
  "compose config --format json --profile picket-data": () => readFileSync(RECORDED_MODEL, "utf8"),
};

function composeCall(args) {
  const files = [];
  const rest = [];
  for (let i = 0; i < args.length; i++) {
    if (FILE_FLAGS.has(args[i])) {
      if (args[i] === "-f") files.push(args[i + 1]);
      i++;
    } else rest.push(args[i]);
  }
  return { files, call: rest.join(" ") };
}

const { files, call } = composeCall(process.argv.slice(2));
const missing = files.find((file) => !existsSync(file));

if (missing !== undefined) {
  process.stderr.write(`fake engine: open ${missing}: no such file or directory\n`);
  process.exitCode = 1;
} else if (Object.hasOwn(ANSWERS, call)) {
  process.stdout.write(ANSWERS[call]());
} else {
  process.stderr.write(`fake engine: no answer for "${call}"\n`);
  process.exitCode = 1;
}
