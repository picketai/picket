#!/usr/bin/env node
// Stop + SubagentStop: read the verdict token off the turn's last line, apply it to the work item
// with the kernel, and hand the lead the next action as context. The lead reads one line instead of
// relaying a block. Never blocks; a failure is reported as context and the turn ends normally.
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { readTurn, spawnHints, blockLines, agentTranscript } from "./lib/transcript.mjs";
import { findVerdict, route } from "../lib/route.mjs";
import { projectRoot } from "../lib/work.mjs";
import { saveBlock } from "../lib/packet.mjs";

const HEADINGS = [
  [/^##\s+Phase\s+(\d+)\s+of\s+([a-z0-9-]+)/m, (m) => ({ agent: "developer", phase: Number(m[1]), id: m[2] })],
  [/^##\s+Review:\s+([a-z0-9-]+)\s*·\s*(crosscheck|phase\s+(\d+)|cumulative|checkpoint|pr)/m, (m) => ({ agent: "reviewer", id: m[1], scope: m[2].startsWith("phase") ? "phase" : m[2], phase: m[3] ? Number(m[3]) : null })],
  [/^##\s+(Order|Design|Amendment):\s+([a-z0-9-]+)/m, (m) => ({ agent: "architect", id: m[2] })],
  [/^##\s+Report:\s+([a-z0-9-]+)/m, (m) => ({ agent: "analyst", id: m[1] })],
];

let data;
try {
  data = JSON.parse(readFileSync(0, "utf8"));
} catch {
  process.exit(0);
}
if (data.stop_hook_active) process.exit(0);

let out = null;
try {
  const { text } = readTurn(data, { includeToolPayloads: true });
  const verdict = findVerdict(blockLines(text).last);
  if (verdict) {
    let info = null;
    for (const [re, fn] of HEADINGS) {
      const m = text.match(re);
      if (m) {
        info = fn(m);
        break;
      }
    }
    // The spawn message lives in the agent's own transcript; `transcript_path` is the lead's.
    const hints = spawnHints(agentTranscript(data));
    const id = info?.id ?? hints.work_id;
    if (info?.scope === "pr") {
      // A pull request review has no work item to advance; keep the block for the post-back step.
      const dir = join(projectRoot(data.cwd), ".claude", "ledger");
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, `${id}.review.md`), text.trim() + "\n");
      out = `harness: ${verdict} recorded for ${id}; block saved to .claude/ledger/${id}.review.md. Print it verbatim, then offer [p] post to the PR · [d] done.`;
    } else if (id) {
      const scope = info?.scope === "phase" ? undefined : (info?.scope ?? (hints.scope && !hints.scope.startsWith("phase") ? hints.scope : undefined));
      const phase = info?.phase ?? hints.phase ?? undefined;
      const agent = info?.agent ?? (["approved", "rejected"].includes(verdict) ? "user" : data.agent_type ?? "lead");
      const amend = text.match(/^AMENDMENT NEEDED:.*$/m)?.[0] ?? null;
      // The developer's block is what the gate packet renders from; keep it next to the phase markers.
      if (info?.agent === "developer" && phase != null) {
        try {
          saveBlock(id, phase, text, projectRoot(data.cwd));
        } catch {}
      }
      const r = route({ id, verdict, agent, phase, scope, root: projectRoot(data.cwd), reason: amend ?? undefined });
      const n = r.next;
      out = `harness: ${verdict} applied to ${id}${phase ? ` phase ${phase}` : ""} (${r.applied.join(", ") || "recorded"}). Next: ${n.action}${n.actor ? ` by ${n.actor}` : ""}${n.phase ? ` · phase ${n.phase}` : ""}. ${n.detail}${n.options?.length ? ` Options: ${n.options.join(" · ")}` : ""}${amend ? `\n${amend}` : ""}`;
    }
  }
} catch (err) {
  out = `harness: verdict not applied (${err.message}). Run \`harness next <id>\` yourself.`;
}

if (out) {
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: data.hook_event_name, additionalContext: out } }));
}
process.exit(0);
