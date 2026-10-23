import { join } from "node:path";
import { frontmatter } from "../../util/yaml-lite.mjs";
import { readText } from "../../util/io.mjs";
import { projectRoot } from "../paths.mjs";
import { workDir } from "./files.mjs";
import { hasMarker } from "./markers.mjs";
import { ARTIFACT_BY_LANE, readState } from "./state.mjs";
import { readVerdicts } from "./verdict-log.mjs";

/** The lane's artifact, parsed: frontmatter, body, and the `## Phase N` headings in order. */
export function readArtifact(id, root = projectRoot()) {
  const state = readState(root, id);
  const name = ARTIFACT_BY_LANE[state.lane];
  if (!name) return { exists: false, path: null, front: {}, body: "", phases: [] };
  const path = join(workDir(root, id), name);
  const text = readText(path);
  if (text === null) return { exists: false, path, front: {}, body: "", phases: [] };
  const { front, body } = frontmatter(text);
  const phases = [];
  for (const m of body.matchAll(/^## Phase (\d+)(?::|\s+-|\s+—)?\s*(.*)$/gm)) {
    phases.push({ n: Number(m[1]), title: m[2].trim() });
  }
  return { exists: true, path, front, body, phases };
}

/** Everything a caller needs to know, derived from disk in one pass. */
export function deriveState(id, root = projectRoot()) {
  const state = readState(root, id);
  const artifact = readArtifact(id, root);
  const phases = artifact.phases.map((p) => ({
    ...p,
    done: hasMarker(root, id, p.n, "done"),
    approved: hasMarker(root, id, p.n, "approved"),
    reviewed: hasMarker(root, id, p.n, "reviewed"),
  }));
  const verdicts = readVerdicts(root, id).rows;
  const current = phases.find((p) => !p.approved) ?? null;
  return {
    ...state,
    artifact: artifact.exists ? artifact.path : null,
    artifact_expected: ARTIFACT_BY_LANE[state.lane],
    phases,
    phase_count: phases.length,
    phases_approved: phases.filter((p) => p.approved).length,
    current_phase: current ? current.n : null,
    verdicts,
    last_verdict: verdicts.at(-1) ?? null,
  };
}
