import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { createInterface } from "node:readline/promises";

function exec(command, args) {
  const run = spawnSync(command, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  return { status: run.error ? null : run.status, stdout: run.stdout ?? "", stderr: run.stderr ?? run.error?.message ?? "" };
}

function answerOf(text, { choices, fallback }) {
  const answer = text.trim().toLowerCase();
  if (answer === "") return fallback;
  if (!choices) return answer;
  return choices.includes(answer) ? answer : fallback;
}

async function askTerminal(question, options) {
  const choices = options.choices ? ` [${options.choices.join("/")}]` : "";
  const reader = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return answerOf(await reader.question(`${question}${choices} `), options);
  } finally {
    reader.close();
  }
}

export function realHost() {
  const interactive = Boolean(process.stdin.isTTY && process.stdout.isTTY);
  return {
    platform: process.platform,
    home: homedir(),
    env: process.env,
    now: () => Date.now(),
    exec,
    fetch: globalThis.fetch,
    interactive,
    ask: (question, options) => (interactive ? askTerminal(question, options) : Promise.resolve(options.fallback)),
  };
}
