import { createServer } from "node:http";
import { readFileSync } from "node:fs";

const PORT = 8080;
const ANY_HOST = "0.0.0.0";
const LOCAL_HOST = "127.0.0.1";
const RESERVED_PREFIX = "/__picket/";
const HEALTH_PATH = "/__picket/health";
const RECEIVED_PATH = "/__picket/received";
const HEALTH_FLAG = "--health";
const HEALTH_TIMEOUT_MS = 2000;
const NO_ANSWER = 501;
const WILDCARD = "*";

function segmentsMatch(pattern, path) {
  const want = pattern.split("/");
  const got = path.split("/");
  return want.length === got.length && want.every((segment, at) => segment === got[at] || (segment === WILDCARD && got[at] !== ""));
}

export function answerFor(answers, method, path) {
  return answers.find((answer) => answer.method === method && segmentsMatch(answer.path, path)) ?? null;
}

function pathOf(url) {
  const at = url.search(/[?#]/);
  return at < 0 ? url : url.slice(0, at);
}

function respond(definition, received, method, path) {
  if (method === "GET" && path === HEALTH_PATH) return { status: 200, headers: [["Content-Type", "text/plain"]], body: "ok" };
  if (method === "GET" && path === RECEIVED_PATH) return { status: 200, headers: [["Content-Type", "application/json"]], body: JSON.stringify(received) };
  const answer = answerFor(definition.answers, method, path);
  if (!path.startsWith(RESERVED_PREFIX)) received.push({ method, path, answered: answer !== null });
  return answer ?? { status: NO_ANSWER, headers: [["Content-Type", "text/plain"]], body: `${definition.service} has no answer for ${method} ${path}` };
}

function handler(definition, received) {
  return (request, response) => {
    request.on("end", () => {
      const answer = respond(definition, received, request.method ?? "GET", pathOf(request.url ?? "/"));
      response.writeHead(answer.status, answer.headers.flat());
      response.end(answer.body ?? "");
    });
    request.resume();
  };
}

export function startStub({ definition, host, port }) {
  const server = createServer(handler(definition, []));
  const close = () =>
    new Promise((closed) => {
      server.closeAllConnections();
      server.close(() => closed());
    });
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
  if (first === undefined) return;
  if (first === HEALTH_FLAG) {
    process.exitCode = (await healthy()) ? 0 : 1;
    return;
  }
  const stub = await startStub({ definition: JSON.parse(readFileSync(first, "utf8")), host: ANY_HOST, port: PORT });
  process.once("SIGTERM", () => stub.close());
}

await main(process.argv.slice(2));
