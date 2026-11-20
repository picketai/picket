import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { act, startDriver } from "./driver.mjs";
import { browserAdapter } from "../scenarios/browser.mts";
import { parseScenario, type Card } from "../scenarios/format.mts";
import { httpAdapter } from "../scenarios/http.mts";
import { runScenario } from "../scenarios/runner.mts";

type Element = { role?: "button" | "link"; label?: string; text?: string; hidden?: boolean };
type Lookup = { by: string; value: string; exact: boolean };
type FakeLocator = { filter: (options: { visible: boolean }) => FakeLocator; or: (other: FakeLocator) => FakeLocator; count: () => Promise<number>; fill: (value: string) => Promise<void>; click: () => Promise<void>; matches: () => Element[] };
type Fake = { page: object; lookups: Lookup[]; done: string[]; visited: string[] };

function locator(matches: () => Element[], done: string[]): FakeLocator {
  return {
    matches,
    filter: ({ visible }) => locator(() => matches().filter((element) => !visible || !element.hidden), done),
    or: (other) => locator(() => [...matches(), ...other.matches()], done),
    count: async () => matches().length,
    fill: async (value) => void done.push(`fill ${matches()[0].label} with ${value}`),
    click: async () => void done.push(`click ${matches()[0].role ?? "text"} ${matches()[0].text}`),
  };
}

function fakePage(elements: Element[], status: number | null = 200): Fake {
  const lookups: Lookup[] = [];
  const done: string[] = [];
  const visited: string[] = [];
  const find = (lookup: Lookup, match: (element: Element) => boolean) => {
    lookups.push(lookup);
    return locator(() => elements.filter(match), done);
  };
  const page = {
    goto: async (url: string) => {
      visited.push(url);
      return status === null ? null : { status: () => status };
    },
    getByLabel: (label: string, { exact }: { exact: boolean }) => find({ by: "label", value: label, exact }, (element) => element.label === label),
    getByRole: (role: string, { name, exact }: { name: string; exact: boolean }) => find({ by: role, value: name, exact }, (element) => element.role === role && element.text === name),
    getByText: (text: string, options?: { exact: boolean }) =>
      find({ by: "text", value: text, exact: options?.exact ?? false }, (element) => (options?.exact ? element.text === text : (element.text ?? "").includes(text))),
  };
  return { page, lookups, done, visited };
}

const FORM: Element[] = [{ label: "Email" }, { label: "Password", hidden: true }, { role: "button", text: "Sign in" }, { text: "Welcome PKT-7f3a to the shop" }];
const COMMAND = { session: "7f3a", timeoutMs: 0 };

test("fill finds the one visible field by its exact label and fills it (T-2.3)", async () => {
  const fake = fakePage(FORM);
  assert.deepEqual(await act(fake.page, { ...COMMAND, word: "fill", label: "Email", value: "PKT-7f3a@example.com" }), { ok: true, detail: "" });
  assert.deepEqual(fake.lookups, [{ by: "label", value: "Email", exact: true }]);
  assert.deepEqual(fake.done, ["fill Email with PKT-7f3a@example.com"]);
});

test("zero or two matches fail naming the count, and nothing is done (T-2.3)", async () => {
  const twice = fakePage([...FORM, { label: "Email" }]);
  assert.deepEqual(await act(twice.page, { ...COMMAND, word: "fill", label: "Email", value: "x" }), { ok: false, detail: 'found 2 fields labelled "Email"; the step needs exactly one' });
  const hidden = fakePage(FORM);
  assert.deepEqual(await act(hidden.page, { ...COMMAND, word: "fill", label: "Password", value: "x" }), { ok: false, detail: 'found 0 fields labelled "Password"; the step needs exactly one' });
  assert.deepEqual([...twice.done, ...hidden.done], []);
});

test("click takes the button or link of that exact name first, then the one exact text (T-2.3)", async () => {
  const button = fakePage(FORM);
  assert.deepEqual(await act(button.page, { ...COMMAND, word: "click", name: "Sign in" }), { ok: true, detail: "" });
  assert.deepEqual(button.lookups.slice(0, 2), [{ by: "button", value: "Sign in", exact: true }, { by: "link", value: "Sign in", exact: true }]);
  assert.deepEqual(button.done, ["click button Sign in"]);
  const text = fakePage([{ text: "Orders" }, { text: "Orders of PKT-1" }]);
  assert.deepEqual(await act(text.page, { ...COMMAND, word: "click", name: "Orders" }), { ok: true, detail: "" });
  assert.deepEqual(text.lookups[2], { by: "text", value: "Orders", exact: true });
  assert.deepEqual(text.done, ["click text Orders"]);
  const two = fakePage([{ role: "button", text: "Save" }, { role: "link", text: "Save" }]);
  assert.deepEqual(await act(two.page, { ...COMMAND, word: "click", name: "Save" }), { ok: false, detail: 'found 2 buttons, links or texts named "Save"; the step needs exactly one' });
});

test("see passes on one visible text holding the words and fails naming the count (T-2.3)", async () => {
  const fake = fakePage(FORM);
  assert.deepEqual(await act(fake.page, { ...COMMAND, word: "see", text: "Welcome PKT-7f3a" }), { ok: true, detail: "" });
  assert.deepEqual(fake.lookups, [{ by: "text", value: "Welcome PKT-7f3a", exact: false }]);
  assert.deepEqual(await act(fake.page, { ...COMMAND, word: "see", text: "Goodbye" }), { ok: false, detail: 'found 0 visible texts holding "Goodbye"; the step needs exactly one' });
});

