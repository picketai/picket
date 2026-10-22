#!/usr/bin/env node
import { runHook } from "../lib/hooks/hook.mjs";
import { guardSilenced } from "../lib/hooks/guard.silenced.mjs";
await runHook(guardSilenced);
