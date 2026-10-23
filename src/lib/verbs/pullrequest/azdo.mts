import { ProgramFailed, runProgram } from "../../util/process.mts";
import { PAT_VARS, type AzdoPullRequest, type GitHubPullRequest, type PullRequest } from "./pull-request.mts";
import { buildThreads, type Thread } from "./threads.mts";

export type PullRequestMeta = { title: string; description: string; source_ref: string | null; target_ref: string | null; author: string | null; status: string | null };
export type MetaResult = { meta: PullRequestMeta; reason: null } | { meta: null; reason: string };
export type PostResult = { posted: number; threads: Thread[] };
export type AzdoRequest = { method?: string; body?: unknown; pat: string; apiVersion?: string };

const CURRENT_API = "7.1";
const SERVER_2020_API = "6.0";
const REQUEST_TIMEOUT_MS = 20_000;
const GH_TIMEOUT_MS = 30_000;
const ERROR_BODY_CHARS = 200;
const REDACTED = "***";

function basicAuth(pat: string): string {
  return Buffer.from(`:${pat}`).toString("base64");
}

const REGEX_SPECIAL = /[.*+?^${}()|[\]\\/-]/g;

function hexOf(ch: string, width: number): string {
  return (ch.codePointAt(0) ?? 0).toString(16).padStart(width, "0");
}

function anyEncodingOf(ch: string): string {
  const forms = [ch.replace(REGEX_SPECIAL, "\\$&"), `\\\\u${hexOf(ch, 4)}`, encodeURIComponent(ch).replace(REGEX_SPECIAL, "\\$&"), `%${hexOf(ch, 2)}`];
  if (ch === "/") forms.push("\\\\/");
  return `(?:${forms.join("|")})`;
}

function encodedSecret(secret: string): RegExp {
  return new RegExp([...secret].map(anyEncodingOf).join(""), "gi");
}

function withoutPat(text: string, pat: string): string {
  if (!pat) return text;
  return [pat, basicAuth(pat)].reduce((redacted, secret) => redacted.replace(encodedSecret(secret), REDACTED), text);
}

function errorBody(text: string, pat: string): string {
  return withoutPat(text, pat).slice(0, ERROR_BODY_CHARS);
}

export async function azdoRequest(pr: AzdoPullRequest, path: string, { method = "GET", body, pat, apiVersion = CURRENT_API }: AzdoRequest): Promise<unknown> {
  const url = `${pr.api_base}${path}${path.includes("?") ? "&" : "?"}api-version=${apiVersion}`;
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Basic ${basicAuth(pat)}`, "Content-Type": "application/json", Accept: "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (res.status === 400 && apiVersion === CURRENT_API) return azdoRequest(pr, path, { method, body, pat, apiVersion: SERVER_2020_API });
  if (!res.ok) throw new Error(`${method} ${url} → ${res.status} ${res.statusText}: ${errorBody(await res.text(), pat)}`);
  return res.json();
}

type GhView = { title: string; body?: string; headRefName: string; baseRefName: string; author?: { login?: string }; state: string };
type AzdoView = { title?: string; description?: string; sourceRefName?: string; targetRefName?: string; createdBy?: { displayName?: string }; status?: string };

function gitHubMeta(pr: GitHubPullRequest, root: string): MetaResult {
  try {
    const out = runProgram("gh", ["pr", "view", String(pr.id), "--repo", `${pr.owner}/${pr.repo}`, "--json", "title,body,headRefName,baseRefName,author,state"], { cwd: root, timeoutMs: GH_TIMEOUT_MS });
    const j = JSON.parse(out) as GhView;
    return { meta: { title: j.title, description: j.body ?? "", source_ref: j.headRefName, target_ref: j.baseRefName, author: j.author?.login ?? null, status: j.state }, reason: null };
  } catch (err) {
    const why = err instanceof ProgramFailed ? err.lastLine : String((err as Error).message).trim().split("\n").at(-1);
    return { meta: null, reason: `gh pr view failed: ${why}` };
  }
}

async function azdoMeta(pr: AzdoPullRequest, pat: string | null): Promise<MetaResult> {
  if (!pat) return { meta: null, reason: `no PAT in ${PAT_VARS.join(" or ")}; title and description not fetched, review runs code-only` };
  try {
    const j = (await azdoRequest(pr, "", { pat })) as AzdoView;
    return {
      meta: { title: j.title ?? "", description: j.description ?? "", source_ref: j.sourceRefName ?? null, target_ref: j.targetRefName ?? null, author: j.createdBy?.displayName ?? null, status: j.status ?? null },
      reason: null,
    };
  } catch (err) {
    return { meta: null, reason: (err as Error).message };
  }
}

export async function pullRequestMeta(pr: PullRequest, { pat, root }: { pat: string | null; root: string }): Promise<MetaResult> {
  return pr.provider === "github" ? gitHubMeta(pr, root) : azdoMeta(pr, pat);
}

export async function postThreads(pr: PullRequest, reviewText: string, { pat, dryRun }: { pat: string | null; dryRun: boolean }): Promise<PostResult> {
  if (pr.provider !== "azdo") throw new Error("posting is implemented for Azure DevOps only; use gh pr review for GitHub");
  const threads = buildThreads(reviewText);
  if (dryRun) return { posted: 0, threads };
  if (!pat) throw new Error(`no PAT in ${PAT_VARS.join(" or ")}; cannot post`);
  let posted = 0;
  for (const thread of threads) {
    await azdoRequest(pr, "/threads", { method: "POST", body: thread, pat });
    posted++;
  }
  return { posted, threads };
}
