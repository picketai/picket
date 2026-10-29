# 11: Kernel groundwork for agents and skills

Status: approved (2026-10-29).

Step 2 of the suggested order in `artifacts/reports/instructions-candidates-2026-10-25.md`: the kernel changes that the rewritten agents and skills (steps 3 and 4) rest on. After this step, `picket next` prints the exact message to send each agent, `picket reply` applies a gate reply, `picket packet` prints its own fence, the review summary names the checklists to open, every reviewer block is saved to a file, and an agent turn that ends without its block is sent back once. No agent, skill or CLAUDE.md text changes here; the instructions start using these in steps 3 and 4.

## Today

| Fact | Value |
|---|---|
| Who writes agent messages | the lead, from prose in 6 procedure and step files (`phase-loop.md`, `cumulative-review.md`, `gate.md`, `amend.md`, `ordering/steps/10-order.md`, `designing/steps/20-crosscheck.md`), pasting the agent's section into the message |
| `picket next` | JSON with `action`, `actor`, `phase`, `detail`, `options`; no message, no spawn or continue choice |
| Gate replies | a 9-row table in `gate.md` the lead maps to `picket route`, `set`, `comment`, `waive` by hand |
| `picket packet` | plain text; `gate.md` tells the lead to wrap it in a ```` ```text ```` fence |
| Review summary | `size`, `frameworks`, `concerns`, `security_path`, `extension_steps`; the reviewer maps them to checklist files through the load table in `reviewing/SKILL.md:43-55` |
| Reviewer blocks | the verdict hook saves the developer's block (`phases/N.block.md`) and a pull request review (`.picket/state/<id>.review.md`); a cumulative or checkpoint review is kept only in the transcript, so the lead pastes its findings into the developer's message |
| Verdict rows | `ts`, `agent`, `verdict`, `phase`, `scope`, `through`, `classes`; no session, so nothing tells whether an agent from this session is still live |
| Action text | `src/mods/status/hooks/band.ts:84-126` switches on 5 of the 10 actions and falls back to "you approve phase ${phase}" for every other user action; `inject/state` prints the raw action name |
| `guard.block` | checks a turn that has a block heading; a `picket:` agent turn with no heading and no verdict passes untouched. The "+k more" denial on `Files:` already exists (`guard/block/index.mts:27-31`), so D8's item for it is done |

## Target

### 1. `picket next` prints what to send

`NextView` gains `send: Send[]`, empty for user and lead actions:

```ts
type Send = { tool: "Agent" | "SendMessage"; to: string; type: AgentType; model?: "opus"; first?: string[]; message: string };
```

`to` is the instance name (`architect`, `analyst`, `developer`, `reviewer`, `cumulative-reviewer`). `tool` is `SendMessage` when a verdict row from that agent and this session exists, else `Agent`. `first` lists commands the lead runs before sending (`picket mutate <id>`, `picket summary <id> --save`). `message` is the full text, ready to send. The human render prints one fenced block per send.

| Action | Send |
|---|---|
| `write_artifact` (order, design) | architect: `work`, `lane`, `request: work/<id>/request.md`, `preflight:` and `sources:` paths when present |
| `write_artifact` (research) | analyst: `work`, `request:` path, `pass: outline` |
| `implement_phase` | developer: `work`, `phase`, `artifact:` on the first send, `run through <m>` inside a run grant. In the design lane before any cross-check verdict, a second send to the reviewer: `scope: crosscheck` |
| `review_checkpoint` | reviewer: `work`, `scope: checkpoint`, `phase`, `summary: work/<id>/summary.json` |
| `review_cumulative` | a new `cumulative-reviewer`, model opus, the fixed opening sentence, `work`, `scope: cumulative`, `summary:` path; `first` runs mutate and summary |
| `fix_findings` (new) | developer: `work`, `review: work/<id>/reviews/cumulative.md` |
| `amend` (new) | architect: `work`, `amend: <the AMENDMENT NEEDED line>` |

Two actions join `NEXT_ACTIONS`. `fix_findings` replaces the prose rule "after `CHANGES REQUIRED`, when `picket next` says `review_cumulative` again, message the developer": the kernel already knows the last verdict, so it says so. `amend` replaces "when the block carries `AMENDMENT NEEDED`, continue the architect". Messages carry no `step:` line and no pasted section (bundle 3).

### 2. `picket reply <id> "<reply>"`

Applies one reply to the open gate, using the options `picket next` returned, and prints the outcome plus the next `send`. The `gate.md` table moves into code: `a`, `i`, `r <m>`, `x <why>`, `k <n>`, `w <n>` at `approve_phase`; `c`, `d`, `x` at `resolve_block` and `resolve_rejections`; `p` (publish), `a`, `d`, `x` at the research gate when D6 lands. A reply that matches no option exits 2 with the options, so the lead asks once. A question is not a reply; the lead answers it and re-renders the packet.

### 3. `picket packet` prints its fence

The text output is wrapped in a ```` ```text ```` fence; `--json` stays bare.

