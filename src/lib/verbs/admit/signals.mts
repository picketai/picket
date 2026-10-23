import { securityPathOf } from "../../shared/security-paths.mts";
import type { Lane } from "../../shared/work/state.mts";

export type Signals = {
  forced: Lane | null;
  mentioned_paths: string[];
  touched: number;
  declared_research: boolean;
  research: boolean;
  security: boolean;
  security_path_hits: string[];
  migration: boolean;
  irreversible: boolean;
  new_dependency: boolean;
  cross_context: boolean;
  new_surface: boolean;
  design_question: boolean;
  small_change: boolean;
  diagnosis: boolean;
};

const RESEARCH = /\b(how (does|is|are)|explain|understand|map (the|a)|report|no code changes|write (a|the) report|where (is|does)|why (does|is))\b/i;
const SECURITY = /\b(auth(entication|orization|enticate)?|api[- ]?key|password|credential|tokens?|secret|crypto|encrypt|permission|security path)\b/i;
const MIGRATION = /\b(migrat(e|ion)|schema|alter table|data file|rewrite the file|backfill)\b/i;
const IRREVERSIBLE = /\b(irreversible|delete (all|the) (data|records)|drop (table|column)|force[- ]push|purge)\b/i;
const NEW_DEPENDENCY = /\b(add|install|introduce) (a |the |an )?(new )?(dependency|package|library|framework)\b|\bnpm install\b|\bnuget\b/i;
const CROSS_CONTEXT = /\b(other (service|repo|repository|context)|second repo|both repos|contract change|breaking change|public api)\b/i;
const NEW_SURFACE = /\b(add(ed)? (an? )?(new )?(endpoint|route|module|command|worker|handler|middleware|layer|feature)|new (endpoint|route|module|feature|capability)|(add(s|ed|ing)?|creat(e|es|ed|ing)|introduc(e|es|ed|ing)) (an? |the )?(\S+ ){0,3}?(skill|agent|hook|verb|subcommand|rule|step file)s?|in(to)? (its|their|a) own (module|file|class|folder)s?)\b/i;
const DESIGN_QUESTION = /\b(design|architecture|which approach|trade-?off|options?|strategy|should we)\b/i;
const SMALL_CHANGE = /\b(fix|rename|typo|guard|null check|log (the |an? )?(error|line|message|warning)|default value|config value|change the default|off[- ]by[- ]one|bump|tweak|(remov(e|es|ing)|delet(e|es|ing))(\s+[\w'-]+){0,3}\s+(keys?|lines?|entry|entries|settings?|hooks?))\b/i;
const DECLARED_RESEARCH = /\b(an?|this) research (work )?item\b/i;
const DIAGNOSIS = /\b(debug(ging)?|diagnos(e|es|is|ing)|root[- ]cause|find (out )?why)\b|\bwhy (does|do|did|is|are)\b[^?!\n]*\b(fail\w*|crash\w*|throw\w*|errors?|flaky|hang\w*|regress\w*|wrong)/i;
const CHANGE_VERB = /(?:^|[.;:!?,]\s*|\b(?:and|then|to|please|also)\s+)(fix|add|change|log|rename|implement|remove|refactor|update|replace|delete|patch|make|correct|resolve|write|adjust|modify|edit)\b/i;
const NO_CODE_CHANGES = /\bno code changes?\b|\bproduct code untouched\b/i;
const NOT_A_CREDENTIAL = /\b(verdict tokens?|tokens? (budget|count|usage|cost|limit|window)s?|(input|output|cache|cached|prompt|context) tokens?)\b/gi;
const CREDENTIAL_CONTEXT = /\b(refresh|access|bearer|session|api|auth|jwt|oauth|log(s|ged|ging)? ?(in|out)|sign(s|ed|ing)?[- ]?(in|out))\b/i;
const FORCED_LANE = /\blane:\s*(fast|order|design|research)\b/i;
const QUOTED = /`[^`]*`|"[^"\n]*"|“[^”\n]*”|(?<!\w)'[^'\n]*'(?!\w)/g;
const PATH_MENTION = /`([A-Za-z0-9_./-]+\.[A-Za-z0-9]+)`|\b((?:src|test|tests|data|scripts|lib|app)\/[A-Za-z0-9_./-]+)\b|(?<![\w/.-])(\.[A-Za-z0-9_-]+\/[A-Za-z0-9_./-]*[A-Za-z0-9_-])/g;
const LINE_SUFFIX = /:\d+(:\d+)?$/;

export function forcedLane(text: string): Lane | undefined {
  return text.replace(QUOTED, " ").match(FORCED_LANE)?.[1]?.toLowerCase() as Lane | undefined;
}

export function mentionedPaths(text: string, exists: (path: string) => boolean): string[] {
  const found = new Set<string>();
  for (const m of text.matchAll(PATH_MENTION)) {
    const p = (m[1] ?? m[2] ?? m[3]).replace(LINE_SUFFIX, "");
    if (exists(p)) found.add(p);
  }
  return [...found].sort();
}

function normalisePath(p: string): string {
  return p.replace(/\\/g, "/").replace(/^(\.\/)+/, "");
}

function pathHitsOf(paths: string[], securityPaths: readonly string[]): string[] {
  const hits = paths.map(normalisePath).filter((p) => securityPathOf(p, securityPaths) !== null);
  return [...new Set(hits)].sort();
}

function withoutNonCredentialTokens(text: string): string {
  if (CREDENTIAL_CONTEXT.test(text)) return text;
  return text.replace(NOT_A_CREDENTIAL, " ");
}

function touchesSecurity(pathHits: string[], text: string, securityPaths: readonly string[]): boolean {
  return pathHits.length > 0 || securityPaths.some((s) => text.includes(s)) || SECURITY.test(withoutNonCredentialTokens(text));
}

function isDiagnosis(text: string, signals: Pick<Signals, "declared_research" | "small_change" | "new_surface">): boolean {
  if (signals.declared_research || signals.small_change || signals.new_surface) return false;
  if (NO_CODE_CHANGES.test(text) || CHANGE_VERB.test(text)) return false;
  return DIAGNOSIS.test(text.replace(QUOTED, " "));
}

export function signalsOf(text: string, mentioned: string[], touched: string[], securityPaths: readonly string[]): Signals {
  const declaredResearch = DECLARED_RESEARCH.test(text);
  const pathHits = pathHitsOf([...mentioned, ...touched], securityPaths);
  const signals = {
    forced: forcedLane(text) ?? null,
    mentioned_paths: mentioned,
    touched: touched.length,
    declared_research: declaredResearch,
    research: (declaredResearch || (RESEARCH.test(text) && !SMALL_CHANGE.test(text))) && !NEW_SURFACE.test(text),
    security: touchesSecurity(pathHits, text, securityPaths),
    security_path_hits: pathHits,
    migration: MIGRATION.test(text),
    irreversible: IRREVERSIBLE.test(text),
    new_dependency: NEW_DEPENDENCY.test(text),
    cross_context: CROSS_CONTEXT.test(text),
    new_surface: NEW_SURFACE.test(text),
    design_question: DESIGN_QUESTION.test(text),
    small_change: SMALL_CHANGE.test(text),
  };
  return { ...signals, diagnosis: isDiagnosis(text, signals) };
}
