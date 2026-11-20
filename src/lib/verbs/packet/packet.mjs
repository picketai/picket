import { existsSync } from "node:fs";
import { join } from "node:path";
import { itemDataRuns } from "../../shared/data/runs.mts";
import { COMPOSE_FILE, ENV_DIR } from "../../shared/env/standard.mts";
import { keepText, readCandidates } from "../../shared/scenarios/keep.mts";
import { readResults, replaySummary, summaryText } from "../../shared/scenarios/results.mts";
import { phaseOf, readSnapshot, stateView } from "../../shared/work/snapshot.mts";
import { ARTIFACT_BY_LANE } from "../../shared/work/state.mts";
import { projectRoot } from "../../shared/paths.mts";
import { latestCheck, redBeforeChange } from "../../shared/check-log.mts";
import { nextOf } from "../../shared/work/next-view.mts";
import { blockField, COMMENT_SEPARATOR, parseBlock, proposals, readBlock, WAIVER_SEPARATOR } from "../../shared/work/block.mts";
import { loadConfig, securityPaths } from "../../shared/config.mjs";
import { liveLookup } from "../../shared/sources/places.mts";
import { reportFindings } from "../../shared/work/report.mts";
import { nestedCheckoutPaths, phaseCommitMessage } from "../../shared/route/commit.mts";
import { planWorktrees, ticketKey } from "../../shared/checkouts.mts";
import { readDriveLog } from "../../shared/drive-log.mts";
import { carriedResults, mismatchText, phaseCheckProblems, phaseCheckResults } from "../../shared/work/declared-checks.mts";
import { testFixCommit, testFixPaths } from "../../shared/route/apply.mts";
import { listedPathMatcher, stagedFiles } from "../../shared/git.mts";
import { testedCriteria } from "../../shared/testing/derive.mts";
import { latestCases, readTestRows, roundRows, testRound } from "../../shared/testing/results.mts";

export const WIDTH = 100;
const LABEL = 10;

export function cut(s, n) {
  const t = String(s ?? "").replace(/\s+/g, " ").trim();
  return t.length <= n ? t : t.slice(0, Math.max(0, n - 1)).trimEnd() + "…";
}

/**
 * First sentence, cut to the width: the headline is a claim, not a paragraph. A sentence that runs
 * past the width is cut at its last clause break (colon, semicolon, comma) so the claim survives
 * and the explanation goes.
 */
function firstSentence(s, n) {
  const t = String(s ?? "").replace(/\s+/g, " ").trim();
  const sentence = (t.match(/^(.+?[.!?])(\s|$)/) ?? [null, t])[1];
  if (sentence.length <= n) return sentence;
  const head = sentence.slice(0, n - 1);
  const brk = Math.max(head.lastIndexOf(": "), head.lastIndexOf("; "), head.lastIndexOf(", "));
  return brk > n / 2 ? head.slice(0, brk) + "…" : cut(sentence, n);
}

function wrap(s, n) {
  const lines = [];
  for (const word of String(s ?? "").replace(/\s+/g, " ").trim().split(" ")) {
    const last = lines.at(-1);
    if (last !== undefined && last.length + 1 + word.length <= n) lines[lines.length - 1] = `${last} ${word}`;
    else lines.push(word);
  }
  return lines;
}

function actionHeading(n, id) {
  return `▶ ${n.action.replace(/_/g, " ")}${n.actor ? ` by ${n.actor}` : ""}${n.phase ? ` · phase ${n.phase}` : ""} · ${id}`;
}

function field(label, value, width = WIDTH) {
  return `  ${label.padEnd(LABEL)}${cut(value, width - 2 - LABEL)}`;
}