### 4. The summary names the checklists

`Summary` gains `checklists: { path: string; skip?: string[] }[]`, computed from the load table: size, frameworks, concerns, `security_path`, and the scope (`15-traced.md` for cumulative, `60-crosscheck.md` for a cross-check), then `extension_steps`. The medium row gives `20-patterns-core.md` with `skip: ["SOLID", "DRY"]`. Paths are `${CLAUDE_PLUGIN_ROOT}/skills/reviewing/checklists/<file>` and follow the file names on disk, so step 4's rename moves them with one map. `picket summary <id> --save` writes `work/<id>/summary.json`.

### 5. Every reviewer block is saved

The verdict hook writes each review block to `work/<id>/reviews/<scope>.md` (`crosscheck`, `phase-<n>`, `checkpoint`, `cumulative`), replacing the previous one of the same scope. Verdict rows gain `session`, which `route` already receives.

### 6. `guard.block` catches a missing block

A `SubagentStop` from a `picket:` agent whose turn has neither a block heading nor a verdict token is bounced once: "finish the task and end with your block". `stop_hook_active` stops a second bounce, as today.

### 7. One action text map

`src/lib/shared/work/action-text.mts` exports `ACTION_TEXT: Record<NextAction, (step) => string>`, one line per action for the band and `inject/state`. A `Record` over `NextAction` makes a missing action a type error, so the two new actions cannot ship without text.

## Decisions

- **D-1 The kernel writes the message; the lead sends it.** The lead pastes 6 sections today, and the report's bundle 3 counted 10 KB the lead reads per order item for that. A message built from state cannot drift from the agent's Entry, and step 3's agents test can check Entry against `Send` (draft 10, D-3).
- **D-2 Spawn or continue comes from verdict rows with a session.** The state's `session` field moves to whoever routed last, so after a resume it no longer says whether the developer is live. A row per agent per session does.
- **D-3 `next` stays read-only.** The summary and mutation run through their own verbs, named in `first`; `next` only reads.
- **D-4 New actions over prose branches.** `fix_findings` and `amend` are what the lead does today from prose in `cumulative-review.md`; as actions they reach the band, the packet and the tests like every other.
- **D-5 The checklist map follows today's file names.** Step 4 drops the `NN-` prefixes; the map changes in the same commit, and the skills test from draft 10 catches a stale name.
- **D-6 Reviews overwrite by scope.** The developer fixes the latest findings; earlier verdicts stay in `verdicts.jsonl` with their classes.

## Migration

The phases follow the dependencies: the action map first, since the two new actions need it, then the verdict rows and saved reviews, then `send`, then the verbs that print it.

1. Action text map; band and `inject/state` read it.
2. Verdict rows gain `session`; the verdict hook saves reviewer blocks to `reviews/`.
3. Summary `checklists` and `--save`; preflight saves its warn lines to `work/<id>/preflight.txt` when given an id.
4. `NEXT_ACTIONS` gains `fix_findings` and `amend`; `next` builds `send`.
5. `picket reply`.
6. `picket packet` fence; `guard.block` stop check.

## Risks

- `send` is unused until step 3 rewrites the lane skills, so it can only be tested by unit tests and a drive. The first lane run after step 3 is its real test; the bench runs before and after (report, suggested order).
- The stop check could bounce an agent turn that legitimately ends without a block, such as an analyst asked a quick question by the lead. One bounce, then the turn ends, so the cost is one extra model turn.
- Adding `session` to verdict rows leaves older rows without it; they count as another session, so an old item resumed spawns fresh agents, as it does today.

## Affects

`src/lib/shared/work/{next-step,next-view,action-text,verdict-log}.mts`, `src/lib/verbs/{next,reply,packet,summary,preflight}/`, `src/lib/shared/review-summary.mts`, `src/lib/hooks/route/verdict/`, `src/lib/hooks/guard/block/`, `src/lib/hooks/inject/state/`, `src/mods/status/hooks/band.ts`, `src/lib/shared/views.mts`. No agent, skill, rule or CLAUDE.md text changes.

## Open questions

All answered.

- **OQ-1** (answered 2026-10-29): a fresh developer after a stall is named `developer-<n>`, numbered by the count of stall replies (`developer-2` first).
