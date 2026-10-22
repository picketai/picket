#!/usr/bin/env node
import { runHook } from "../lib/hook.mjs";
import { injectState } from "../lib/hooks/inject.state.mjs";
await runHook(injectState, { onBadInput: "empty" });
