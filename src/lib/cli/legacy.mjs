// The kernel CLI. Every verb prints JSON on stdout (add --pretty for an indented copy, --human for a
// one-line human summary) and exits 0 on success, 1 on a usage error, 2 on a failed check.
import { readFileSync } from "node:fs";
import { preparePullRequest, parsePullRequestUrl, postReview } from "../verbs/pullrequest/pr.mjs";
import { projectRoot } from "../shared/work/work.mjs";
import { parseArgs } from "../util/args.mjs";

function out(value, opt, text) {
  if (opt.human && text) console.log(text(value));
  else console.log(opt.pretty ? JSON.stringify(value, null, 2) : JSON.stringify(value));
}

function onlyComponents(opt, names) {
  const flags = Object.keys(opt).filter((key) => key.endsWith("-only"));
  if (flags.length === 0) return null;
  const chosen = flags.map((flag) => flag.slice(0, -"-only".length));
  const unknown = chosen.filter((name) => !names.includes(name));
  if (unknown.length) throw new Error(`setup-terminal does not know --${unknown[0]}-only; use one of ${names.map((name) => `--${name}-only`).join(", ")}`);
  return chosen;
}

export const LEGACY_VERBS = ["setup-terminal", "uninstall", "pr"];

export async function legacyMain(argv) {
  const { pos, opt } = parseArgs(argv);
  const [verb, ...rest] = pos;
  const root = opt.root ?? projectRoot();
  switch (verb) {
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
    default:
      throw new Error(`unknown verb "${verb}". Verbs: ${LEGACY_VERBS.join(" ")}`);
  }
}
