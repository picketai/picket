// Pull requests as review targets. A PR is a diff whose base and head come from a URL instead of a
// work item: the kernel resolves the URL to a local remote, fetches the PR's merge ref, and hands the
// reviewer the same summary it gets for a phase. Reading needs only git and the credentials the clone
// already has; the PR's title and description, and posting findings back, use the Azure DevOps REST
// API with a PAT (AZDO_PAT, or AZURE_DEVOPS_EXT_PAT as the az CLI names it) or the gh CLI for GitHub.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { reviewSummaryRange } from "./review.mjs";

export const PAT_VARS = ["AZDO_PAT", "AZURE_DEVOPS_EXT_PAT"];

/**
 * Azure DevOps Server:   https://tfs.corp.local/tfs/DefaultCollection/Fleet/_git/Rent/pullrequest/7287
 * Azure DevOps Services: https://dev.azure.com/org/Fleet/_git/Rent/pullrequest/7287
 * Legacy Services:       https://org.visualstudio.com/Fleet/_git/Rent/pullrequest/7287
 * GitHub:                https://github.com/owner/repo/pull/42
 */
export function parsePullRequestUrl(raw) {
  let u;
  try {
    u = new URL(String(raw).trim());
  } catch {
    throw new Error(`not a URL: ${raw}`);
  }
  const segs = u.pathname.split("/").filter(Boolean).map((s) => decodeURIComponent(s));
  if (/(^|\.)github\.com$/i.test(u.hostname)) {
    const i = segs.indexOf("pull");
    if (i !== 2 || !/^\d+$/.test(segs[3] ?? "")) throw new Error(`not a GitHub pull request URL: ${raw}`);
    return { provider: "github", host: u.hostname, owner: segs[0], repo: segs[1], id: Number(segs[3]), url: raw.trim(), api_base: null, project: null, collection_url: null };
  }
  const g = segs.indexOf("_git");
  const p = segs.indexOf("pullrequest");
  if (g < 1 || p !== g + 2 || !/^\d+$/.test(segs[p + 1] ?? "")) throw new Error(`not an Azure DevOps pull request URL (expected …/<project>/_git/<repo>/pullrequest/<id>): ${raw}`);
  const project = segs[g - 1];
  const collectionSegs = segs.slice(0, g - 1); // Server: [tfs, DefaultCollection]; Services: [org]; visualstudio.com: []
  const collection_url = `${u.origin}${collectionSegs.length ? "/" + collectionSegs.map(encodeURIComponent).join("/") : ""}`;
  return { provider: "azdo", host: u.hostname, collection_url, project, repo: segs[g + 1], id: Number(segs[p + 1]), url: raw.trim(), api_base: `${collection_url}/${encodeURIComponent(project)}/_apis/git/repositories/${encodeURIComponent(segs[g + 1])}/pullRequests/${segs[p + 1]}` };
}

function git(root, args, opts = {}) {
  return execFileSync("git", ["-C", root, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], ...opts }).trim();
}

/**
 * Where the PR's repository is checked out: the root itself, or a nested repo one or two levels
 * down (an umbrella with `src/Rent` as its own clone is the common shape here). Returns the repo
 * path and the remote name, or null with the reason.
 */
export function locateRepo(root, pr) {
  const candidates = [root];
  for (const sub of ["src", "repos", "packages", "."]) {
    const dir = join(root, sub);
    let entries = [];
    try {
      entries = readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory() && !e.name.startsWith(".") && e.name !== "node_modules");
    } catch {}
    for (const e of entries) candidates.push(join(dir, e.name));
  }
  const seen = [];
  for (const dir of candidates) {
    if (!existsSync(join(dir, ".git"))) continue;
    const r = findRemote(dir, pr);
    if (r.remote) return { repo_root: dir, remote: r.remote, url: r.url };
    seen.push(...r.seen.map((s) => `${dir}: ${s}`));
  }
  return { repo_root: null, remote: null, reason: `no clone of ${pr.repo} (${pr.host}) found in ${root} or its nested repositories; clone it first, or pass --repo <path>` };
}

