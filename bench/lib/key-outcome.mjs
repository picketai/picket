const KEYED_KINDS = new Set(["defect", "trap"]);

export function isGreen(r) {
  return !r.missing && r.failed === 0 && (r.suitesFailed ?? 0) === 0 && r.total > 0;
}

function failedToLoad(keyRun) {
  return keyRun === null || keyRun.missing === true || (keyRun.suitesFailed ?? 0) > 0;
}

export function keyOutcome(kind, keyRun) {
  if (!KEYED_KINDS.has(kind)) return { ok: true, label: "seeded" };
  if (failedToLoad(keyRun)) return { ok: false, label: "key failed to load" };
  if (kind === "defect") return { ok: keyRun.failed > 0, label: "defect live" };
  return { ok: isGreen(keyRun), label: "trap holds" };
}
