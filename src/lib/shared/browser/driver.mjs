import { createServer } from "node:http";
import { setTimeout as delay } from "node:timers/promises";

const PORT = 8080;
const ANY_HOST = "0.0.0.0";
const LOCAL_HOST = "127.0.0.1";
const STEP_PATH = "/__picket/step";
const HEALTH_PATH = "/__picket/health";
const HEALTH_FLAG = "--health";
const SERVE_FLAG = "--serve";
const HEALTH_TIMEOUT_MS = 2000;
const POLL_MS = 100;
const FIRST_ERROR_STATUS = 400;
const NO_PAGE = { ok: false, detail: "no page open" };
const DONE = { ok: true, detail: "" };

function visible(locator) {
  return locator.filter({ visible: true });
}

async function settle(timeoutMs, probe) {
  const deadline = Date.now() + timeoutMs;
  let found = await probe();
  while (found.count !== 1 && Date.now() < deadline) {
    await delay(POLL_MS);
    found = await probe();
  }
  return found;
}

function counted(locator) {
  return async () => ({ target: locator, count: await locator.count() });
}

function clickable(page, name) {
  const roles = visible(page.getByRole("button", { name, exact: true }).or(page.getByRole("link", { name, exact: true })));
  const texts = visible(page.getByText(name, { exact: true }));
  return async () => {
    const count = await roles.count();
    return count > 0 ? { target: roles, count } : { target: texts, count: await texts.count() };
  };
}

async function open(page, { url, timeoutMs }) {
  const response = await page.goto(url, { timeout: timeoutMs });
  const status = response?.status() ?? null;
  return status !== null && status >= FIRST_ERROR_STATUS ? { ok: false, detail: `open ${url} answered ${status}` } : DONE;
}

const LOOKUPS = {
  fill: (page, { label, value, timeoutMs }) => ({
    probe: counted(visible(page.getByLabel(label, { exact: true }))),
    what: `fields labelled ${JSON.stringify(label)}`,
    use: (field) => field.fill(value, { timeout: timeoutMs }),
  }),
  click: (page, { name, timeoutMs }) => ({
    probe: clickable(page, name),
    what: `buttons, links or texts named ${JSON.stringify(name)}`,
    use: (target) => target.click({ timeout: timeoutMs }),
  }),
  see: (page, { text }) => ({
    probe: counted(visible(page.getByText(text))),
    what: `visible texts holding ${JSON.stringify(text)}`,
    use: async () => {},
  }),
};

export async function act(page, command) {
  if (command.word === "open") return open(page, command);
  if (!Object.hasOwn(LOOKUPS, command.word)) return { ok: false, detail: `unknown browser command ${JSON.stringify(command.word)}` };
  const lookup = LOOKUPS[command.word](page, command);
  const found = await settle(command.timeoutMs, lookup.probe);
  if (found.count !== 1) return { ok: false, detail: `found ${found.count} ${lookup.what}; the step needs exactly one` };
  await lookup.use(found.target);
  return DONE;
}

function firstLine(err) {
  return (err instanceof Error ? err.message : String(err)).split("\n")[0];
}

function stepper(launch) {
  const sessions = new Map();
  let browser = null;
  const sessionFor = async (id) => {
    if (!sessions.has(id)) {
      browser ??= launch();
      const context = await (await browser).newContext();
      sessions.set(id, { context, page: await context.newPage() });
    }
    return sessions.get(id);
  };
  const step = async (command) => {
    if (command.word === "close") {
      await sessions.get(command.session)?.context.close();
      sessions.delete(command.session);
      return DONE;
    }
    const session = command.word === "open" ? await sessionFor(command.session) : sessions.get(command.session);
    return session === undefined ? NO_PAGE : act(session.page, command);
  };
  const stop = async () => (browser === null ? undefined : (await browser).close());
  return { step: (command) => step(command).catch((err) => ({ ok: false, detail: firstLine(err) })), stop };
}

function reply(response, status, body) {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(body));
}

function handler(step) {
  return (request, response) => {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", async () => {
      if (request.method === "GET" && request.url === HEALTH_PATH) return reply(response, 200, DONE);
      if (request.method !== "POST" || request.url !== STEP_PATH) return reply(response, 404, { ok: null, detail: `no ${request.method} ${request.url}` });
      let command;
      try {
        command = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      } catch {
        return reply(response, 400, { ok: null, detail: "the step is not JSON" });
      }
      reply(response, 200, await step(command));
    });
  };
}

export function startDriver({ host, port, launch }) {
  const { step, stop } = stepper(launch);
  const server = createServer(handler(step));
  const close = async () => {
    server.closeAllConnections();
    await new Promise((closed) => server.close(() => closed()));
    await stop();
  };
  return new Promise((started, failed) => {
    server.once("error", failed);
    server.listen(port, host, () => started({ port: server.address().port, close }));
  });
}

async function healthy() {
  try {
    const response = await fetch(`http://${LOCAL_HOST}:${PORT}${HEALTH_PATH}`, { signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS) });
    return response.status === 200;
  } catch {
    return false;
  }
}

async function main([first]) {
  if (first === HEALTH_FLAG) {
    process.exitCode = (await healthy()) ? 0 : 1;
    return;
  }
  if (first !== SERVE_FLAG) return;
  const { chromium } = await import("playwright-core");
  const driver = await startDriver({ host: ANY_HOST, port: PORT, launch: () => chromium.launch() });
  process.once("SIGTERM", () => driver.close());
}

await main(process.argv.slice(2));
