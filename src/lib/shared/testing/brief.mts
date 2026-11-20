import type { CatalogEntry } from "../catalog/entry.mts";
import { criterionText } from "../scenarios/keep.mts";
import type { SavedScenario } from "../scenarios/files.mts";
import { readChecks, type HttpCheck } from "../work/declared-checks.mts";
import type { WorkSnapshot } from "../work/snapshot.mts";
import { MAX_DEFECTS, MAX_QUESTIONS, roundCap, type CapReply, type CaseCap, type DeriveInput } from "./derive.mts";
import { latestCases, roundRows } from "./results.mts";

export type BriefTexts = { request: string | null; story: string | null };

const NONE = "none";

function httpChecks(snap: WorkSnapshot): HttpCheck[] {
  return snap.phases.flatMap((phase) => (readChecks(phase.entry?.drive, phase.n)?.checks ?? []).filter((check): check is HttpCheck => "path" in check));
}

function checkLine(check: HttpCheck): string {
  const service = check.service === undefined ? "" : ` on ${check.service}`;
  const contains = check.contains.length ? `, contains ${check.contains.map((text) => JSON.stringify(text)).join(", ")}` : "";
  return `${check.covers} ${check.method} ${check.path}${service}: ${check.status}${contains}`;
}

function scenarioLine(scenario: SavedScenario): string[] {
  const card = scenario.card;
  if (card === null || scenario.id === null || card.header.status !== "active") return [];
  return [`${scenario.id} ${card.header.kind} ${card.header.covers.join(", ")}: ${card.header.intent}`];
}

function section(title: string, lines: string[]): string[] {
  return ["", `## ${title}`, "", ...(lines.length ? lines : [NONE])];
}

function requestLines(texts: BriefTexts): string[] {
  return [texts.request, texts.story].flatMap((text) => (text === null || text.trim() === "" ? [] : [text.trim()]));
}

function earlierLines(facts: DeriveInput): string[] {
  return latestCases(roundRows(facts.rows, facts.round - 1)).map((row) => `${row.case} ${row.criterion} ${row.kind} ${row.outcome}`);
}

function answersSection(snap: WorkSnapshot): string[] {
  const answers = snap.replies.flatMap((reply) => (reply.choice === "answers" && reply.answers !== undefined ? [reply.answers] : []));
  return answers.length ? section("Answers", answers) : [];
}

const CAP_SOURCE_TEXT: Readonly<Record<Exclude<CaseCap["source"], "default">, string>> = { user: "set by the user", held: "not set by the user yet" };

function capLine(cap: CaseCap, criteria: number): string {
  const line = `cases per round: at most ${cap.cases}`;
  if (cap.source === "default") return line;
  return `${line} (${CAP_SOURCE_TEXT[cap.source]}; six for each of ${criteria} tested criteria gives ${cap.byDefault})`;
}

function limitLines(facts: DeriveInput, replies: readonly CapReply[]): string[] {
  const asked = facts.rows.filter((row) => row.type === "question").length;
  return [capLine(roundCap(facts.criteria, replies), facts.criteria.length), `questions: ${asked} of ${MAX_QUESTIONS} asked`, `defects per round: at most ${MAX_DEFECTS}`];
}

function catalogLine(entry: CatalogEntry): string {
  if (entry.kind === "user") return `- ${entry.name} (user): ${entry.need}; fields ${entry.fields.join(", ")} as {user:${entry.role}.<field>}`;
  return `- ${entry.name} (${entry.kind}): ${entry.need}; captures ${entry.captures.join(", ")}`;
}

function catalogSection(catalog: readonly CatalogEntry[]): string[] {
  return catalog.length ? section("Data catalog", catalog.map(catalogLine)) : [];
}

export function compileBrief(snap: WorkSnapshot, facts: DeriveInput, scenarios: readonly SavedScenario[], texts: BriefTexts, catalog: readonly CatalogEntry[]): string {
  const id = snap.state.id;
  const body = snap.artifact?.body ?? "";
  const lines = [
    `# Test brief: ${id} · round ${facts.round}`,
    ...section("Request", requestLines(texts)),
    ...section("Criteria", facts.criteria.map((criterion) => `${criterion}: ${criterionText(body, criterion)}`)),
    ...section("Approved checks", httpChecks(snap).map(checkLine)),
    ...section("Environment", [`run picket env start ${id}; it prints PICKET_URL_<SERVICE> for each service`]),
    ...section("Saved scenarios", scenarios.flatMap(scenarioLine)),
    ...catalogSection(catalog),
    ...section("Earlier rounds", earlierLines(facts)),
    ...answersSection(snap),
    ...section("Limits", limitLines(facts, snap.replies)),
  ];
  return `${lines.join("\n")}\n`;
}
