// What a verdict means for the state machine. Called by the route.verdict hook on every agent stop
// and by the lane skills. Exact-match tokens only; near misses are recorded but change nothing.
import { phaseOf, readSnapshot, stateView } from "../../shared/work/snapshot.mjs";
import { phasePaths } from "../../shared/work/artifact.mjs";
import { securityPaths } from "../../shared/config.mjs";
import { isSessionId, readState, writeState } from "../../shared/work/state.mjs";
import { hasMarker, setMarker } from "../../shared/work/markers.mjs";
import { appendVerdict } from "../../shared/work/verdict-log.mjs";
import { projectRoot } from "../../shared/paths.mjs";
import { readNext } from "../../shared/work/next-view.mjs";
import { ownGate } from "../../shared/work/gate.mjs";
import { commitOwned, listedPathMatcher } from "../../shared/git.mjs";
import { recordAccept } from "../../shared/ledger.mjs";
import { blockFiles, readBlock, parseBlock, proposedCommit } from "../../shared/work/block.mjs";
import { bareAgentName } from "../../shared/agent-name.mjs";
import { VERDICTS } from "../../shared/verdicts.mjs";

/**
 * Approval turns the developer's staged work into a commit. The message is the one the developer
 * proposed in its block (`Commit: feat(http): …`), or a plain fallback. The work item's state rides
 * along, so the commit that added `phases/N.approved` IS the phase commit:
 * `git log -1 --format=%h -- work/<id>/phases/N.approved` names it, no marker needed.
 */
function commitPhase(id, phase, root, applied) {
  const planned = phaseOf(readSnapshot(root, id), Number(phase));
  const b = parseBlock(readBlock(root, id, phase) ?? "");
  const proposed = b.fields.commit && !/^[0-9a-f]{7,40}$/i.test(b.fields.commit) ? proposedCommit(b) : null;
  const title = planned?.title ?? `phase ${phase}`;
  const message = proposed ?? `${title}, phase ${phase} of ${id}`;
  const listed = listedPathMatcher(root, [`work/${id}/`, ...(planned ? phasePaths(planned) : [])]);
  const reported = listedPathMatcher(root, blockFiles(root, id, phase));
  let result;
  try {
    result = commitOwned(root, message, { add: [`work/${id}`], owns: (path) => listed(path) || reported(path), env: process.env });
  } catch (err) {
    applied.push(err.message);
    return;
  }
  const { sha, committed, left_staged, warnings } = result;
  applied.push(sha ? `committed ${sha}: ${message}` : "nothing staged to commit");
  const outside = committed.filter((path) => !listed(path));
  if (outside.length) applied.push(`committed outside phase ${phase}'s files: ${outside.join(", ")}`);
  if (left_staged.length) applied.push(`left staged, not phase ${phase}'s: ${left_staged.join(", ")}`);
  applied.push(...warnings);
  if (sha) recordAccept(root, id, sha, Number(phase));
}

function claimForSession(id, session, root) {
  if (!isSessionId(session)) return;
  const st = readState(root, id);
  if (String(st.session) === String(session)) return;
  st.session = session;
  writeState(root, st, new Date());
}

const CLASSED_VERDICT = "CHANGES REQUIRED";

function mistakeClasses({ verdict, classes }) {
  return verdict === CLASSED_VERDICT && Array.isArray(classes) && classes.length ? { classes } : {};
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
export function route(o) {
  o = { ...o, agent: bareAgentName(o.agent) };
  const root = o.root ?? projectRoot();
  const spec = VERDICTS[o.verdict];
  if (!spec) throw new Error(`unknown verdict "${o.verdict}"; exact tokens: ${Object.keys(VERDICTS).join(", ")}`);
  if (spec.agent !== o.agent && !(spec.agent === "user" && o.agent === "lead")) throw new Error(`"${o.verdict}" may only come from ${spec.agent}, not ${o.agent}`);

  const snap = readSnapshot(root, o.id);
  const s = stateView(snap);
  const phase = o.phase ?? s.current_phase ?? null;
  const applied = [];
  let commitAfter = null; // the phase whose staged work this approval commits, once the verdict row is on disk

  switch (spec.effect) {
    case "phase_done": {
      if (phase == null) throw new Error("PHASE DONE needs a phase");
      setMarker(root, o.id, phase, "done", new Date());
      applied.push(`phases/${phase}.done`);
      // A run grant ("run through 3") is the user's approval of every phase it covers, given in
      // advance: record it, so the lane does not stop again for a decision already taken. The grant
      // never crosses a security path or an irreversible step: those phases take their own gate,
      // decided here in code, not left to the developer's reading of the step file.
      const st = readState(root, o.id);
      if (st.run_through && phase <= st.run_through && !hasMarker(root, o.id, phase, "approved")) {
        const gate = ownGate(phaseOf(snap, Number(phase)), securityPaths(root));
        if (gate) {
          delete st.run_through;
          writeState(root, st, new Date());
          applied.push(`run grant stops here: phase ${phase} ${gate.reason}; it takes its own approval`);
        } else {
          setMarker(root, o.id, phase, "approved", new Date());
          applied.push(`phases/${phase}.approved (run grant through ${st.run_through})`);
          commitAfter = phase;
        }
      }
      break;
    }
    case "phase_approved": {
      if (phase == null) throw new Error("approved needs a phase");
      if (!hasMarker(root, o.id, phase, "done")) throw new Error(`phase ${phase} is not done; cannot approve`);
      setMarker(root, o.id, phase, "approved", new Date());
      applied.push(`phases/${phase}.approved`);
      commitAfter = phase;
      if (o.through && o.through > phase) {
        const st = readState(root, o.id);
        st.run_through = o.through;
        writeState(root, st, new Date());
        applied.push(`run_through=${o.through}`);
      }
      break;
    }
    case "phase_reviewed":
      if (o.scope === "cumulative") {
        for (const p of s.phases) if (!p.reviewed) setMarker(root, o.id, p.n, "reviewed", new Date());
        applied.push("all phases reviewed");
      } else if (phase != null) {
        setMarker(root, o.id, phase, "reviewed", new Date());
        applied.push(`phases/${phase}.reviewed`);
      }
      break;
    case "rejection": {
      const st = readState(root, o.id);
      delete st.run_through;
      writeState(root, st, new Date());
      applied.push("run grant cleared");
      break;
    }
    case "drift":
    case "stall": {
      const st = readState(root, o.id);
      st.status = "blocked";
      st.blocked_reason = o.reason ?? `${o.verdict} on phase ${phase ?? "?"}`;
      writeState(root, st, new Date());
      applied.push(`status=blocked (${st.blocked_reason})`);
      break;
    }
    case "crosscheck_ok":
    case "artifact":
    case "amended":
      break;
  }

  claimForSession(o.id, o.session, root);
  appendVerdict(root, o.id, { agent: o.agent, verdict: o.verdict, phase, scope: o.scope ?? null, through: o.through ?? null, ...mistakeClasses(o) }, new Date());
  if (commitAfter != null) commitPhase(o.id, commitAfter, root, applied);
  return { id: o.id, verdict: o.verdict, phase, applied, next: readNext(root, o.id) };
}
