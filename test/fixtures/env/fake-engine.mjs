const ANSWERS = {
  "info --format json": { OSType: "linux", MemTotal: 8589934592 },
  "compose version --format json": { version: "v2.99.0-fixture" },
};

const call = process.argv.slice(2).join(" ");

if (Object.hasOwn(ANSWERS, call)) {
  process.stdout.write(`${JSON.stringify(ANSWERS[call])}\n`);
} else {
  process.stderr.write(`fake engine: no answer for "${call}"\n`);
  process.exitCode = 1;
}