/** The local remote that points at the PR's repository, or null with the remotes seen. */
export function findRemote(root, pr) {
  let out;
  try {
    out = git(root, ["remote", "-v"]);
  } catch {
    return { remote: null, seen: [], reason: `${root} is not a git repository` };
  }
  const remotes = [...new Set(out.split(/\r?\n/).filter(Boolean).map((l) => l.split(/\s+/)).filter((p) => p.length >= 2).map((p) => `${p[0]} ${p[1]}`))];
  const repo = pr.repo.toLowerCase();
  const wanted = pr.provider === "github" ? [`${pr.owner}/${pr.repo}`.toLowerCase()] : [`_git/${repo}`, `/${repo}`, `/${repo}.git`];
  for (const line of remotes) {
    const [name, url] = line.split(" ");
    let lower = url.toLowerCase().replaceAll("\\", "/"); // file remotes on Windows carry backslashes
    try {
      lower = decodeURIComponent(lower);
    } catch {}
    const hostOk = lower.includes(pr.host.toLowerCase()) || (pr.provider === "azdo" && lower.includes(pr.project.toLowerCase()));
    if (hostOk && wanted.some((w) => lower.includes(w))) return { remote: name, url, seen: remotes };
  }
  return { remote: null, seen: remotes, reason: `no remote in ${root} points at ${pr.repo} on ${pr.host}; clone it first or run from its checkout` };
}

/**
 * Fetch the PR's merge ref (both Azure DevOps and GitHub publish refs/pull/<id>/merge) into
 * refs/harness/pr/<id>/merge. base is the target branch tip the merge was computed against
 * (first parent), head the merge itself, so `git diff base head` is exactly what merging would change.
 */
export function fetchPullRequest(root, remote, id) {
  const local = `refs/harness/pr/${id}/merge`;
  try {
    git(root, ["fetch", "--quiet", remote, `+refs/pull/${id}/merge:${local}`], { timeout: 120_000 });
  } catch (err) {
    throw new Error(`could not fetch refs/pull/${id}/merge from ${remote}: ${String(err.stderr ?? err.message).trim().split("\n").at(-1)}. The PR may have merge conflicts (no merge ref is published then) or the id is wrong.`);
  }
  const head = git(root, ["rev-parse", local]);
  const parents = git(root, ["rev-list", "--parents", "-n", "1", local]).split(/\s+/).slice(1);
  if (parents.length < 2) throw new Error(`refs/pull/${id}/merge is not a merge commit; cannot tell base from head`);
  return { ref: local, head, base: parents[0], source: parents[1] };
}

/**
 * The PAT, from the process environment first (a `setx AZDO_PAT …` user variable, or the `env`
 * block of .claude/settings.local.json that Claude Code applies to the session), then from that
 * local settings file directly, so `harness pr` also works from a plain shell. Never from a tracked
 * file, and never printed.
 */
export function patFromEnv(env = process.env, root = process.cwd()) {
  for (const v of PAT_VARS) if (env[v]) return env[v];
  try {
    const local = JSON.parse(readFileSync(join(root, ".claude", "settings.local.json"), "utf8"));
    for (const v of PAT_VARS) if (local?.env?.[v]) return String(local.env[v]);
  } catch {}
  return null;
}