/** As many whole paths as fit the width, then "+k more"; a path is never cut in half. */
function filesLine(value, width = WIDTH) {
  const room = width - 2 - LABEL;
  const parts = String(value ?? "")
    .replace(/\(\+\d+ more\)/, "")
    .split(/,\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
  const extra = Number(String(value ?? "").match(/\+(\d+) more/)?.[1] ?? 0);
  const shown = [];
  for (const p of parts) {
    const candidate = [...shown, p].join(", ");
    const remaining = parts.length - shown.length - 1 + extra;
    const tail = remaining > 0 ? `, +${remaining} more` : "";
    if (shown.length && candidate.length + tail.length > room) break;
    shown.push(p);
  }
  const more = parts.length - shown.length + extra;
  return cut(shown.join(", ") + (more > 0 ? `, +${more} more` : ""), room);
}

function decisionLines(value, width = WIDTH) {
  const v = String(value ?? "").trim();
  if (!v || /^none$/i.test(v)) return [];
  const items = v.split(/;\s+|\n/).map((s) => s.trim()).filter(Boolean);
  const shown = items.slice(0, 3).map((d) => `  ${"".padEnd(LABEL)}· ${cut(d, width - LABEL - 4)}`);
  if (items.length > 3) shown.push(`  ${"".padEnd(LABEL)}· +${items.length - 3} more in the phase block`);
  return shown;
}

const SHOWN_PROPOSALS = 3;

function proposalLines(label, items, width = WIDTH) {
  const indent = `  ${"".padEnd(LABEL)}`;
  const shown = items.slice(0, SHOWN_PROPOSALS).map((p, i) => `${indent}${i + 1} ${cut(p, width - indent.length - 2)}`);
  if (items.length > SHOWN_PROPOSALS) shown.push(`${indent}+${items.length - SHOWN_PROPOSALS} more in the phase block`);
  return [`  ${label.padEnd(LABEL)}${shown[0].slice(2 + LABEL)}`, ...shown.slice(1)];
}

/** One line per version of an ambiguous reference: label, branch, short commit, dirty flag. */
function describeCandidates(ref, root) {
  const source = loadConfig(root).sources.find((s) => s.name === ref.source);
  if (!source?.root) return (ref.candidates ?? []).map((label) => `${label} (source ${ref.source} unreachable)`);
  return liveLookup().candidates(source, ref.path).map((c) => {
    const branch = c.branch === c.label ? "" : ` (${c.branch ? `branch ${c.branch}` : "detached"})`;
    return `${c.label}${branch} @ ${String(c.commit ?? "").slice(0, 8)}${c.dirty ? " · uncommitted changes" : ""} · ${c.worktree ?? "branch only, no worktree"}`;
  });
}

function plannedLine({ repo, from, base, worktree }) {
  return `${repo} from ${from} @${base ? base.slice(0, 8) : "unresolved"} -> ${worktree}`;
}

const MAIN_REPO = "main repo";

function repoLines(dirs, subject) {
  if (!dirs.length) return [subject];
  return [...dirs, MAIN_REPO].flatMap((dir) => [dir, `  ${subject}`]);
}

function commitLines(root, snap, phase, width) {
  const checked = phaseCommitMessage(root, snap, phase);
  if ("problem" in checked) return [field("commit", `not committable: ${checked.problem}`, width)];
  const indent = `  ${"".padEnd(LABEL)}`;
  const room = width - indent.length;
  const [subject, ...body] = checked.message.split("\n");
  const dirs = [...nestedCheckoutPaths(root, snap, phase).keys()];
  const [first, ...rest] = [...repoLines(dirs, subject), ...body.filter((line) => line.trim()).map((line) => cut(line, room))];
  return [`  ${"commit".padEnd(LABEL)}${first}`, ...rest.map((line) => indent + line)];
}

const UNLOGGED_RED = "(no failing picket check before the code changed)";

function reportsFailure(red) {
  return red.includes("failed") && !/^(pinned|n\/a):/i.test(red);
}

function redLines(red, logRed, width) {
  const lines = [field("red", red, width)];
  if (reportsFailure(red) && logRed === null) lines.push(`  ${"".padEnd(LABEL)}${cut(UNLOGGED_RED, width - 2 - LABEL)}`);
  return lines;
}

function reportedCheck(block, label, logged, step) {
  const own = blockField(block, label) ?? null;
  if (own !== null) return own;
  const status = logged?.steps.find((s) => s.name === step)?.status;
  return status ? `${status} (picket check)` : "not reported";
}

function listField(label, items, width) {
  if (!items.length) return [];
  const indent = `  ${"".padEnd(LABEL)}`;
  return [field(label, items[0], width), ...items.slice(1).map((item) => indent + cut(item, width - indent.length))];
}

function checkLines(root, snap, phase, width) {
  const { rows } = readDriveLog(root);
  const unpassed = (phaseCheckResults(snap, rows, phase) ?? []).filter((result) => result.outcome !== "pass");
  const unreadable = phaseCheckProblems(snap, phase).map((problem) => `drive ${problem}`);
  return [...listField("checks", [...unreadable, ...unpassed.map(mismatchText)], width), ...listField("carried", carriedResults(snap, rows, phase).map(mismatchText), width)];
}

function hasEnvironment(root) {
  return existsSync(join(root, ENV_DIR, COMPOSE_FILE));
}

function scenarioLines(root, id, width) {
  if (!hasEnvironment(root)) return [];
  return [field("scenarios", summaryText(replaySummary(readResults(root), id)), width)];
}

const NOT_REPLAYED = "not kept: not replayed on the environment";

function keepLines(root, snap, phase, width) {
  if (!hasEnvironment(root)) return [];
  const candidates = readCandidates(root, snap.state.id)[String(phase)] ?? [];
  const results = (phaseCheckResults(snap, readDriveLog(root).rows, phase) ?? []).filter((result) => "path" in result.check);
  const items = results.map(({ check, index }) => {
    const candidate = candidates.find((c) => c.index === index);
    return `${check.covers} ${check.method} ${check.path}: ${candidate ? keepText(candidate) : NOT_REPLAYED}`;
  });
  return listField("keeps", items, width);
}

function dataLines(root, id, width) {
  const runs = itemDataRuns(root, id).map(({ entry, server, database, status }) => `${entry} on server ${server}, database ${database}, exit ${status}`);
  return listField("data", runs, width);
}

const INDENT = `  ${"".padEnd(LABEL)}`;

function questionLines(question, width) {
  const choices = question.choices.map((choice) => `${INDENT}· ${cut(`${choice}${choice === question.default ? " (default)" : ""}`, width - INDENT.length - 2)}`);
  const basis = question.basis === null ? [] : [`${INDENT}${cut(`Basis: ${question.basis}`, width - INDENT.length)}`];
  return [field("question", `${question.criterion}: ${question.question}`, width), ...choices, ...basis];
}

function unprovedWhy(rows, criterion) {
  const cells = rows.filter((row) => row.type === "cell" && row.criterion === criterion).map((row) => `${row.kind} ${row.outcome}: ${row.why}`);
  const cases = latestCases(rows).filter((row) => row.criterion === criterion).map((row) => `${row.case} ${row.kind} ${row.outcome}`);
  return [...cases, ...cells].join("; ") || "no case ran";
}

function resolveTestsLines(root, snap, width) {
  const id = snap.state.id;
  const rows = roundRows(readTestRows(root, id), testRound(snap.verdicts) - 1);
  const passed = new Set(latestCases(rows).filter((row) => row.outcome === "passed").map((row) => row.criterion));
  const questions = rows.filter((row) => row.type === "question").flatMap((question) => questionLines(question, width));
  const unproved = testedCriteria(snap.phases).filter((criterion) => !passed.has(criterion)).map((criterion) => `${criterion}: ${unprovedWhy(rows, criterion)}`);
  return [...questions, ...listField("unproved", unproved, width), field("report", `work/${id}/test.md`, width)];
}

function approveFixesLines(root, snap, width) {
  const owns = listedPathMatcher(root, [`work/${snap.state.id}/`, ...testFixPaths(root, snap)]);
  const staged = stagedFiles(root).filter((path) => owns(path));
  const checked = testFixCommit(root, snap);
  const commit = "problem" in checked ? `not committable: ${checked.problem}` : checked.message.split("\n")[0];
  return [...listField("staged", staged.length ? staged : ["nothing staged"], width), field("commit", commit, width)];
}

export function packet(id, root = projectRoot(), { width = WIDTH } = {}) {
  const snap = readSnapshot(root, id);
  const s = stateView(snap);
  const n = nextOf(snap, securityPaths(root));
  const lines = [];
  let options = n.options?.length ? n.options.join("   ") : null;

  if (n.action === "approve_phase" && s.lane !== "research") {
    const raw = readBlock(root, id, n.phase);
    const b = parseBlock(raw ?? "");
    const total = s.phase_count;
    lines.push(`▶ phase ${n.phase}/${total} done · ${id}`);
    lines.push(`  ${firstSentence(b.headline || s.phases.find((p) => p.n === n.phase)?.title || "phase complete", width - 2)}`);
    lines.push("");
    const logged = latestCheck(root, id, n.phase);
    lines.push(field("tests", reportedCheck(b, "Tests", logged, "test"), width));
    lines.push(field("lint", reportedCheck(b, "Lint", logged, "lint"), width));
    lines.push(field("verified", blockField(b, "Verified") ?? "not reported", width));
    lines.push(...checkLines(root, snap, n.phase, width));
    lines.push(...scenarioLines(root, id, width));
    lines.push(...keepLines(root, snap, n.phase, width));
    lines.push(...dataLines(root, id, width));
    const red = blockField(b, "Red");
    if (red) lines.push(...redLines(red, redBeforeChange(root, id, n.phase), width));
    const cause = blockField(b, "Root cause");
    if (cause && !/^none$/i.test(cause)) lines.push(field("cause", cause, width));
    const files = blockField(b, "Files");
    lines.push(field("files", files ? filesLine(files, width) : "not reported", width));
    if (phaseOf(snap, n.phase)?.irreversible) lines.push(`  ${cut(`irreversible: phase ${n.phase} carries an irreversible step`, width - 2)}`);
    if (n.own_gate && n.own_gate.kind !== "irreversible") lines.push(field("gate", `phase ${n.phase} ${n.own_gate.reason}; run grants stop here`, width));
    const dec = decisionLines(blockField(b, "Decisions"), width);
    if (dec.length) {
      lines.push(`  ${"decisions".padEnd(LABEL)}${dec[0].slice(2 + LABEL)}`);
      lines.push(...dec.slice(1));
    }
    const comments = proposals(blockField(b, "Comments"), COMMENT_SEPARATOR);
    if (comments.length) {
      lines.push(...proposalLines("comments", comments, width));
      if (options) options += "   [k] keep comment <n>";
    }
    const waivers = proposals(blockField(b, "Waivers"), WAIVER_SEPARATOR);
    if (waivers.length) {
      lines.push(...proposalLines("waivers", waivers, width));
      if (options) options += "   [w] waive <n>";
    }
    lines.push(...commitLines(root, snap, n.phase, width));
  } else if (n.action === "approve_phase") {
    const body = snap.artifact?.body ?? "";
    const summary = body.match(/^## Summary\s*\n([\s\S]*?)(?=^## |(?![\s\S]))/m)?.[1] ?? "";
    const { findings } = reportFindings(body);
    const deep = !/pending deep pass/i.test(body);
    lines.push(`▶ ${deep ? "report" : "outline"} ready · ${id}`);
    lines.push(`  ${firstSentence(summary || s.title, width - 2)}`);
    lines.push("");
    lines.push(field("report", `work/${id}/${ARTIFACT_BY_LANE.research}`, width));
    lines.push(field("findings", String(findings), width));
  } else if (n.action === "resolve_sources") {
    lines.push(`▶ source references differ · ${id}`);
    lines.push(`  ${cut(`${n.detail}; pick one version of each`, width - 2)}`);
    for (const ref of snap.ambiguousRefs) {
      lines.push("", `  ${cut(ref.ref, width - 2)}`);
      for (const c of describeCandidates(ref, root)) lines.push(`    ${cut(c, width - 4)}`);
    }
  } else if (n.action === "create_worktrees") {
    lines.push(`▶ worktrees before phase ${n.phase} · ${id}`);
    lines.push(`  ${cut(n.detail, width - 2)}`);
    lines.push("");
    const name = ticketKey(snap.state.source) ?? "<name>";
    for (const planned of planWorktrees(root, snap, { name })) lines.push(`  ${cut(plannedLine(planned), width - 2)}`);
  } else if (n.action === "resolve_block") {
    const raw = s.current_phase ? readBlock(root, id, s.current_phase) : null;
    const b = parseBlock(raw ?? "");
    lines.push(`▶ blocked · ${id}`);
    lines.push(`  ${cut(s.blocked_reason ?? n.detail, width - 2)}`);
    if (b.headline) lines.push("", field("developer", firstSentence(b.headline, width - 2 - LABEL), width));
  } else if (n.action === "resolve_tests") {
    lines.push(actionHeading(n, id));
    lines.push("");
    lines.push(...resolveTestsLines(root, snap, width));
  } else if (n.action === "approve_fixes") {
    lines.push(actionHeading(n, id));
    lines.push(`  ${cut(n.detail, width - 2)}`);
    lines.push("");
    lines.push(...approveFixesLines(root, snap, width));
  } else if (n.action === "approve_amendment") {
    lines.push(actionHeading(n, id));
    lines.push(...wrap(n.detail, width - 2).map((line) => `  ${line}`));
  } else {
    lines.push(actionHeading(n, id));
    lines.push(`  ${cut(n.detail, width - 2)}`);
  }
  if (options) lines.push("", options);
  return { lines, text: lines.join("\n"), next: n };
}
