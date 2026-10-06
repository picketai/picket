import { readFileSync } from "node:fs";
import { projectRoot } from "./paths.mjs";

function readEvent(onBadInput) {
  try {
    return JSON.parse(readFileSync(0, "utf8"));
  } catch {
    return onBadInput === "empty" ? {} : null;
  }
}

async function handle(handler, event) {
  try {
    return await handler(event, { root: projectRoot(event.cwd) });
  } catch {
    return null;
  }
}

export async function runHook(handler, { onBadInput = "exit" } = {}) {
  const event = readEvent(onBadInput);
  const output = event ? await handle(handler, event) : null;
  if (output) process.stdout.write(JSON.stringify(output));
  process.exit(0);
}
