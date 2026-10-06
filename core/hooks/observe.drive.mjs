#!/usr/bin/env node
import { runHook } from "../lib/hook.mjs";
import { observeDrive } from "../lib/hooks/observe.drive.mjs";
await runHook(observeDrive);
