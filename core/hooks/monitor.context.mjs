#!/usr/bin/env node
import { runHook } from "../lib/hook.mjs";
import { monitorContext } from "../lib/hooks/monitor.context.mjs";
await runHook(monitorContext);
