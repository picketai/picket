const HARNESSES_WITH_LANES = ["plugin", "rework"];

export function laneMatches(r) {
  const lane = r.signals?.lane;
  const want = r.lane_expected;
  if (!lane) return false;
  if (HARNESSES_WITH_LANES.includes(r.harness)) return lane === want;
  if (want === "fast") return lane === "direct" || lane === "expedited";
  if (want === "research") return lane === "direct" || lane === "delegated";
  return lane === "pipeline";
}
