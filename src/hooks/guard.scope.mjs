#!/usr/bin/env node
import { runHook } from "../lib/hooks/hook.mjs";
import { guardScope } from "../lib/hooks/guard.scope.mjs";
await runHook(guardScope);
