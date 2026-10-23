import { commitOwned, listedPathMatcher, type CommitResult } from "../../shared/git.mts";
import { recordAccept } from "../../shared/ledger.mjs";
import { phasePaths } from "../../shared/work/artifact.mts";
import { blockFiles, parseBlock, proposedCommit, readBlock } from "../../shared/work/block.mts";
import { workRel } from "../../shared/work/files.mts";
import { phaseOf, type WorkSnapshot } from "../../shared/work/snapshot.mts";

type RecordAccept = (root: string, id: string, commit: string, phase: number | null) => void;

const COMMIT_SHA = /^[0-9a-f]{7,40}$/i;
const recordAcceptTyped = recordAccept as unknown as RecordAccept;

function commitMessage(root: string, snap: WorkSnapshot, phase: number): string {
  const id = snap.state.id;
  const block = parseBlock(readBlock(root, id, phase) ?? "");
  const proposed = block.fields.commit && !COMMIT_SHA.test(block.fields.commit) ? proposedCommit(block) : null;
  return proposed ?? `${phaseOf(snap, phase)?.title ?? `phase ${phase}`}, phase ${phase} of ${id}`;
}

function resultLines({ sha, committed, left_staged, warnings }: CommitResult, message: string, phase: number, listed: (path: string) => boolean): string[] {
  const lines = [sha ? `committed ${sha}: ${message}` : "nothing staged to commit"];
  const outside = committed.filter((path) => !listed(path));
  if (outside.length) lines.push(`committed outside phase ${phase}'s files: ${outside.join(", ")}`);
  if (left_staged.length) lines.push(`left staged, not phase ${phase}'s: ${left_staged.join(", ")}`);
  return [...lines, ...warnings];
}

export function commitPhase(root: string, snap: WorkSnapshot, phase: number, env: NodeJS.ProcessEnv): string[] {
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
  if (result.sha) recordAcceptTyped(root, id, result.sha, phase);
  return lines;
}
