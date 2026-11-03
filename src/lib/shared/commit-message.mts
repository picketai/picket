import { parseBlock, proposedCommit } from "./work/block.mts";

export const COMMIT_TYPES =["feat", "fix", "refactor", "perf", "test", "docs", "build", "ci", "chore", "style"] as const;

export const SUBJECT_LIMIT = 72;

export type CheckedCommitMessage = { message: string } | { problem: string };

const STAGED_TAIL = /\s*\(staged.*\)$/i;
const WRAPPING_PAIR = /^([`"'])(.*)\1$/s;
const TRAILING_PERIOD = /\.$/;
const CONVENTIONAL_SUBJECT = new RegExp(`^(?:${COMMIT_TYPES.join("|")})(?:\\([^\\s()]+\\))?!?: \\S`);

export const COMMIT_SHAPE = `<type>(<scope>): <subject> of at most ${SUBJECT_LIMIT} characters, with <type> one of ${COMMIT_TYPES.join(", ")}`;

function unwrapped(subject: string): string {
  return subject.match(WRAPPING_PAIR)?.[2].trim() ?? subject;
}

function normalisedSubject(line: string): string {
  return unwrapped(line.trim().replace(STAGED_TAIL, "").trim()).replace(TRAILING_PERIOD, "");
}

function subjectProblem(subject: string): string | null {
  if (!CONVENTIONAL_SUBJECT.test(subject)) return `the commit subject "${subject}" is not ${COMMIT_SHAPE}`;
  const length = [...subject].length;
  if (length > SUBJECT_LIMIT) return `the commit subject is ${length} characters; write ${COMMIT_SHAPE}`;
  return null;
}

export function checkCommitMessage(raw: string): CheckedCommitMessage {
  const text = raw.replace(/\r\n/g, "\n");
  const end = text.indexOf("\n");
  const subject = normalisedSubject(end === -1 ? text : text.slice(0, end));
  const problem = subjectProblem(subject);
  return problem ? { problem } : { message: end === -1 ? subject : subject + text.slice(end) };
}

export function blockCommitProblem(block: string): string | null {
  const proposed = proposedCommit(parseBlock(block));
  if (proposed === null) return `the block has no "Commit:" line; write ${COMMIT_SHAPE}`;
  const checked = checkCommitMessage(proposed);
  return "problem" in checked ? checked.problem : null;
}
