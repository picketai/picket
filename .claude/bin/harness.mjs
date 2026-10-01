#!/usr/bin/env node
// The kernel CLI. Every verb prints JSON on stdout (add --pretty for an indented copy, --human for a
// one-line human summary) and exits 0 on success, 1 on a usage error, 2 on a failed check.
//
//   harness admit [--request <file>|--text "<request>"] [--touched a,b]
//   harness new --lane <fast|order|design|research> --title "<title>" [--id <slug>] [--source <ref>] [--text "<request>"|--request <file|->]
//   harness list
//   harness state <id>
//   harness set <id> status=<open|blocked|done|abandoned> [blocked_reason="<why>"] [branch=<name>] [title="<t>"]
//   harness next <id>
//   harness preflight <id>
//   harness verify <id> <phase> [--no-tests]
//   harness route <id> --verdict "<TOKEN>" --agent <name> [--phase N] [--scope cumulative|checkpoint|crosscheck] [--through N] [--reason "<why>"]
//   harness review-summary <id> [--base <commit>]
//   harness cost [--session <id>] [--work <id>]
//   harness find-verdict --text "<block>"
//   harness drive --hit "GET /path" [--hit "POST /path <json>"]... [--start "<cmd>"] [--port N] [--wait /path]
//   harness drive --run "<cli command>"
//   harness check [--steps test,lint,build] [--only "<command>"]
//   harness packet <id>            the gate packet for the current stop, as text (--json for the structure)
//   harness review-summary --range <base>..<head>
//   harness pr <url> [--repo <path>]   resolve (root, or a nested clone under src/), fetch and summarise a pull request
//   harness pr <url> --post <review.md> [--dry-run]   post a reviewer block back as PR threads
//
import { readFileSync } from "node:fs";
import { packet } from "../lib/packet.mjs";
import { preparePullRequest, parsePullRequestUrl, postReview } from "../lib/pr.mjs";
import { reviewSummaryRange } from "../lib/review.mjs";
import { admit } from "../lib/admit.mjs";
import { drive, renderDrive } from "../lib/drive.mjs";
import { check, renderCheck } from "../lib/check.mjs";
import { dirtyPaths } from "../lib/git.mjs";
import { createWork, deriveState, listWork, projectRoot, readState, writeState } from "../lib/work.mjs";
import { next } from "../lib/next.mjs";
import { preflight } from "../lib/preflight.mjs";
import { verify } from "../lib/verify.mjs";
import { route, findVerdict } from "../lib/route.mjs";
import { cost } from "../lib/cost.mjs";
import { reviewSummary } from "../lib/review.mjs";

function parse(argv) {
  const pos = [];
  const opt = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const nxt = argv[i + 1];
      const val = nxt === undefined || nxt.startsWith("--") ? true : argv[++i];
      opt[key] = key in opt ? [].concat(opt[key], val) : val; // a repeated flag collects (--hit a --hit b)
    } else pos.push(a);
  }
  return { pos, opt };
}

function out(value, opt, text) {
  if (opt.human && text) console.log(text(value));
  else console.log(opt.pretty ? JSON.stringify(value, null, 2) : JSON.stringify(value));
}

function readRequest(opt) {
  if (opt.text) return String(opt.text);
  if (opt.request) return readFileSync(opt.request === "-" ? 0 : opt.request, "utf8");
  throw new Error("admit needs --text or --request <file|->");
}

