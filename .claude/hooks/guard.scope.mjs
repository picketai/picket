#!/usr/bin/env node
import { runHook } from "../lib/hook.mjs";
import { guardScope } from "../lib/hooks/guard.scope.mjs";
await runHook(guardScope);
