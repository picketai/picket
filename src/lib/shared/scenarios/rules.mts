import { isSecretName, mapSecretLeaves } from "../env/config-entries.mts";
import type { Card, RequestStep, Step } from "./format.mts";

export const PLACEHOLDER = /\{([a-z][a-z0-9_]*(?::[A-Za-z0-9_.+-]+)?)\}/g;

const BRACED = /\{([A-Za-z_$][^{}\s"]*)\}/g;
const SERVICE_TOKEN = /^\{([^{}]*)\}/;
const SERVICE_NAME = /^[a-z0-9][a-z0-9_.-]*$/;
const RUN_KEY = "run";
const TEST_USER = /^user:[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
const RELATIVE_DATE = /^date:[+-]\d+d$/;
const CATALOG_VALUE = /^data:[a-z][a-z0-9-]*\.[a-z][a-z0-9_]*$/;
const FIXED_DATE = /\b\d{4}-\d{2}-\d{2}(?=T|\b)/g;
const SECRET_HEADERS = ["authorization", "proxy-authorization", "cookie"];
const AUTH_SCHEME = /^\s*(?:bearer|basic|digest|token)\b/i;
const SECRET_SOURCE = "take it from a capture or {user:<role>.<field>}";

export function placeholders(text: string): string[] {
  return [...text.matchAll(PLACEHOLDER)].map((match) => match[1]);
}

function braced(text: string): string[] {
  return [...text.matchAll(BRACED)].map((match) => match[1]);
}

function isSource(name: string, captured: Set<string>): boolean {
  return name === RUN_KEY || captured.has(name) || TEST_USER.test(name) || RELATIVE_DATE.test(name) || CATALOG_VALUE.test(name);
}

function valueProblems(line: number, texts: string[], captured: Set<string>): string[] {
  return texts.flatMap((text) => [
    ...braced(text)
      .filter((name) => !isSource(name, captured))
      .map((name) => `rule 3: step ${line} takes {${name}}, which is no capture before it, the run key, a test user, a catalog entry or a relative date`),
    ...[...text.matchAll(FIXED_DATE)].map(([date]) => `step ${line}: fixed date ${date}; write {date:+Nd}`),
  ]);
}

function targetProblems(step: RequestStep, services: string[] | null): { problems: string[]; rest: string } {
  const token = step.target.match(SERVICE_TOKEN);
  if (!token || !SERVICE_NAME.test(token[1])) {
    return { problems: [`rule 1: step ${step.line} sends to ${step.target}; a request goes only to {<service>} of the environment`], rest: step.target };
  }
  const known = services === null || services.includes(token[1]);
  const problems = known ? [] : [`rule 1: step ${step.line} names {${token[1]}}, which is no service of the environment`];
  return { problems, rest: step.target.slice(token[0].length) };
}

function holdsLiteral(value: string): boolean {
  return value.replace(BRACED, "").replace(AUTH_SCHEME, "").trim() !== "";
}

function isSecretHeader(name: string): boolean {
  const lower = name.toLowerCase();
  return SECRET_HEADERS.includes(lower) || isSecretName(lower.replaceAll("-", ""));
}

function secretHeaderProblems(step: RequestStep): string[] {
  return step.headers
    .filter(([name, value]) => isSecretHeader(name) && holdsLiteral(value))
    .map(([name]) => `step ${step.line}: header ${name} holds a literal secret; ${SECRET_SOURCE}`);
}

function literalSecretKeys(value: unknown): string[] {
  const keys = new Set<string>();
  mapSecretLeaves(value, (leaf, key) => {
    if (typeof leaf === "number" || holdsLiteral(leaf)) keys.add(key);
    return leaf;
  });
  return [...keys];
}

function jsonBody(body: string | null): unknown {
  if (body === null) return null;
  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
}

function secretBodyProblems(step: RequestStep): string[] {
  return literalSecretKeys(jsonBody(step.body)).map((key) => `step ${step.line}: body key ${key} holds a literal secret; ${SECRET_SOURCE}`);
}

function requestProblems(step: RequestStep, captured: Set<string>, services: string[] | null): string[] {
  const target = targetProblems(step, services);
  const texts = [target.rest, ...step.headers.map(([, value]) => value), ...(step.body === null ? [] : [step.body])];
  return [...target.problems, ...valueProblems(step.line, texts, captured), ...secretHeaderProblems(step), ...secretBodyProblems(step)];
}

function stepProblems(step: Step, captured: Set<string>, services: string[] | null): string[] {
  if (step.word === "request") return requestProblems(step, captured, services);
  if (step.word === "expect" && step.what === "contains") return valueProblems(step.line, [step.text], captured);
  return [];
}

export function scenarioProblems(card: Card, services: string[] | null): string[] {
  const captured = new Set<string>();
  return card.steps.flatMap((step) => {
    const problems = stepProblems(step, captured, services);
    if (step.word === "capture") captured.add(step.name);
    return problems;
  });
}
