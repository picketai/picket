import type { Lane } from "../../shared/work/state.mts";
import type { Signals } from "./signals.mts";

export const NO_LANE = "none";
const DIAGNOSIS_SKILL = "debugging";

export type LaneCaps = { fast: { max_files: number } };
export type Admission = { lane: Lane | typeof NO_LANE; skill?: typeof DIAGNOSIS_SKILL; reasons: string[]; signals: Signals };

function forcedResult(forced: Lane, signals: Signals): Admission {
  const reasons = [`lane forced by request (lane: ${forced})`];
  const hits = signals.security_path_hits;
  if ((forced === "fast" || forced === "order") && hits.length) {
    reasons.push(`a security path wins over the forced lane: ${hits.join(", ")}`);
    return { lane: "design", reasons, signals };
  }
  return { lane: forced, reasons, signals };
}

function heavyReasons(signals: Signals): string[] {
  const reasons: string[] = [];
  if (signals.security) reasons.push("touches a security path or an authentication concern");
  if (signals.migration) reasons.push("schema or data migration work");
  if (signals.irreversible) reasons.push("an irreversible step");
  if (signals.cross_context) reasons.push("crosses a repo or contract boundary");
  return reasons;
}

function orderReasons(signals: Signals, fileCount: number, maxFastFiles: number): string[] {
  const reasons: string[] = [];
  if (signals.new_dependency) reasons.push("adds a dependency, which is a recorded decision");
  if (signals.new_surface) reasons.push("adds a new surface (endpoint, module, or handler)");
  if (signals.design_question) reasons.push("carries a design question");
  if (fileCount > maxFastFiles) reasons.push(`touches ${fileCount} files, more than the fast cap of ${maxFastFiles}`);
  if (!reasons.length) reasons.push("no small-change word and no file named; order is the default");
  return reasons;
}

export function laneOf(signals: Signals, caps: LaneCaps): Admission {
  if (signals.forced) return forcedResult(signals.forced, signals);

  if (signals.diagnosis && !signals.security) {
    return { lane: NO_LANE, skill: DIAGNOSIS_SKILL, reasons: [`asks for a diagnosis, not a change: run picket:${DIAGNOSIS_SKILL}`], signals };
  }

  if (signals.research && !signals.new_surface && !signals.diagnosis) {
    return { lane: "research", reasons: ["the request asks a question and changes no code"], signals };
  }

  const heavy = heavyReasons(signals);
  if (heavy.length) return { lane: "design", reasons: heavy, signals };

  const maxFastFiles = caps.fast.max_files;
  const fileCount = Math.max(signals.mentioned_paths.length, signals.touched);
  const fastOk = !signals.new_surface && !signals.new_dependency && !signals.design_question && fileCount <= maxFastFiles && (signals.small_change || fileCount > 0);
  if (fastOk) {
    return { lane: "fast", reasons: [`small change: ${fileCount || "no"} file(s) named, no new surface, no new dependency, no design question`], signals };
  }

  return { lane: "order", reasons: orderReasons(signals, fileCount, maxFastFiles), signals };
}
