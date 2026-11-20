import { noBrowser, type BrowserAction, type BrowserAdapter } from "./browser.mts";
import { browserTexts, isBrowserStep, type BrowserStep, type OpenStep, type Card, type CaptureStep, type ExpectStep, type RequestStep, type Step } from "./format.mts";
import type { HttpAdapter, HttpAnswer, HttpRequest } from "./http.mts";
import { resolveText, type ValueScope } from "./values.mts";

export type RunInput = {
  card: Card;
  urls: Record<string, string>;
  adapter: HttpAdapter;
  browser?: BrowserAdapter;
  pages?: Record<string, string>;
  env: NodeJS.ProcessEnv;
  today: string;
  runKey: string;
  data: Record<string, string>;
  timeoutMs: number;
  sleep: (ms: number) => Promise<void>;
};
export type RunOutcome = { outcome: "passed" | "failed" | "blocked"; step: number | null; detail: string; captures: Record<string, string> };

type Stop = Omit<RunOutcome, "captures">;

type RunState = { scope: ValueScope; answer: HttpAnswer; browsed: boolean };
type Prepared = { request: HttpRequest; service: string } | { stop: Stop };
type Acted = { action: BrowserAction } | { stop: Stop };

const SERVICE_TARGET = /^\{([^{}]+)\}(.*)$/;
const NO_ANSWER: HttpAnswer = { status: null, headers: {}, text: "", error: null };
const PASSED: Stop = { outcome: "passed", step: null, detail: "" };
const SECOND_MS = 1000;

function halt(outcome: "failed" | "blocked", step: Step, text: string): Stop {
  return { outcome, step: step.line, detail: `step ${step.line}: ${text}` };
}

function resolveAll(templates: string[], scope: ValueScope): string[] | { blocked: string } {
  const texts: string[] = [];
  for (const template of templates) {
    const value = resolveText(template, scope);
    if ("blocked" in value) return value;
    texts.push(value.text);
  }
  return texts;
}

function prepare(step: RequestStep, input: RunInput, scope: ValueScope): Prepared {
  const [, service, path] = step.target.match(SERVICE_TARGET) ?? [];
  const base = service === undefined ? undefined : input.urls[service];
  if (base === undefined) return { stop: halt("blocked", step, `{${service ?? step.target}} has no published port`) };
  const values = resolveAll([path, ...step.headers.map(([, value]) => value), ...(step.body === null ? [] : [step.body])], scope);
  if (!Array.isArray(values)) return { stop: halt("blocked", step, values.blocked) };
  const [resolvedPath, ...rest] = values;
  const headers = Object.fromEntries(step.headers.map(([name], at) => [name, rest[at]]));
  const body = step.body === null ? null : rest[step.headers.length];
  return { request: { method: step.method, url: base + resolvedPath, headers, body, timeoutMs: input.timeoutMs }, service };
}

async function sendRequest(step: RequestStep, input: RunInput, state: RunState): Promise<Stop | null> {
  const prepared = prepare(step, input, state.scope);
  if ("stop" in prepared) return prepared.stop;
  state.answer = await input.adapter(prepared.request);
  if (state.answer.status === null) return halt("blocked", step, `{${prepared.service}} did not answer: ${state.answer.error}`);
  return null;
}

function openAction(step: OpenStep, input: RunInput, scope: ValueScope): Acted {
  const [, service, path] = step.target.match(SERVICE_TARGET) ?? [];
  const page = service === undefined ? undefined : input.pages?.[service];
  if (page === undefined) return { stop: halt("blocked", step, `{${service ?? step.target}} has no address inside the stack`) };
  const resolved = resolveText(path, scope);
  return "blocked" in resolved ? { stop: halt("blocked", step, resolved.blocked) } : { action: { word: "open", url: page + resolved.text } };
}

function pageAction(step: BrowserStep, input: RunInput, scope: ValueScope): Acted {
  if (step.word === "open") return openAction(step, input, scope);
  const texts = resolveAll(browserTexts(step), scope);
  if (!Array.isArray(texts)) return { stop: halt("blocked", step, texts.blocked) };
  const [first, second] = texts;
  if (step.word === "fill") return { action: { word: "fill", label: first, value: second } };
  return { action: step.word === "click" ? { word: "click", name: first } : { word: "see", text: first } };
}

function browserOf(input: RunInput): BrowserAdapter {
  return input.browser ?? noBrowser;
}

async function browse(step: BrowserStep, input: RunInput, state: RunState): Promise<Stop | null> {
  const acted = pageAction(step, input, state.scope);
  if ("stop" in acted) return acted.stop;
  state.browsed = true;
  const answer = await browserOf(input)({ session: input.runKey, timeoutMs: input.timeoutMs, ...acted.action });
  if (answer.ok === null) return halt("blocked", step, answer.detail);
  return answer.ok ? null : halt("failed", step, answer.detail);
}

function checkExpect(step: ExpectStep, state: RunState): Stop | null {
  if (step.what === "status") {
    return state.answer.status === step.status ? null : halt("failed", step, `expected status ${step.status}, got ${state.answer.status}`);
  }
  const expected = resolveText(step.text, state.scope);
  if ("blocked" in expected) return halt("blocked", step, expected.blocked);
  return state.answer.text.includes(expected.text) ? null : halt("failed", step, `${JSON.stringify(step.text)} not in the answer`);
}

function jsonAt(text: string, path: string): unknown {
  let node: unknown;
  try {
    node = JSON.parse(text);
  } catch {
    return undefined;
  }
  for (const key of path.split(".")) node = node !== null && typeof node === "object" ? (node as Record<string, unknown>)[key] : undefined;
  return node;
}

function capturedValue(step: CaptureStep, answer: HttpAnswer): string | null {
  if (step.from === "header") {
    const name = step.key.toLowerCase();
    return Object.entries(answer.headers).find(([key]) => key.toLowerCase() === name)?.[1] ?? null;
  }
  const value = jsonAt(answer.text, step.key);
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean" ? String(value) : null;
}

function capture(step: CaptureStep, state: RunState): Stop | null {
  const value = capturedValue(step, state.answer);
  if (value === null) return halt("failed", step, `capture ${step.name}: no ${step.key} in the answer`);
  state.scope.captures[step.name] = value;
  return null;
}

async function runStep(step: Step, input: RunInput, state: RunState): Promise<Stop | null> {
  if (step.word === "request") return sendRequest(step, input, state);
  if (step.word === "expect") return checkExpect(step, state);
  if (step.word === "capture") return capture(step, state);
  if (isBrowserStep(step)) return browse(step, input, state);
  await input.sleep(step.seconds * SECOND_MS);
  return null;
}

async function runSteps(input: RunInput, state: RunState): Promise<Stop> {
  for (const step of input.card.steps) {
    const outcome = await runStep(step, input, state);
    if (outcome !== null) return outcome;
  }
  return PASSED;
}

export async function runScenario(input: RunInput): Promise<RunOutcome> {
  const state: RunState = { scope: { run: input.runKey, captures: {}, data: input.data, env: input.env, today: input.today }, answer: NO_ANSWER, browsed: false };
  const stop = await runSteps(input, state);
  if (state.browsed) await browserOf(input)({ session: input.runKey, word: "close", timeoutMs: input.timeoutMs });
  return { ...stop, captures: state.scope.captures };
}
