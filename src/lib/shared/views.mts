export type PhaseView = { n: number; title: string; done: boolean; approved: boolean; reviewed: boolean };

export type VerdictView = { ts: string; agent: string; verdict: string; phase: number | null; scope: string | null; through: number | null; classes?: string[] };

export type GateView = { kind: string; reason: string };

export type StateView = {
  id: string;
  lane: string;
  title: string;
  status: string;
  created: string;
  updated?: string;
  blocked_reason?: string;
  branch?: string;
  run_through?: number;
  source?: string;
  base?: string;
  session?: string;
  artifact: string | null;
  artifact_expected: string | null;
  phases: PhaseView[];
  phase_count: number;
  phases_approved: number;
  current_phase: number | null;
  verdicts: VerdictView[];
  last_verdict: VerdictView | null;
  warnings?: string[];
};

export type NextView = {
  id: string;
  lane: string;
  status: string;
  phase: number | null;
  options: string[];
  own_gate: GateView | null;
  action: string;
  actor: string | null;
  detail: string;
  warnings?: string[];
};

export type LatestView =
  | { id: null; action: "none"; actor: null; phase: null; detail: string; options: string[] }
  | (NextView & {
      title: string;
      phases_approved: number;
      phase_count: number;
      blocked_reason: string | null;
      since: string;
      by: string | null;
      session: string | null;
      other_session: boolean;
    });
