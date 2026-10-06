#!/usr/bin/env node
import { runHook } from "../lib/hook.mjs";
import { routeVerdict } from "../lib/hooks/route.verdict.mjs";
await runHook(routeVerdict);
