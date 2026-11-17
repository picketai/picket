import { criterionText } from "../scenarios/keep.mts";
import type { SavedScenario } from "../scenarios/files.mts";
import { readChecks, type HttpCheck } from "../work/declared-checks.mts";
import type { WorkSnapshot } from "../work/snapshot.mts";
import { caseCap, MAX_QUESTIONS, type DeriveInput } from "./derive.mts";
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

function limitLines(facts: DeriveInput): string[] {
  const asked = facts.rows.filter((row) => row.type === "question").length;
  return [`cases per round: at most ${caseCap(facts.criteria)}`, `questions: ${asked} of ${MAX_QUESTIONS} asked`];
}

export function compileBrief(snap: WorkSnapshot, facts: DeriveInput, scenarios: readonly SavedScenario[], texts: BriefTexts): string {
  const id = snap.state.id;
  const body = snap.artifact?.body ?? "";
  const lines = [
    `# Test brief: ${id} · round ${facts.round}`,
    ...section("Request", requestLines(texts)),
    ...section("Criteria", facts.criteria.map((criterion) => `${criterion}: ${criterionText(body, criterion)}`)),
    ...section("Approved checks", httpChecks(snap).map(checkLine)),
    ...section("Environment", [`run picket env start ${id}; it prints PICKET_URL_<SERVICE> for each service`]),
    ...section("Saved scenarios", scenarios.flatMap(scenarioLine)),
    ...section("Earlier rounds", earlierLines(facts)),
    ...answersSection(snap),
    ...section("Limits", limitLines(facts)),
  ];
  return `${lines.join("\n")}\n`;
}
