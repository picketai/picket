#!/usr/bin/env node
import { runHook } from "../lib/hooks/hook.mjs";
import { guardBash } from "../lib/hooks/guard.bash.mjs";
await runHook(guardBash);
