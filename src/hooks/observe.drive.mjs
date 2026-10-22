#!/usr/bin/env node
import { runHook } from "../lib/hooks/hook.mjs";
import { observeDrive } from "../lib/hooks/observe.drive.mjs";
await runHook(observeDrive);