async function azdoRequest(pr, path, { method = "GET", body, pat, apiVersion = "7.1" } = {}) {
  const url = `${pr.api_base}${path}${path.includes("?") ? "&" : "?"}api-version=${apiVersion}`;
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Basic ${Buffer.from(`:${pat}`).toString("base64")}`, "Content-Type": "application/json", Accept: "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20_000),
  });
  if (res.status === 400 && apiVersion === "7.1") return azdoRequest(pr, path, { method, body, pat, apiVersion: "6.0" }); // Server 2020 and older
  if (!res.ok) throw new Error(`${method} ${url} → ${res.status} ${res.statusText}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

/** Title, description and refs. Without a PAT (or gh) returns null with the reason; the review still runs code-only. */
export async function pullRequestMeta(pr, { pat = patFromEnv(process.env, root), root } = {}) {
  if (pr.provider === "github") {
    try {
      const j = JSON.parse(execFileSync("gh", ["pr", "view", String(pr.id), "--repo", `${pr.owner}/${pr.repo}`, "--json", "title,body,headRefName,baseRefName,author,state"], { encoding: "utf8", cwd: root, stdio: ["ignore", "pipe", "pipe"] }));
      return { meta: { title: j.title, description: j.body ?? "", source_ref: j.headRefName, target_ref: j.baseRefName, author: j.author?.login ?? null, status: j.state }, reason: null };
    } catch (err) {
      return { meta: null, reason: `gh pr view failed: ${String(err.stderr ?? err.message).trim().split("\n").at(-1)}` };
    }
  }
  if (!pat) return { meta: null, reason: `no PAT in ${PAT_VARS.join(" or ")}; title and description not fetched, review runs code-only` };
  try {
    const j = await azdoRequest(pr, "", { pat });
    return {
      meta: { title: j.title ?? "", description: j.description ?? "", source_ref: j.sourceRefName ?? null, target_ref: j.targetRefName ?? null, author: j.createdBy?.displayName ?? null, status: j.status ?? null },
      reason: null,
    };
  } catch (err) {
    return { meta: null, reason: err.message };
  }
}

/** Findings of the form `- [Severity] path:line — what. why. fix.` from a reviewer block. */
export function parseFindings(text) {
  const out = [];
  for (const line of String(text).split(/\r?\n/)) {
    // `path:42`, `path:113-165` (a range, seen live), or a bare path for a file-level remark
    const m = line.match(/^- \[(Critical|Major|Minor|Nit)\]\s+`?([^\s:—`]+)`?(?::(\d+)(?:-(\d+))?)?\s+—\s+(.*)$/);
    if (m) out.push({ severity: m[1], path: m[2], line: m[3] ? Number(m[3]) : null, end_line: m[4] ? Number(m[4]) : m[3] ? Number(m[3]) : null, text: m[5].trim() });
  }
  return out;
}

/** The thread payloads Azure DevOps takes: one summary thread, one per located finding. */
export function buildThreads(reviewText) {
  const lines = String(reviewText).replace(/\r\n/g, "\n").split("\n");
  const verdict = lines.filter((l) => l.trim()).at(-1)?.trim() ?? "";
  const headline = lines.find((l) => l.trim() && !l.startsWith("## ")) ?? "";
  const findings = parseFindings(reviewText);
  const counts = findings.reduce((c, f) => ((c[f.severity] = (c[f.severity] ?? 0) + 1), c), {});
  const summary = `**Harness review: ${verdict}**\n\n${headline.trim()}\n\nFindings: ${Object.entries(counts).map(([k, v]) => `${v} ${k.toLowerCase()}`).join(", ") || "none"}.`;
  const threads = [{ comments: [{ parentCommentId: 0, content: summary, commentType: 1 }], status: verdict === "APPROVED" ? 2 : 1 }];
  for (const f of findings) {
    const t = { comments: [{ parentCommentId: 0, content: `**[${f.severity}]** ${f.text}`, commentType: 1 }], status: 1 };
    if (f.line) t.threadContext = { filePath: `/${f.path.replace(/^\/+/, "")}`, rightFileStart: { line: f.line, offset: 1 }, rightFileEnd: { line: f.end_line ?? f.line, offset: 1 } };
    threads.push(t);
  }
  return threads;
}

/** Post the review as PR threads. Dry run returns the payloads and posts nothing. */
export async function postReview(pr, reviewText, { root = process.cwd(), pat = patFromEnv(process.env, root), dryRun = false } = {}) {
  if (pr.provider !== "azdo") throw new Error("posting is implemented for Azure DevOps only; use gh pr review for GitHub");
  const threads = buildThreads(reviewText);
  if (dryRun) return { posted: 0, threads };
  if (!pat) throw new Error(`no PAT in ${PAT_VARS.join(" or ")}; cannot post`);
  let posted = 0;
  for (const t of threads) {
    await azdoRequest(pr, "/threads", { method: "POST", body: t, pat });
    posted++;
  }
  return { posted, threads };
}

/**
 * Everything the lead needs to spawn the reviewer for a PR: the parsed URL, the remote, the fetched
 * base and head, the review summary over that range, and the PR's title and description when reachable.
 */
export async function preparePullRequest(url, { root, repo, pat } = {}) {
  const pr = parsePullRequestUrl(url);
  const r = repo ? { repo_root: repo, ...findRemote(repo, pr) } : locateRepo(root, pr);
  if (!r.remote) throw new Error(r.reason);
  const repoRoot = r.repo_root;
  const refs = fetchPullRequest(repoRoot, r.remote, pr.id);
  const summary = reviewSummaryRange(repoRoot, refs.base, refs.head);
  const { meta, reason } = await pullRequestMeta(pr, { pat: pat === undefined ? patFromEnv(process.env, root) : pat, root: repoRoot });
  return { pr, repo_root: repoRoot, remote: r.remote, ...refs, summary, meta, meta_reason: reason, review_id: `pr-${pr.id}` };
}
