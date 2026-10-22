#!/usr/bin/env node
import { checkNodeFloor } from "../lib/node-floor.mjs";

const refusal = checkNodeFloor(process.versions.node);
if (refusal) {
  process.stderr.write(`${refusal}\n`);
  process.exit(1);
}
await import("./dispatch.mjs");
