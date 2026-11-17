import { existsSync } from "node:fs";
import { join } from "node:path";
import { readText } from "../../util/io.mts";
import { loadConfig } from "../config.mjs";
import { COMPOSE_FILE, ENV_DIR } from "../env/standard.mts";
import { readLayout, type ItemLayout } from "../repos.mts";
import { ambiguousRefs } from "../sources/intake.mts";
import type { AmbiguousRef } from "../sources/resolve.mts";
import type { PhaseView as WirePhaseView, StateView as WireStateView } from "../views.mts";
import { parseArtifact, type ArtifactPhase } from "./artifact.mts";
import { readBrief, type Brief } from "./brief.mts";
import { workDir, workFile, type WorkFile, type WorkId } from "./files.mts";
import { hasMarker, type PhaseMark } from "./markers.mts";
import { readReplies, type ReplyRow } from "./replies.mts";
import { ARTIFACT_BY_LANE, readState, type WorkState } from "./state.mts";
import { readVerdicts, type VerdictRow } from "./verdict-log.mts";

export type PhaseStatus = ArtifactPhase & { done: boolean; approved: boolean; reviewed: boolean; idle: boolean };
export type TestingSetting = "all" | "design" | "off";
export type TestingFacts = { setting: TestingSetting; environment: boolean; reasons: string[] };
export type SnapshotArtifact = { path: string; expected: WorkFile; body: string };

export type WorkSnapshot = {
  state: WorkState;
  artifact: SnapshotArtifact | null;
  brief: Brief | null;
  phases: PhaseStatus[];
  verdicts: VerdictRow[];
  replies: ReplyRow[];
  ambiguousRefs: AmbiguousRef[];
  layout: ItemLayout;
  warnings: string[];
  testing?: TestingFacts;
};

export type PhaseView = WirePhaseView;

export type StateView = WireStateView &
  WorkState & {
    artifact_expected: WorkFile | null;
    verdicts: VerdictRow[];
    last_verdict: VerdictRow | null;
  };

function readArtifactFile(root: string, id: WorkId, expected: WorkFile | null): { artifact: SnapshotArtifact; phases: ArtifactPhase[] } | null {
  if (!expected) return null;
  const path = workFile(root, id, expected);
  const text = readText(path);
  if (text === null) return null;
  const { body, phases } = parseArtifact(text);
  return { artifact: { path, expected, body }, phases };
}

function withMarkers(root: string, id: WorkId, phase: ArtifactPhase): PhaseStatus {
  const marked = (mark: PhaseMark) => hasMarker(root, id, phase.n, mark);
  return { ...phase, done: marked("done"), approved: marked("approved"), reviewed: marked("reviewed"), idle: marked("idle") };
}

function skippedWarning(file: WorkFile, skipped: number): string[] {
  if (!skipped) return [];
  return [`${file}: ${skipped} unreadable ${skipped === 1 ? "line" : "lines"} skipped`];
}

const REPORT_FILE = "test.md";
const REASONS_HEADING = "## Reasons";
const LIST_ITEM = /^- (.+)$/;

export function reportReasons(text: string | null): string[] {
  const lines = (text ?? "").replace(/\r\n/g, "\n").split("\n");
  const start = lines.indexOf(REASONS_HEADING);
  if (start < 0) return [];
  const reasons: string[] = [];
  for (const line of lines.slice(start + 1)) {
    const item = line.match(LIST_ITEM)?.[1];
    if (item !== undefined) reasons.push(item);
    else if (line.trim() !== "") break;
  }
  return reasons;
}

function testingFacts(root: string, id: WorkId): TestingFacts {
  return {
    setting: loadConfig(root).testing,
    environment: existsSync(join(root, ENV_DIR, COMPOSE_FILE)),
    reasons: reportReasons(readText(join(workDir(root, id), REPORT_FILE))),
  };
}

export function readSnapshot(root: string, id: WorkId): WorkSnapshot {
  const state = readState(root, id);
  const read = readArtifactFile(root, id, ARTIFACT_BY_LANE[state.lane]);
  const verdicts = readVerdicts(root, id);
  const replies = readReplies(root, id);
  return {
    state,
    artifact: read?.artifact ?? null,
    brief: readBrief(readText(workFile(root, id, "request.md"))),
    phases: (read?.phases ?? []).map((phase) => withMarkers(root, id, phase)),
    verdicts: verdicts.rows,
    replies: replies.rows,
    ambiguousRefs: ambiguousRefs(root, id),
    layout: readLayout(root, id),
    warnings: [...skippedWarning("verdicts.jsonl", verdicts.skipped), ...skippedWarning("replies.jsonl", replies.skipped)],
    testing: testingFacts(root, id),
  };
}

export function phaseOf(snap: WorkSnapshot, n: number): PhaseStatus | undefined {
  return snap.phases.find((phase) => phase.n === n);
}

export function currentPhase(snap: WorkSnapshot): PhaseStatus | null {
  return snap.phases.find((phase) => !phase.approved) ?? null;
}

function phaseView({ n, title, done, approved, reviewed }: PhaseStatus): PhaseView {
  return { n, title, done, approved, reviewed };
}

export function stateView(snap: WorkSnapshot): StateView {
  const current = currentPhase(snap);
  const view: StateView = {
    ...snap.state,
    artifact: snap.artifact?.path ?? null,
    artifact_expected: ARTIFACT_BY_LANE[snap.state.lane],
    phases: snap.phases.map(phaseView),
    phase_count: snap.phases.length,
    phases_approved: snap.phases.filter((phase) => phase.approved).length,
    current_phase: current ? current.n : null,
    verdicts: snap.verdicts,
    last_verdict: snap.verdicts.at(-1) ?? null,
  };
  return snap.warnings.length ? { ...view, warnings: snap.warnings } : view;
}
