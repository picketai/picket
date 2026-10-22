#!/usr/bin/env node
import { runHook } from "../lib/hook.mjs";
import { injectExtensions } from "../lib/hooks/inject.extensions.mjs";
await runHook(injectExtensions, { onBadInput: "empty" });
