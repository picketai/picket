import { join } from "node:path";
import { GitFailed } from "../../util/git.mts";
import { locate } from "../checkouts.mts";
import { commitOwned, listedPathMatcher, type CommitResult } from "../git.mts";
import { recordAccept } from "../ledger.mts";
import { phasePaths } from "../work/artifact.mts";
import { blockField, blockFiles, parseBlock, proposedCommit, readBlock } from "../work/block.mts";
import { workRel } from "../work/files.mts";
import { phaseOf, type WorkSnapshot } from "../work/snapshot.mts";

export type CheckoutCommits = { lines: string[]; refused: string | null };

const COMMIT_SHA = /^[0-9a-f]{7,40}$/i;

export function nestedCheckoutPaths(root: string, snap: WorkSnapshot, phase: number): Map<string, string[]> {
  const planned = phaseOf(snap, phase);
  const paths = [...(planned ? phasePaths(planned) : []), ...blockFiles(root, snap.state.id, phase)];
  const byDir = new Map<string, string[]>();
  for (const { dir, rel } of paths.map((path) => locate(snap.layout, path))) {
    if (dir !== "") byDir.set(dir, [...(byDir.get(dir) ?? []), rel]);
  }
  return new Map([...byDir].sort(([a], [b]) => a.localeCompare(b)));
}

function checkoutLines(dir: string, { sha, left_staged, warnings }: CommitResult, message: string, phase: number): string[] {
  const lines = [sha ? `committed ${dir} ${sha}: ${message.split("\n")[0]}` : `nothing staged to commit in ${dir}`];
  if (left_staged.length) lines.push(`left staged in ${dir}, not phase ${phase}'s: ${left_staged.join(", ")}`);
  return [...lines, ...warnings];
}

function refusalOf(dir: string, err: unknown): string {
  const reason = err instanceof GitFailed && err.lastLine ? err.lastLine : (err as Error).message;
  return `${dir} refused the commit: ${reason}`;
}

export function commitCheckouts(root: string, snap: WorkSnapshot, phase: number, env: NodeJS.ProcessEnv): CheckoutCommits {
  const message = commitMessage(root, snap, phase);
  const lines: string[] = [];
  for (const [dir, rels] of nestedCheckoutPaths(root, snap, phase)) {
    const checkout = join(root, dir);
    try {
      lines.push(...checkoutLines(dir, commitOwned(checkout, message, { owns: listedPathMatcher(checkout, rels), env }), message, phase));
    } catch (err) {
      return { lines, refused: refusalOf(dir, err) };
    }
  }
  return { lines, refused: null };
}

function commitMessage(root: string, snap: WorkSnapshot, phase: number): string {
  const id = snap.state.id;
  const block = parseBlock(readBlock(root, id, phase) ?? "");
  const commit = blockField(block, "Commit");
  const proposed = commit && !COMMIT_SHA.test(commit) ? proposedCommit(block) : null;
  return proposed ?? `${phaseOf(snap, phase)?.title ?? `phase ${phase}`}, phase ${phase} of ${id}`;
}

function resultLines({ sha, committed, left_staged, warnings }: CommitResult, message: string, phase: number, listed: (path: string) => boolean): string[] {
  const lines = [sha ? `committed ${sha}: ${message.split("\n")[0]}` : "nothing staged to commit"];
  const outside = committed.filter((path) => !listed(path));
  if (outside.length) lines.push(`committed outside phase ${phase}'s files: ${outside.join(", ")}`);
  if (left_staged.length) lines.push(`left staged, not phase ${phase}'s: ${left_staged.join(", ")}`);
  return [...lines, ...warnings];
}

export function commitPhase(root: string, snap: WorkSnapshot, phase: number, env: NodeJS.ProcessEnv, now: Date): string[] {
  const id = snap.state.id;
  const planned = phaseOf(snap, phase);
  const message = commitMessage(root, snap, phase);
  const listed = listedPathMatcher(root, [workRel(id), ...(planned ? phasePaths(planned) : [])]);
  const reported = listedPathMatcher(root, blockFiles(root, id, phase));
  let result: CommitResult;
  try {
    result = commitOwned(root, message, { add: [workRel(id)], owns: (path) => listed(path) || reported(path), env });
  } catch (err) {
    return [(err as Error).message];
  }
  const lines = resultLines(result, message, phase, listed);
  if (result.sha) recordAccept(root, id, result.sha, phase, now);
  return lines;
}
