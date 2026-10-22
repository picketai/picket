#!/usr/bin/env node
import { runHook } from "../lib/hooks/hook.mjs";
import { injectExtensions } from "../lib/hooks/inject.extensions.mjs";
await runHook(injectExtensions, { onBadInput: "empty" });
