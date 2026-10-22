#!/usr/bin/env node
import { runHook } from "../lib/hooks/hook.mjs";
import { guardBlock } from "../lib/hooks/guard.block.mjs";
await runHook(guardBlock);
