export const NEXT_ACTIONS = ["resolve_sources", "write_artifact", "implement_phase", "approve_phase", "review_cumulative", "review_checkpoint", "resolve_block", "resolve_rejections", "close", "none", "fix_findings", "amend", "review_crosscheck", "create_worktrees"] as const;

export type NextAction = (typeof NEXT_ACTIONS)[number];

export type Voice = "user" | "observer";

export type ActionStep = { actor: string | null; phase: number | null; lane: string; detail: string };

export const ACTION_TEXT: Readonly<Record<NextAction, (step: ActionStep, voice: Voice) => string>> = {
  resolve_sources: (_step, voice) => (voice === "user" ? "you pick source versions" : "waits for source picks"),
  write_artifact: (step) => `${step.actor} writes ${step.lane}.md`,
  implement_phase: (step) => `developer implements phase ${step.phase}`,
  approve_phase: (step, voice) => (voice === "user" ? `you approve phase ${step.phase}` : `waits for approval of phase ${step.phase}`),
  review_cumulative: () => "reviewer reviews all phases",
  review_checkpoint: (step) => `reviewer reviews phase ${step.phase}`,
  resolve_block: (step) => `blocked: ${step.detail}`,
  resolve_rejections: (_step, voice) => (voice === "user" ? "you decide after repeated rejections" : "waits for a decision after repeated rejections"),
  close: () => "lead closes the item",
  none: (step) => step.detail,
  fix_findings: () => "developer fixes the cumulative review findings",
  amend: (step) => `architect amends ${step.lane}.md`,
  review_crosscheck: () => "reviewer re-checks the amended decisions",
  create_worktrees: (_step, voice) => (voice === "user" ? "you name the worktree branch" : "waits for a worktree branch name"),
};

const ACTIONS: readonly string[] = NEXT_ACTIONS;

export function isNextAction(value: string): value is NextAction {
  return ACTIONS.includes(value);
}
