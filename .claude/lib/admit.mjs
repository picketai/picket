// Lane admission: a pure function of the request text plus cheap repository probes.
// Deterministic by construction; the same request against the same tree always lands in the same
// lane. Admission is declared here and re-checked by the lane skill against the observed touch set
// (`recheck`), so a fast-lane change that grows past the cap escalates instead of silently overrunning.
import { existsSync } from "node:fs";
import { join } from "node:path";
import { projectRoot } from "./work.mjs";
import { DEFAULT_SECURITY_PATHS, securityPaths as configuredSecurityPaths } from "./config.mjs";

export { DEFAULT_SECURITY_PATHS };

export const CAPS = Object.freeze({
  fast_max_files: 3,
  order_max_phases: 3,
  order_max_decisions: 5,
});

const RESEARCH = /\b(how (does|is|are)|explain|understand|map (the|a)|report|no code changes|write (a|the) report|where (is|does)|why (does|is))\b/i;
const SECURITY = /\b(auth(entication|orization|enticate)?|api[- ]?key|password|credential|tokens?|secret|crypto|encrypt|permission|security path)\b/i;
const MIGRATION = /\b(migrat(e|ion)|schema|alter table|data file|rewrite the file|backfill)\b/i;
const IRREVERSIBLE = /\b(irreversible|delete (all|the) (data|records)|drop (table|column)|force[- ]push|purge)\b/i;
const NEW_DEPENDENCY = /\b(add|install|introduce) (a |the |an )?(new )?(dependency|package|library|framework)\b|\bnpm install\b|\bnuget\b/i;
const CROSS_CONTEXT = /\b(other (service|repo|repository|context)|second repo|both repos|contract change|breaking change|public api)\b/i;
const NEW_SURFACE = /\b(add(ed)? (an? )?(new )?(endpoint|route|module|command|worker|handler|middleware|layer|feature)|new (endpoint|route|module|feature|capability))\b/i;
const DESIGN_QUESTION = /\b(design|architecture|which approach|trade-?off|options?|strategy|should we)\b/i;
const SMALL_CHANGE = /\b(fix|rename|typo|guard|null check|log (the |an? )?(error|line|message|warning)|default value|config value|change the default|off[- ]by[- ]one|bump|tweak)\b/i;
const DECLARED_RESEARCH = /\b(an?|this) research (work )?item\b/i;
const NOT_A_CREDENTIAL = /\b(verdict tokens?|tokens? (budget|count|usage|cost|limit|window)s?|(input|output|cache|cached|prompt|context) tokens?)\b/gi;
const CREDENTIAL_CONTEXT = /\b(refresh|access|bearer|session|api|auth|jwt|oauth|log(s|ged|ging)? ?(in|out)|sign(s|ed|ing)?[- ]?(in|out))\b/i;

/** Backticked repo-relative paths mentioned in the text that exist on disk. */
export function mentionedPaths(text, root) {
  const found = new Set();
  for (const m of text.matchAll(/`([A-Za-z0-9_./-]+\.[A-Za-z0-9]+)`|\b((?:src|test|tests|data|scripts|lib|app)\/[A-Za-z0-9_./-]+)\b/g)) {
    const p = (m[1] ?? m[2]).replace(/:\d+(:\d+)?$/, "");
    if (existsSync(join(root, p))) found.add(p);
  }
  return [...found].sort();
}

function touchesSecurity(paths, text, securityPaths) {
  return paths.some((p) => securityPaths.some((s) => p.startsWith(s))) || securityPaths.some((s) => text.includes(s)) || SECURITY.test(withoutNonCredentialTokens(text));
}

function withoutNonCredentialTokens(text) {
  if (CREDENTIAL_CONTEXT.test(text)) return text;
  return text.replace(NOT_A_CREDENTIAL, " ");
}

/** The project's security path prefixes (config.mjs); kept here because route.mjs imports it from admit. */
export function securityPaths(root = projectRoot()) {
  return configuredSecurityPaths(root);
}

/**
 * @param {string} text  the request
 * @param {object} [o]
 * @param {string} [o.root]
 * @param {string[]} [o.touched]  observed touch set for a recheck (paths written so far)
 * @returns {{lane: string, reasons: string[], signals: object}}
 */
export function admit(text, o = {}) {
  const root = o.root ?? projectRoot();
  const securityPaths = configuredSecurityPaths(root);
  const forced = text.match(/\blane:\s*(fast|order|design|research)\b/i)?.[1]?.toLowerCase();
  const paths = mentionedPaths(text, root);
  const touched = o.touched ?? [];
  const reasons = [];
  const declaredResearch = DECLARED_RESEARCH.test(text);
  const signals = {
    forced: forced ?? null,
    mentioned_paths: paths,
    touched: touched.length,
    declared_research: declaredResearch,
    research: (declaredResearch || (RESEARCH.test(text) && !SMALL_CHANGE.test(text))) && !NEW_SURFACE.test(text),
    security: touchesSecurity([...paths, ...touched], text, securityPaths),
    migration: MIGRATION.test(text),
    irreversible: IRREVERSIBLE.test(text),
    new_dependency: NEW_DEPENDENCY.test(text),
    cross_context: CROSS_CONTEXT.test(text),
    new_surface: NEW_SURFACE.test(text),
    design_question: DESIGN_QUESTION.test(text),
    small_change: SMALL_CHANGE.test(text),
  };

  if (forced) return { lane: forced, reasons: [`lane forced by request (lane: ${forced})`], signals };

  if (signals.research && !signals.new_surface) {
    reasons.push("the request asks a question and changes no code");
    return { lane: "research", reasons, signals };
  }

  // Heavy-lane triggers first: any one of them decides.
  if (signals.security) reasons.push("touches a security path or an authentication concern");
  if (signals.migration) reasons.push("schema or data migration work");
  if (signals.irreversible) reasons.push("an irreversible step");
  if (signals.cross_context) reasons.push("crosses a repo or contract boundary");
  if (reasons.length) return { lane: "design", reasons, signals };

  // Fast lane: small, local, bounded.
  const fileCount = Math.max(paths.length, touched.length);
  const fastOk = !signals.new_surface && !signals.new_dependency && !signals.design_question && fileCount <= CAPS.fast_max_files && (signals.small_change || fileCount > 0);
  if (fastOk) {
    reasons.push(`small change: ${fileCount || "no"} file(s) named, no new surface, no new dependency, no design question`);
    return { lane: "fast", reasons, signals };
  }

  // Order lane: a bounded feature with local decisions.
  if (signals.new_dependency) reasons.push("adds a dependency, which is a recorded decision");
  if (signals.new_surface) reasons.push("adds a new surface (endpoint, module, or handler)");
  if (signals.design_question) reasons.push("carries a design question");
  if (fileCount > CAPS.fast_max_files) reasons.push(`touches ${fileCount} files, more than the fast cap of ${CAPS.fast_max_files}`);
  if (!reasons.length) reasons.push("not plainly small and not a heavy-lane trigger");
  return { lane: "order", reasons, signals };
}

/**
 * Re-admission against what actually happened: called by the lane skill when the touch set grows.
 * Returns the lane the work now belongs to; the caller escalates when it differs from the current one.
 */
export function recheck(currentLane, text, touched, o = {}) {
  const result = admit(text, { ...o, touched });
  const order = ["fast", "order", "design"];
  if (currentLane === "research") return { ...result, escalate: false };
  const escalate = order.indexOf(result.lane) > order.indexOf(currentLane);
  return { ...result, escalate, from: currentLane };
}
