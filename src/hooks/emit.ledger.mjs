#!/usr/bin/env node
import { runHook } from "../lib/hooks/hook.mjs";
import { emitLedger } from "../lib/hooks/emit.ledger.mjs";
await runHook(emitLedger);