async function main(argv) {
  const { pos, opt } = parse(argv);
  const [verb, ...rest] = pos;
  const root = opt.root ?? projectRoot();
  switch (verb) {
    case "admit": {
      // Skills inject this line with $ARGUMENTS; an empty request must not be an error, it must say so.
      const text = opt.text === true || opt.text === "" || (!opt.text && !opt.request) ? "" : readRequest(opt);
      if (!text.trim()) {
        out({ lane: null, reasons: ["no request text given"], signals: {} }, opt, () => "lane: (none) · re-run with the request text: harness admit --text \"<request>\"");
        return 0;
      }
      const r = admit(text, { root, touched: opt.touched ? String(opt.touched).split(",").filter(Boolean) : [] });
      out(r, opt, (v) => `lane: ${v.lane} (${v.reasons.join("; ")})`);
      return 0;
    }
    case "new": {
      if (!opt.lane || !opt.title) throw new Error("new needs --lane and --title");
      const given = typeof opt.text === "string" || typeof opt.request === "string";
      const s = createWork({ lane: opt.lane, title: String(opt.title), id: opt.id, source: opt.source, request: given ? readRequest(opt) : null, root });
      out({ ...s, dir: `work/${s.id}`, next: next(s.id, root) }, opt, (v) => `created work/${v.id} (${v.lane}) · next: ${v.next.action} by ${v.next.actor}`);
      return 0;
    }
    case "list": {
      const items = listWork(root).map((id) => {
        const d = deriveState(id, root);
        return { id, lane: d.lane, status: d.status, title: d.title, phases: `${d.phases_approved}/${d.phase_count}`, next: next(id, root).action };
      });
      out(items, opt, (v) => v.map((i) => `${i.id}  ${i.lane.padEnd(8)} ${i.status.padEnd(9)} ${i.phases.padEnd(5)} ${i.next.padEnd(16)} ${i.title}`).join("\n") || "(no work items)");
      return 0;
    }
    case "state": {
      if (!rest[0]) throw new Error("state needs <id>");
      out(deriveState(rest[0], root), opt);
      return 0;
    }
    case "set": {
      // harness set <id> status=done | status=blocked blocked_reason="why" | branch=feat/x | title="..."
      if (!rest[0] || rest.length < 2) throw new Error('set needs <id> and key=value pairs (status, blocked_reason, branch, title, run_through)');
      const st = readState(rest[0], root);
      for (const kv of rest.slice(1)) {
        const m = kv.match(/^([a-z_]+)=(.*)$/);
        if (!m) throw new Error(`bad assignment ${kv}`);
        if (!["status", "blocked_reason", "branch", "title", "run_through"].includes(m[1])) throw new Error(`field ${m[1]} is not settable`);
        if (m[2] === "") delete st[m[1]];
        else st[m[1]] = m[1] === "run_through" ? Number(m[2]) : m[2];
      }
      if (st.status !== "blocked") delete st.blocked_reason;
      writeState(st, root);
      // Closing with uncommitted changes in the tree is the most common way a drive's side effect ships.
      const dirty = st.status === "done" ? (dirtyPaths(root) ?? []) : [];
      out({ ...st, dirty, next: next(st.id, root) }, opt, (v) => `${v.id}: status ${v.status}${v.blocked_reason ? " (" + v.blocked_reason + ")" : ""} · next: ${v.next.action}${v.dirty.length ? `\nWARNING: uncommitted changes: ${v.dirty.join(", ")} (commit them or \`git checkout -- <path>\` before you print the closing block)` : ""}`);
      return 0;
    }
    case "next": {
      if (!rest[0]) throw new Error("next needs <id>");
      out(next(rest[0], root), opt, (v) => `${v.action} · ${v.actor ?? "-"}${v.phase ? ` · phase ${v.phase}` : ""} · ${v.detail}${v.options.length ? ` · ${v.options.join(" · ")}` : ""}`);
      return 0;
    }
    case "preflight": {
      if (!rest[0]) throw new Error("preflight needs <id>");
      const r = preflight(rest[0], root);
      out(r, opt, (v) => v.checks.map((c) => `${c.level.padEnd(4)} ${c.name}: ${c.detail}`).join("\n") + `\n${v.ok ? "PREFLIGHT OK" : "PREFLIGHT FAILED"}`);
      return r.ok ? 0 : 2;
    }
    case "verify": {
      if (!rest[0] || !rest[1]) throw new Error("verify needs <id> <phase>");
      const r = verify(rest[0], Number(rest[1]), { root, runTests: !opt["no-tests"] });
      out(r, opt, (v) => v.results.map((c) => `${c.ok ? "ok  " : "FAIL"} ${c.name}${c.detail ? ": " + c.detail : ""}`).join("\n") + `\n${v.ok ? "VERIFIED" : "NOT VERIFIED"}`);
      return r.ok ? 0 : 2;
    }
    case "route": {
      if (!rest[0] || !opt.verdict || !opt.agent) throw new Error("route needs <id> --verdict <TOKEN> --agent <name>");
      const r = route({ id: rest[0], verdict: String(opt.verdict), agent: String(opt.agent), phase: opt.phase ? Number(opt.phase) : undefined, scope: opt.scope, through: opt.through ? Number(opt.through) : undefined, reason: opt.reason, root });
      out(r, opt, (v) => `${v.verdict} applied (${v.applied.join(", ") || "recorded"}) · next: ${v.next.action} by ${v.next.actor ?? "-"}${v.next.phase ? ` · phase ${v.next.phase}` : ""}`);
      return 0;
    }
    case "review-summary": {
      if (opt.range) {
        const m = String(opt.range).match(/^(.+?)\.\.\.?(.+)$/);
        if (!m) throw new Error("--range needs <base>..<head>");
        const r = reviewSummaryRange(root, m[1], m[2]);
        out(r, opt, (v) => `${v.size} · ${v.changed_files.length} file(s), +${v.lines_added}/-${v.lines_removed} · frameworks ${v.frameworks.join(",") || "-"} · concerns ${v.concerns.join(",") || "-"} · security ${v.security_path ? "yes" : "no"} · ${v.base.slice(0, 8)}..${v.head.slice(0, 8)}`);
        return 0;
      }
      if (!rest[0]) throw new Error("review-summary needs <id> or --range <base>..<head>");
      const r = reviewSummary(rest[0], { root, base: opt.base });
      out(r, opt, (v) => `${v.size} · ${v.changed_files.length} file(s), +${v.lines_added}/-${v.lines_removed} · frameworks ${v.frameworks.join(",") || "-"} · concerns ${v.concerns.join(",") || "-"} · security ${v.security_path ? "yes" : "no"} · base ${v.base.slice(0, 8)} · repos ${v.repos.length}`);
      return 0;
    }
    case "cost": {
      out(cost({ root, session: opt.session, work_id: opt.work }), opt, (v) => `${v.rows} turns · $${v.cost_usd.toFixed(2)} · cache ${v.cache_hit_ratio == null ? "-" : Math.round(v.cache_hit_ratio * 100) + "%"} · ${v.tokens_per_accepted_line == null ? "-" : Math.round(v.tokens_per_accepted_line)} tok/line · stops ${v.stops} · bounces ${v.bounces}`);
      return 0;
    }
    case "find-verdict": {
      out({ verdict: findVerdict(opt.text ?? readFileSync(0, "utf8")) }, opt, (v) => v.verdict ?? "");
      return 0;
    }
    case "drive": {
      // Starts the app (or runs a CLI command), exercises it, stops it, and logs the evidence itself.
      const r = await drive({
        root,
        run: opt.run === true ? undefined : opt.run,
        start: opt.start === true ? undefined : opt.start,
        hits: opt.hit === undefined ? [] : [].concat(opt.hit),
        port: opt.port,
        wait: opt.wait,
        timeoutMs: opt.timeout ? Number(opt.timeout) * 1000 : undefined,
        keepChanges: opt["keep-changes"] === true,
        id: opt.work,
        phase: opt.phase,
      });
      out(r, opt, renderDrive);
      return r.ok ? 0 : 2;
    }
    case "packet": {
      // A rendering verb: text by default, since the lead prints it verbatim.
      if (!rest[0]) throw new Error("packet needs <id>");
      const r = packet(rest[0], root, { width: opt.width ? Number(opt.width) : undefined });
      if (opt.json) console.log(opt.pretty ? JSON.stringify(r, null, 2) : JSON.stringify(r));
      else console.log(r.text);
      return 0;
    }
    case "pr": {
      if (!rest[0]) throw new Error("pr needs <url>");
      if (opt.post) {
        // Outward action: the skill asks the user before calling this; --dry-run shows the payloads.
        const pr = parsePullRequestUrl(rest[0]);
        const r = await postReview(pr, readFileSync(String(opt.post), "utf8"), { dryRun: opt["dry-run"] === true });
        out(r, opt, (v) => (opt["dry-run"] ? `${v.threads.length} thread(s) would be posted:\n${v.threads.map((t) => `- ${t.threadContext ? `${t.threadContext.filePath}:${t.threadContext.rightFileStart.line} ` : ""}${t.comments[0].content.split("\n")[0].slice(0, 90)}`).join("\n")}` : `posted ${v.posted} thread(s) to PR ${pr.id}`));
        return 0;
      }
      const r = await preparePullRequest(rest[0], { root, repo: opt.repo === true ? undefined : opt.repo });
      out(r, opt, (v) => [
        `${v.review_id} · ${v.pr.provider} · ${v.pr.repo} · remote ${v.remote} · clone ${v.repo_root}`,
        `  ${v.meta ? `"${v.meta.title}" by ${v.meta.author ?? "?"} · ${v.meta.source_ref?.replace("refs/heads/", "") ?? "?"} → ${v.meta.target_ref?.replace("refs/heads/", "") ?? "?"}` : `title and description unavailable: ${v.meta_reason}`}`,
        `  ${v.summary.size} · ${v.summary.changed_files.length} file(s), +${v.summary.lines_added}/-${v.summary.lines_removed} · frameworks ${v.summary.frameworks.join(",") || "-"} · concerns ${v.summary.concerns.join(",") || "-"} · security ${v.summary.security_path ? "yes" : "no"}`,
        `  base ${v.base.slice(0, 10)} · head ${v.head.slice(0, 10)} (${v.ref})`,
      ].join("\n"));
      return 0;
    }
    case "check": {
      // Runs the detected test and lint commands, logs to .claude/ledger/, stops at the first failure.
      const r = check({ root, steps: opt.steps ? String(opt.steps).split(",").filter(Boolean) : undefined, only: opt.only === true ? undefined : opt.only, timeoutMs: opt.timeout ? Number(opt.timeout) * 1000 : undefined });
      out(r, opt, renderCheck);
      return r.ok ? 0 : 2;
    }
    default:
      throw new Error(`unknown verb "${verb ?? ""}". Verbs: admit new list state set next preflight verify route review-summary cost find-verdict drive check packet pr`);
  }
}

main(process.argv.slice(2)).then(
  (code) => process.exit(code),
  (err) => {
    console.error(`harness: ${err.message}`);
    process.exit(1);
  },
);
