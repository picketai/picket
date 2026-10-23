export const HOOK_EVENTS = ["SessionStart", "SubagentStart", "PreToolUse", "PostToolUse", "PostToolUseFailure", "Stop", "SubagentStop", "Notification"] as const;

export type HookEvent = (typeof HOOK_EVENTS)[number];

export type HookEntry = { summary: string; on: readonly { event: HookEvent; matcher?: string }[] };

export const HOOKS = {
  "inject.state": {
    summary: "open work items with their next action, plus the host folder's `MEMORY.md`",
    on: [{ event: "SessionStart" }],
  },
  "inject.rules": {
    summary: "the five rules in `rules/`, joined, for the lead and every agent",
    on: [{ event: "SessionStart" }, { event: "SubagentStart" }],
  },
  "inject.extensions": {
    summary: "each enabled extension's rules and its additions for the lead or the starting agent's role, in config order, within 10,000 characters; one line per refused extension",
    on: [{ event: "SessionStart" }, { event: "SubagentStart" }],
  },
  "guard.scope": {
    summary: "denies writes to kernel-owned files (`work/*/state.yaml`, `phases/`, `verdicts.jsonl`, `comments.jsonl`, `waivers.jsonl`, `.picket/state/` except `branching.yaml`); denies an Edit on a file this transcript never read",
    on: [{ event: "PreToolUse", matcher: "Write|Edit" }],
  },
  "guard.comments": {
    summary: "denies an edit that adds a comment line to a code file, doc comments included, unless `picket comment` recorded the user's approval for that path and text on an open or blocked item",
    on: [{ event: "PreToolUse", matcher: "Write|Edit" }],
  },
  "guard.silenced": {
    summary: "denies an edit that adds a silenced check (a suppression, a skipped or focused test, a weaker coverage or warning threshold), unless `picket waive` recorded the user's approval for that path and line on an open or blocked item",
    on: [{ event: "PreToolUse", matcher: "Write|Edit" }],
  },
  "guard.bash": {
    summary: "the command evaluator: read-only commands allowed, destructive roots denied, compound and redirected commands prompt; PowerShell is only ever denied or passed on; lead-only verbs and agent shell writes to code are denied; `PICKET_ESCALATE` asks",
    on: [{ event: "PreToolUse", matcher: "Bash|PowerShell" }],
  },
  "lint.schema": {
    summary: "order and design artifacts: frontmatter, phase headings, decision ids, caps, placeholders, revision protocol against git HEAD",
    on: [{ event: "PostToolUse", matcher: "Write|Edit" }],
  },
  "observe.drive": {
    summary: "appends drive or inspect rows to `.picket/state/drive-log.jsonl` with the current work item and its phase; `picket verify` reads the rows",
    on: [
      { event: "PostToolUse", matcher: "Bash|PowerShell" },
      { event: "PostToolUseFailure", matcher: "Bash|PowerShell" },
    ],
  },
  "monitor.context": {
    summary: "the stall detector: six look-around calls with no action get one line of context",
    on: [{ event: "PostToolUse", matcher: "Read|Grep|Glob|WebFetch|WebSearch" }],
  },
  "guard.block": {
    summary: "a turn with a contract heading must end with an exact verdict token and stay within 40 lines",
    on: [{ event: "Stop" }, { event: "SubagentStop" }],
  },
  "route.verdict": {
    summary: "applies the verdict to the work item with the kernel and hands back `picket next` as context",
    on: [{ event: "Stop" }, { event: "SubagentStop" }],
  },
  "emit.ledger": {
    summary: "one v2 ledger row per turn (`bench/schema/ledger-v2.schema.json`)",
    on: [{ event: "Stop" }, { event: "SubagentStop" }],
  },
  "notify.user": {
    summary: "an OS notification in a detached process (a Windows toast through powershell.exe, osascript, notify-send); `PICKET_NOTIFY=off` skips it",
    on: [{ event: "Notification", matcher: "permission_prompt|idle_prompt" }],
  },
} as const satisfies Record<string, HookEntry>;

export type HookName = keyof typeof HOOKS;
