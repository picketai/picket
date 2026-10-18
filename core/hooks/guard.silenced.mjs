#!/usr/bin/env node
import { runHook } from "../lib/hook.mjs";
import { guardSilenced } from "../lib/hooks/guard.silenced.mjs";
await runHook(guardSilenced);
