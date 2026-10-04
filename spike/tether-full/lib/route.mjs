// What a verdict means for the state machine. Called by the route.verdict hook on every agent stop
// and by the lane skills. Exact-match tokens only; near misses are recorded but change nothing.
import { appendVerdict, deriveState, hasMarker, projectRoot, readArtifact, readState, setMarker, writeState } from "./work.mjs";
import { next } from "./next.mjs";
import { securityPaths } from "./admit.mjs";
import { commitStaged } from "./git.mjs";
import { readBlock, parseBlock } from "./packet.mjs";

/**
 * Approval turns the developer's staged work into a commit. The message is the one the developer
 * proposed in its block (`Commit: feat(http): …`), or a plain fallback. The work item's state rides
 * along, so the commit that added `phases/N.approved` IS the phase commit:
 * `git log -1 --format=%h -- work/<id>/phases/N.approved` names it, no marker needed.
 */
function commitPhase(id, phase, root, applied) {
  const s = deriveState(id, root);
  const b = parseBlock(readBlock(id, phase, root) ?? "");
  const proposed = b.fields.commit && !/^[0-9a-f]{7,40}$/i.test(b.fields.commit) ? b.fields.commit.replace(/\s*\(staged.*\)$/i, "") : null;
  const title = s.phases.find((p) => p.n === Number(phase))?.title ?? `phase ${phase}`;
  const message = proposed ?? `${title}, phase ${phase} of ${id}`;
  try {
    const sha = commitStaged(root, message, [`work/${id}`]);
    applied.push(sha ? `committed ${sha}: ${message}` : "nothing staged to commit");
  } catch (err) {
    applied.push(err.message);
  }
}

export const VERDICTS = Object.freeze({
  // reviewer
  APPROVED: { agent: "reviewer", effect: "phase_reviewed" },
  "CHANGES REQUIRED": { agent: "reviewer", effect: "rejection" },
  ALIGNED: { agent: "reviewer", effect: "crosscheck_ok" },
  "DRIFT DETECTED": { agent: "reviewer", effect: "drift" },
  // developer
  "PHASE DONE": { agent: "developer", effect: "phase_done" },
  "PHASE STALLED": { agent: "developer", effect: "stall" },
  // architect
  "ARTIFACT WRITTEN": { agent: "architect", effect: "artifact" },
  "AMENDED": { agent: "architect", effect: "amended" },
  // analyst
  "REPORT WRITTEN": { agent: "analyst", effect: "artifact" },
  // user
  approved: { agent: "user", effect: "phase_approved" },
  rejected: { agent: "user", effect: "rejection" },
});

const TOKEN_RE = new RegExp(`^\\s*(${Object.keys(VERDICTS).map((k) => k.replace(/ /g, "\\s+")).join("|")})\\b`, "m");

/** Finds the first verdict token that starts a line in a block of text. */
export function findVerdict(text) {
  const m = String(text ?? "").match(TOKEN_RE);
  if (!m) return null;
  return m[1].replace(/\s+/g, " ").trim();
}

/**
 * Applies a verdict to a work item and returns the next action.
 * @param {object} o
 * @param {string} o.id
 * @param {string} o.verdict     exact token from VERDICTS
 * @param {string} o.agent       who emitted it (checked against the token's owner)
 * @param {number} [o.phase]
 * @param {string} [o.scope]     "cumulative" | "checkpoint" | "crosscheck"
 * @param {number} [o.through]   for `approved`: last phase of a granted run
 */
/** "a security path" | "an irreversible step" | null, from the phase's frontmatter files and body. */
export function phaseNeedsOwnGate(id, phase, root) {
  const art = readArtifact(id, root);
  const entry = (Array.isArray(art.front?.phases) ? art.front.phases : []).find((p) => Number(p.n) === Number(phase));
  const files = Array.isArray(entry?.files) ? entry.files.map(String) : [];
  const prefixes = securityPaths(root).map((s) => s.replace(/\*\*$/, "").replace(/\/?$/, "/"));
  if (files.some((f) => prefixes.some((s) => f.replace(/\\/g, "/").startsWith(s)))) return "a security path";
  const section = art.body.match(new RegExp(`^## Phase ${Number(phase)}\\b[^\\n]*\\n([\\s\\S]*?)(?=^## |(?![\\s\\S]))`, "m"))?.[1] ?? "";
  if (/\[IRREVERSIBLE\]/.test(section)) return "an irreversible step";
  return null;
}

