import { test } from "node:test";
import assert from "node:assert/strict";
import { attentionOf, sessionsOf } from "./attention.mts";
import type { WorkId } from "./files.mts";
import type { WorkState } from "./state.mts";
import type { VerdictRow } from "./verdict-log.mts";

const ATTENTION_CASES = [
  { status: "done", actor: null, isLive: true, attention: "closed" },
  { status: "done", actor: null, isLive: false, attention: "closed" },
  { status: "abandoned", actor: "user", isLive: true, attention: "closed" },
  { status: "abandoned", actor: "user", isLive: false, attention: "closed" },
  { status: "open", actor: "user", isLive: true, attention: "needs-you" },
  { status: "blocked", actor: "user", isLive: false, attention: "needs-you" },
  { status: "open", actor: "developer", isLive: true, attention: "working" },
  { status: "open", actor: "developer", isLive: false, attention: "open" },
  { status: "open", actor: "lead", isLive: true, attention: "working" },
] as const;

for (const { status, actor, isLive, attention } of ATTENTION_CASES) {
  test(`status ${status}, actor ${actor}, ${isLive ? "live" : "not live"}: ${attention} (T-1.1)`, () => {
    assert.equal(attentionOf(status, actor, isLive), attention);
  });
}

function stateWith(session: string | undefined): WorkState {
  return { id: "20261102-probe" as WorkId, lane: "design", title: "Probe", status: "open", created: "2026-11-02T00:00:00.000Z", ...(session ? { session } : {}) };
}

function verdictsIn(...sessions: (string | undefined)[]): VerdictRow[] {
  return sessions.map((session) => ({ ts: "2026-11-02T00:00:00.000Z", agent: "architect", verdict: "ARTIFACT WRITTEN", phase: null, scope: null, through: null, ...(session ? { session } : {}) }));
}

const SESSIONS_CASES = [
  { name: "verdict sessions [A, B, A] with state session B give [A, B]", verdicts: ["A", "B", "A"], state: "B", sessions: ["A", "B"] },
  { name: "verdict sessions [A, B] with state session A give [B, A]", verdicts: ["A", "B"], state: "A", sessions: ["B", "A"] },
  { name: "verdict sessions [A] with state session C give [A, C]", verdicts: ["A"], state: "C", sessions: ["A", "C"] },
  { name: "a verdict without a session and no state session give []", verdicts: [undefined], state: undefined, sessions: [] },
  { name: "no verdicts and no state session give []", verdicts: [], state: undefined, sessions: [] },
];

for (const { name, verdicts, state, sessions } of SESSIONS_CASES) {
  test(`${name} (T-1.2)`, () => {
    assert.deepEqual(sessionsOf(stateWith(state), verdictsIn(...verdicts)), sessions);
  });
}
