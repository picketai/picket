#!/usr/bin/env node
import { runHook } from "../lib/hook.mjs";
import { injectRules } from "../lib/hooks/inject.rules.mjs";
await runHook(injectRules, { onBadInput: "empty" });