test("open fails on an answer of 400 or more, naming the status, and passes otherwise", async () => {
  const url = "http://web:3000/login";
  assert.deepEqual(await act(fakePage([], 404).page, { ...COMMAND, word: "open", url }), { ok: false, detail: "open http://web:3000/login answered 404" });
  assert.deepEqual(await act(fakePage([], 302).page, { ...COMMAND, word: "open", url }), { ok: true, detail: "" });
  assert.deepEqual(await act(fakePage([], null).page, { ...COMMAND, word: "open", url }), { ok: true, detail: "" });
  assert.deepEqual(await act(fakePage([]).page, { ...COMMAND, word: "toString" }), { ok: false, detail: 'unknown browser command "toString"' });
});

type Session = { fake: Fake; closed: boolean };

function fakeLaunch(elements: Element[]): { launch: () => Promise<object>; sessions: Session[] } {
  const sessions: Session[] = [];
  const launch = async () => ({
    newContext: async () => {
      const session: Session = { fake: fakePage(elements), closed: false };
      sessions.push(session);
      return { newPage: async () => session.fake.page, close: async () => void (session.closed = true) };
    },
    close: async () => {},
  });
  return { launch, sessions };
}

async function driverOn(t: TestContext, elements: Element[]) {
  const fake = fakeLaunch(elements);
  const driver = await startDriver({ host: "127.0.0.1", port: 0, launch: fake.launch });
  t.after(() => driver.close());
  return { ...fake, browser: browserAdapter(httpAdapter(), `http://127.0.0.1:${driver.port}`) };
}

test("close ends that session's context only, and a step on a session with no page fails (T-2.3)", async (t) => {
  const { browser, sessions } = await driverOn(t, FORM);
  await browser({ session: "a", timeoutMs: 0, word: "open", url: "http://web:3000/" });
  await browser({ session: "b", timeoutMs: 0, word: "open", url: "http://web:3000/" });
  assert.deepEqual(await browser({ session: "a", timeoutMs: 0, word: "close" }), { ok: true, detail: "" });
  assert.deepEqual(sessions.map((session) => session.closed), [true, false]);
  assert.deepEqual(await browser({ session: "a", timeoutMs: 0, word: "see", text: "Welcome" }), { ok: false, detail: "no page open" });
  assert.deepEqual(await browser({ session: "b", timeoutMs: 0, word: "see", text: "Welcome" }), { ok: true, detail: "" });
});

function card(steps: string[]): Card {
  const { card: parsed, problems } = parseScenario(["---", "id: S-0001", "kind: normal", "covers: []", "intent: sign in", "format: 1", "---", ...steps, ""].join("\n"));
  assert.deepEqual(problems, []);
  assert.ok(parsed);
  return parsed;
}

async function appOn(t: TestContext): Promise<string> {
  const server = createServer((request, response) => {
    request.resume();
    request.on("end", () => {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(request.url === "/login" ? '{"token":"t-1"}' : "[]");
    });
  });
  await new Promise<void>((listening) => server.listen(0, "127.0.0.1", () => listening()));
  t.after(() => new Promise<void>((closed) => server.close(() => closed())));
  const address = server.address();
  assert.ok(address !== null && typeof address === "object");
  return `http://127.0.0.1:${address.port}`;
}

async function runOn(t: TestContext, steps: string[]) {
  const [app, driven] = await Promise.all([appOn(t), driverOn(t, FORM)]);
  const run = { urls: { web: app }, adapter: httpAdapter(), browser: driven.browser, pages: { web: "http://web:3000" }, env: {}, today: "2026-11-20", runKey: "7f3a", data: {}, timeoutMs: 1000, sleep: async () => {} };
  return { outcome: await runScenario({ ...run, card: card(steps) }), sessions: driven.sessions };
}

test("a mixed card runs through the real HTTP adapter and the driver to passed (T-2.4)", async (t) => {
  const steps = ["request POST {web}/login", "capture token json token", "open {web}/orders/{token}", 'fill "Email" with "PKT-{run}@example.com"', 'click "Sign in"', 'see "Welcome PKT-{run}"', "request GET {web}/orders", "expect status 200"];
  const { outcome, sessions } = await runOn(t, steps);
  assert.deepEqual(outcome, { outcome: "passed", step: null, detail: "", captures: { token: "t-1" } });
  assert.deepEqual(sessions.map(({ fake, closed }) => [fake.visited, fake.done, closed]), [[["http://web:3000/orders/t-1"], ["fill Email with PKT-7f3a@example.com", "click button Sign in"], true]]);
});

test("a missing label arrives as failed with the driver's detail unchanged (T-2.4)", async (t) => {
  const { outcome } = await runOn(t, ["open {web}/signup", 'fill "Phone" with "PKT-{run}"']);
  assert.deepEqual(outcome, { outcome: "failed", step: 2, detail: 'step 2: found 0 fields labelled "Phone"; the step needs exactly one', captures: {} });
});

test("a failed Chromium start does not stick: the next open launches again", async (t) => {
  const fake = fakeLaunch(FORM);
  let starts = 0;
  const launch = async () => {
    starts += 1;
    if (starts === 1) throw new Error("chromium did not start");
    return fake.launch();
  };
  const driver = await startDriver({ host: "127.0.0.1", port: 0, launch });
  t.after(() => driver.close());
  const browser = browserAdapter(httpAdapter(), `http://127.0.0.1:${driver.port}`);
  const open = { session: "a", timeoutMs: 0, word: "open" as const, url: "http://web:3000/" };
  assert.deepEqual(await browser(open), { ok: false, detail: "chromium did not start" });
  assert.deepEqual(await browser(open), { ok: true, detail: "" });
  assert.equal(starts, 2);
});
