export const VERDICTS = Object.freeze({
  APPROVED: { agent: "reviewer", effect: "phase_reviewed" },
  "CHANGES REQUIRED": { agent: "reviewer", effect: "rejection" },
  ALIGNED: { agent: "reviewer", effect: "crosscheck_ok" },
  "DRIFT DETECTED": { agent: "reviewer", effect: "drift" },
  "PHASE DONE": { agent: "developer", effect: "phase_done" },
  "PHASE STALLED": { agent: "developer", effect: "stall" },
  "ARTIFACT WRITTEN": { agent: "architect", effect: "artifact" },
  "AMENDED": { agent: "architect", effect: "amended" },
  "REPORT WRITTEN": { agent: "analyst", effect: "artifact" },
  approved: { agent: "user", effect: "phase_approved" },
  rejected: { agent: "user", effect: "rejection" },
});

const TOKEN_RE = new RegExp(`^\\s*(${Object.keys(VERDICTS).map((k) => k.replace(/ /g, "\\s+")).join("|")})\\b`, "m");

export function findVerdict(text) {
  const m = String(text ?? "").match(TOKEN_RE);
  if (!m) return null;
  return m[1].replace(/\s+/g, " ").trim();
}
