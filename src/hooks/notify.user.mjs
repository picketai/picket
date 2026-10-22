#!/usr/bin/env node
import { runHook } from "../lib/hook.mjs";
import { notifyUser } from "../lib/hooks/notify.user.mjs";
await runHook(notifyUser);
