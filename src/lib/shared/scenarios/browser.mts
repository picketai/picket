import type { HttpAdapter } from "./http.mts";

type Addressed = { session: string; timeoutMs: number };
export type BrowserAction = { word: "open"; url: string } | { word: "fill"; label: string; value: string } | { word: "click"; name: string } | { word: "see"; text: string } | { word: "close" };
export type BrowserCommand = Addressed & BrowserAction;
export type BrowserAnswer = { ok: boolean | null; detail: string };
export type BrowserAdapter = (command: BrowserCommand) => Promise<BrowserAnswer>;

export const STEP_PATH = "/__picket/step";
export const NO_BROWSER_SERVICE = "the environment has no browser service";
const ANSWER_MARGIN_MS = 5_000;
const OK_STATUS = 200;

export const noBrowser: BrowserAdapter = async () => ({ ok: null, detail: NO_BROWSER_SERVICE });

function readAnswer(text: string): BrowserAnswer | null {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof value !== "object" || value === null || !("ok" in value) || !("detail" in value)) return null;
  const { ok, detail } = value;
  return (ok === null || typeof ok === "boolean") && typeof detail === "string" ? { ok, detail } : null;
}

export function browserAdapter(http: HttpAdapter, driver: string | null): BrowserAdapter {
  if (driver === null) return noBrowser;
  return async (command) => {
    const request = { method: "POST", url: driver + STEP_PATH, headers: { "content-type": "application/json" }, body: JSON.stringify(command), timeoutMs: command.timeoutMs + ANSWER_MARGIN_MS };
    const answer = await http(request);
    if (answer.status === null) return { ok: null, detail: `the browser service did not answer: ${answer.error}` };
    if (answer.status !== OK_STATUS) return { ok: null, detail: `the browser service answered ${answer.status}` };
    return readAnswer(answer.text) ?? { ok: null, detail: "the browser service sent an unreadable answer" };
  };
}
