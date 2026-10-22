// The kernel CLI. Every verb prints JSON on stdout (add --pretty for an indented copy, --human for a
// one-line human summary) and exits 0 on success, 1 on a usage error, 2 on a failed check.
import { readFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { iconsMode, liveProbe, recordSessionCost, renderStatusline, workspaceDir } from "../verbs/statusline/statusline.mjs";
import { preparePullRequest, parsePullRequestUrl, postReview } from "../verbs/pullrequest/pr.mjs";
import { reviewSummaryRange } from "../shared/review-summary.mjs";
import { drive, renderDrive } from "../verbs/drive/drive.mjs";
import { check, renderCheck } from "../shared/checks.mjs";
import { describeExtensions, loadExtensions, renderExtensions, scaffoldExtension } from "../shared/extensions.mjs";
import { createWork, projectRoot, readState, workDir } from "../shared/work/work.mjs";
import { next } from "../shared/work/next-step.mjs";
import { configRel } from "../shared/paths.mjs";
import { findVerdict } from "../shared/verdicts.mjs";
import { reviewSummary } from "../shared/review-summary.mjs";
import { loadConfig } from "../shared/config.mjs";
import { parseArgs } from "../util/args.mjs";
import { mutate, renderMutation } from "../verbs/mutate/mutate.mjs";
import { IntakeError, LookupError, addRef as addSource, find as findInSource, grep as grepInSource, pick as pickSource } from "../shared/sources/sources.mjs";

function out(value, opt, text) {
  if (opt.human && text) console.log(text(value));
  else console.log(opt.pretty ? JSON.stringify(value, null, 2) : JSON.stringify(value));
}

const ENV_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;

function envFromFlags(values) {
  const env = {};
  for (const pair of values === undefined ? [] : [].concat(values)) {
    const eq = typeof pair === "string" ? pair.indexOf("=") : -1;
    const name = eq > 0 ? pair.slice(0, eq) : "";
    if (!ENV_NAME.test(name)) throw new Error(`--env needs NAME=VALUE with NAME matching ${ENV_NAME.source}, got "${pair === true ? "" : pair}"`);
    env[name] = pair.slice(eq + 1);
  }
  return env;
}

function statuslineInput() {
  try {
    return JSON.parse(readFileSync(0, "utf8")) ?? {};
  } catch {
    return {};
  }
}

function onlyComponents(opt, names) {
  const flags = Object.keys(opt).filter((key) => key.endsWith("-only"));
  if (flags.length === 0) return null;
  const chosen = flags.map((flag) => flag.slice(0, -"-only".length));
  const unknown = chosen.filter((name) => !names.includes(name));
  if (unknown.length) throw new Error(`setup-terminal does not know --${unknown[0]}-only; use one of ${names.map((name) => `--${name}-only`).join(", ")}`);
  return chosen;
}

function sessionOf(opt) {
  return typeof opt.session === "string" ? opt.session : process.env.CLAUDE_CODE_SESSION_ID;
}

/** The request from `--text "<text>"` or `--request <file|->`; a flag given without a value is an error. */
function readRequest(opt, verb) {
  if (typeof opt.text === "string") return opt.text;
  if (typeof opt.request === "string") return readFileSync(opt.request === "-" ? 0 : opt.request, "utf8");
  throw new Error(`${verb} needs --text "<request>" or --request <file|->`);
}

export const LEGACY_VERBS = ["extension", "extensions", "new", "review-summary", "find-verdict", "drive", "check", "mutate", "statusline", "setup-terminal", "uninstall", "pr", "source"];

export async function legacyMain(argv) {
  const { pos, opt } = parseArgs(argv);
  const [verb, ...rest] = pos;
  const root = opt.root ?? projectRoot();
  switch (verb) {
    case "extension": {
      if (rest[0] !== "new" || !rest[1]) throw new Error("extension needs: new <name>");
      const made = scaffoldExtension(root, rest[1]);
      out(made, opt, (v) => `created ${v.manifest} and enabled ${v.name} (extensions: ${v.extensions.join(", ")})\nnext: list your files in its rules, agents, review_steps or preflight keys`);
      return 0;
    }
    case "extensions": {
      out(describeExtensions(loadExtensions(root)), opt, renderExtensions);
      return 0;
    }
    case "new": {
      if (!opt.lane || !opt.title) throw new Error("new needs --lane and --title");
      const given = "text" in opt || "request" in opt;
      const request = given ? readRequest(opt, "new") : null;
      if (given && !request) throw new Error('new: the request is empty; pass the request text with --text "<request>" or drop the flag');
      if (("ticket" in opt || "story" in opt) && (typeof opt.ticket !== "string" || typeof opt.story !== "string")) throw new Error("new needs --ticket <KEY> and --story <file> together");
      let s;
      try {
        s = createWork({ lane: opt.lane, title: String(opt.title), id: opt.id, source: opt.ticket ?? opt.source, request, story: opt.story ? readFileSync(opt.story) : null, session: sessionOf(opt), root });
      } catch (err) {
        if (!(err instanceof IntakeError)) throw err;
        out({ error: "source references not found", failures: err.failures }, opt, () => err.message);
        return 2;
      }
      // Intake without a reachable source still saves story.md; say so, or the missing snapshots go unnoticed.
      const { sources } = loadConfig(root);
      const noSource = opt.story && !sources.some((x) => x.root);
      const why = sources.map((x) => `${x.name}: ${x.reason}`).join("; ") || `none declared in ${configRel()}`;
      const warnings = noSource ? [`story.md saved without snapshots: no reachable source (${why})`] : [];
      out({ ...s, dir: `work/${s.id}`, warnings, next: next(s.id, root) }, opt, (v) => `created work/${v.id} (${v.lane}) · next: ${v.next.action} by ${v.next.actor}${v.warnings.map((w) => `\nWARNING: ${w}`).join("")}`);
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
    case "find-verdict": {
      out({ verdict: findVerdict(opt.text ?? readFileSync(0, "utf8")) }, opt, (v) => v.verdict ?? "");
      return 0;
    }
    case "drive": {
      // Starts the app (or runs a CLI command), exercises it, stops it, and logs the evidence itself.
      const env = envFromFlags(opt.env);
      const r = await drive({
        root,
        env,
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
    case "mutate": {
      if (!rest[0]) throw new Error("mutate needs <id>");
      const r = mutate(rest[0], { root });
      out(r, opt, renderMutation);
      return r.outcome === "error" ? 2 : 0;
    }
    case "statusline": {
      const now = Date.now();
      const probe = liveProbe({ cacheDir: join(tmpdir(), "picket-statusline"), now });
      const input = statuslineInput();
      const rendered = renderStatusline(input, { now, columns: Number(process.env.COLUMNS), icons: iconsMode(homedir()), probe });
      process.stdout.write(`${rendered}\n`);
      recordSessionCost(input, { root: projectRoot(input.workspace?.project_dir ?? workspaceDir(input) ?? undefined) });
      return 0;
    }
    case "setup-terminal": {
      const { COMPONENTS, renderReport, setupTerminal } = await import("../shared/styling/setup.mjs");
      const { realHost } = await import("../shared/styling/host.mjs");
      const only = onlyComponents(opt, COMPONENTS.map((component) => component.name));
      const report = await setupTerminal(realHost(), { only, dryRun: opt["dry-run"] === true, yes: opt.yes === true, revert: opt.revert === true });
      if (opt.json) console.log(opt.pretty ? JSON.stringify(report, null, 2) : JSON.stringify(report));
      else console.log(renderReport(report));
      return report.changes.some((change) => change.result === "failed") ? 2 : 0;
    }
    case "uninstall": {
      const { uninstall } = await import("../shared/styling/uninstall.mjs");
      const { renderReport } = await import("../shared/styling/setup.mjs");
      const { realHost } = await import("../shared/styling/host.mjs");
      const report = await uninstall(realHost(), { yes: opt.yes === true });
      if (opt.json) console.log(opt.pretty ? JSON.stringify(report, null, 2) : JSON.stringify(report));
      else console.log(renderReport(report));
      return report.changes.some((change) => change.result === "failed") ? 2 : 0;
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
    case "source": {
      const { sources } = loadConfig(root);
      if (rest[0] === "pick") {
        // The opening gate's answer: one version for an ambiguous story reference.
        const [, id, ref, label] = rest;
        if (!id || !ref || !label) throw new Error("source pick needs <id> <ref> <label>");
        const rec = pickSource(workDir(id, root), ref, label, sources);
        out({ ...rec, next: next(id, root) }, opt, (v) => `${v.ref}: ${v.branch ?? v.worktree} @ ${String(v.commit).slice(0, 8)} (chosen_by user) · next: ${v.next.action}`);
        return 0;
      }
      if (rest[0] === "add") {
        // A reference the architect brings in after intake; ambiguous or missing exits 2, writing nothing.
        const [, id, ref] = rest;
        if (!id || !ref) throw new Error("source add needs <id> <ref>");
        readState(id, root); // an unknown id fails here, not as a missing directory
        try {
          const r = addSource(workDir(id, root), ref, sources);
          out(r, opt, (v) => `${v.ref.ref}: ${v.added ? `added from ${v.ref.branch ?? v.ref.worktree} @ ${String(v.ref.commit).slice(0, 8)} (${v.ref.chosen_by}) · snapshot ${v.ref.snapshot}` : "already recorded"}`);
          return 0;
        } catch (err) {
          if (!(err instanceof LookupError)) throw err;
          out({ ref, error: err.message }, opt, () => err.message);
          return 2;
        }
      }
      // Read-only discovery across every worktree and local branch of a declared source.
      const [sub, name, query] = rest;
      if (!["find", "grep"].includes(sub) || !name || query === undefined) throw new Error("source needs find <name> <substring>, grep <name> <regex> [--path <prefix>], pick <id> <ref> <label>, or add <id> <ref>");
      const source = sources.find((s) => s.name === name);
      if (!source) throw new Error(`no source named ${name}; declared: ${sources.map((s) => s.name).join(", ") || `(none, see ${configRel()})`}`);
      if (!source.root) {
        out({ source: name, error: source.reason }, opt, (v) => `source ${v.source} is unreachable: ${v.error}`);
        return 2;
      }
      const r = sub === "find" ? findInSource(source, query) : grepInSource(source, query, { path: typeof opt.path === "string" ? opt.path : null });
      const more = (v) => (v.overflow ? `\n+${v.overflow} more not shown` : "");
      out({ source: name, root: source.root, ...r }, opt, (v) => (v.hits.map((h) => (h.line ? `${h.path}:${h.line} [${h.places.join(", ")}] ${h.text}` : `${h.path} [${h.places.join(", ")}]`)).join("\n") || "(no hits)") + more(v));
      return 0;
    }
    case "check": {
      const r = check({ root, steps: opt.steps ? String(opt.steps).split(",").filter(Boolean) : undefined, only: opt.only === true ? undefined : opt.only, timeoutMs: opt.timeout ? Number(opt.timeout) * 1000 : undefined });
      out(r, opt, renderCheck);
      return r.ok ? 0 : 2;
    }
    default:
      throw new Error(`unknown verb "${verb}". Verbs: ${LEGACY_VERBS.join(" ")}`);
  }
}
