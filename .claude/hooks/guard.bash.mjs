#!/usr/bin/env node
import { runHook } from "../lib/hook.mjs";
import { guardBash } from "../lib/hooks/guard.bash.mjs";
await runHook(guardBash);
