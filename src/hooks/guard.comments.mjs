#!/usr/bin/env node
import { runHook } from "../lib/hooks/hook.mjs";
import { guardComments } from "../lib/hooks/guard.comments.mjs";
await runHook(guardComments);
