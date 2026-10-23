import { hostPath } from "../../shared/paths.mts";
import { readJson } from "../../util/io.mts";

export type GitHubPullRequest = { provider: "github"; host: string; owner: string; repo: string; id: number; url: string; api_base: null; project: null; collection_url: null };
export type AzdoPullRequest = { provider: "azdo"; host: string; collection_url: string; project: string; repo: string; id: number; url: string; api_base: string };
export type PullRequest = GitHubPullRequest | AzdoPullRequest;

export const PAT_VARS = ["AZDO_PAT", "AZURE_DEVOPS_EXT_PAT"] as const;

type LocalSettings = { env?: Record<string, unknown> } | null;

const DIGITS = /^\d+$/;

function urlOf(raw: string): URL {
  try {
    return new URL(String(raw).trim());
  } catch {
    throw new Error(`not a URL: ${raw}`);
  }
}

function gitHubPullRequest(u: URL, segs: string[], raw: string): GitHubPullRequest {
  const i = segs.indexOf("pull");
  if (i !== 2 || !DIGITS.test(segs[3] ?? "")) throw new Error(`not a GitHub pull request URL: ${raw}`);
  return { provider: "github", host: u.hostname, owner: segs[0], repo: segs[1], id: Number(segs[3]), url: raw.trim(), api_base: null, project: null, collection_url: null };
}

function azdoPullRequest(u: URL, segs: string[], raw: string): AzdoPullRequest {
  const g = segs.indexOf("_git");
  const p = segs.indexOf("pullrequest");
  if (g < 1 || p !== g + 2 || !DIGITS.test(segs[p + 1] ?? "")) throw new Error(`not an Azure DevOps pull request URL (expected …/<project>/_git/<repo>/pullrequest/<id>): ${raw}`);
  const project = segs[g - 1];
  const collectionSegs = segs.slice(0, g - 1);
  const collection_url = `${u.origin}${collectionSegs.length ? "/" + collectionSegs.map(encodeURIComponent).join("/") : ""}`;
  return { provider: "azdo", host: u.hostname, collection_url, project, repo: segs[g + 1], id: Number(segs[p + 1]), url: raw.trim(), api_base: `${collection_url}/${encodeURIComponent(project)}/_apis/git/repositories/${encodeURIComponent(segs[g + 1])}/pullRequests/${segs[p + 1]}` };
}

export function parsePullRequestUrl(raw: string): PullRequest {
  const u = urlOf(raw);
  const segs = u.pathname.split("/").filter(Boolean).map((s) => decodeURIComponent(s));
  return /(^|\.)github\.com$/i.test(u.hostname) ? gitHubPullRequest(u, segs, raw) : azdoPullRequest(u, segs, raw);
}

function localSettings(root: string): LocalSettings {
  try {
    return readJson<LocalSettings>(hostPath(root, "settings.local.json"));
  } catch {
    return null;
  }
}

export function patOf(env: NodeJS.ProcessEnv, root: string): string | null {
  for (const name of PAT_VARS) if (env[name]) return env[name] as string;
  const local = localSettings(root);
  for (const name of PAT_VARS) if (local?.env?.[name]) return String(local.env[name]);
  return null;
}