export function route(o) {
  const root = o.root ?? projectRoot();
  const spec = VERDICTS[o.verdict];
  if (!spec) throw new Error(`unknown verdict "${o.verdict}"; exact tokens: ${Object.keys(VERDICTS).join(", ")}`);
  if (spec.agent !== o.agent && !(spec.agent === "user" && o.agent === "lead")) throw new Error(`"${o.verdict}" may only come from ${spec.agent}, not ${o.agent}`);

  const s = deriveState(o.id, root);
  const phase = o.phase ?? s.current_phase ?? null;
  const applied = [];
  let commitAfter = null; // the phase whose staged work this approval commits, once the verdict row is on disk

  switch (spec.effect) {
    case "phase_done": {
      if (phase == null) throw new Error("PHASE DONE needs a phase");
      setMarker(o.id, phase, "done", root);
      applied.push(`phases/${phase}.done`);
      // A run grant ("run through 3") is the user's approval of every phase it covers, given in
      // advance: record it, so the lane does not stop again for a decision already taken. The grant
      // never crosses a security path or an irreversible step: those phases take their own gate,
      // decided here in code, not left to the developer's reading of the step file.
      const st = readState(o.id, root);
      if (st.run_through && phase <= st.run_through && !hasMarker(o.id, phase, "approved", root)) {
        const gate = phaseNeedsOwnGate(o.id, phase, root);
        if (gate) {
          delete st.run_through;
          writeState(st, root);
          applied.push(`run grant stops here: phase ${phase} touches ${gate}; it takes its own approval`);
        } else {
          setMarker(o.id, phase, "approved", root);
          applied.push(`phases/${phase}.approved (run grant through ${st.run_through})`);
          commitAfter = phase;
        }
      }
      break;
    }
    case "phase_approved": {
      if (phase == null) throw new Error("approved needs a phase");
      if (!hasMarker(o.id, phase, "done", root)) throw new Error(`phase ${phase} is not done; cannot approve`);
      setMarker(o.id, phase, "approved", root);
      applied.push(`phases/${phase}.approved`);
      commitAfter = phase;
      if (o.through && o.through > phase) {
        const st = readState(o.id, root);
        st.run_through = o.through;
        writeState(st, root);
        applied.push(`run_through=${o.through}`);
      }
      break;
    }
    case "phase_reviewed":
      if (o.scope === "cumulative") {
        for (const p of s.phases) if (!p.reviewed) setMarker(o.id, p.n, "reviewed", root);
        applied.push("all phases reviewed");
      } else if (phase != null) {
        setMarker(o.id, phase, "reviewed", root);
        applied.push(`phases/${phase}.reviewed`);
      }
      break;
    case "rejection": {
      const st = readState(o.id, root);
      delete st.run_through;
      writeState(st, root);
      applied.push("run grant cleared");
      break;
    }
    case "drift":
    case "stall": {
      const st = readState(o.id, root);
      st.status = "blocked";
      st.blocked_reason = o.reason ?? `${o.verdict} on phase ${phase ?? "?"}`;
      writeState(st, root);
      applied.push(`status=blocked (${st.blocked_reason})`);
      break;
    }
    case "crosscheck_ok":
    case "artifact":
    case "amended":
      break;
  }

  appendVerdict(o.id, { agent: o.agent, verdict: o.verdict, phase, scope: o.scope ?? null, through: o.through ?? null }, root);
  if (commitAfter != null) commitPhase(o.id, commitAfter, root, applied);
  return { id: o.id, verdict: o.verdict, phase, applied, next: next(o.id, root) };
}
