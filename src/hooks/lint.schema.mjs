#!/usr/bin/env node
import { runHook } from "../lib/hooks/hook.mjs";
import { lintSchema } from "../lib/hooks/lint.schema.mjs";
await runHook(lintSchema);
