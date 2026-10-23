import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { azdoRequest } from "./azdo.mts";
import { parsePullRequestUrl, type AzdoPullRequest } from "./pull-request.mts";

const azdoPullRequest = (url: string) => parsePullRequestUrl(url) as AzdoPullRequest;

const MARKER_PAT = "pat-marker-04d";
const ERROR_BODY_CHARS = 200;

async function deniedServer(body: () => string): Promise<{ server: Server; url: string }> {
  const server = createServer((req, res) => {
    req.resume();
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(body());
  });
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  return { server, url: `http://127.0.0.1:${(server.address() as AddressInfo).port}/c/p/_git/r/pullrequest/7` };
}

async function deniedWith(body: string): Promise<string> {
  const { server, url } = await deniedServer(() => body);
  try {
    await azdoRequest(azdoPullRequest(url), "/threads", { method: "POST", body: {}, pat: MARKER_PAT });
    assert.fail("a 401 must throw");
  } catch (err) {
    return (err as Error).message;
  } finally {
    server.close();
  }
}

const BASIC = Buffer.from(`:${MARKER_PAT}`).toString("base64");

for (const [form, secret] of [["the PAT", MARKER_PAT], ["its Basic form", BASIC]]) {
  test(`${form} straddling the error body's cut is not printed in part`, async () => {
    const message = await deniedWith(`${"x".repeat(ERROR_BODY_CHARS - 5)}${secret} and more`);
    assert.ok(!message.includes(secret.slice(0, 5)), message);
  });
}

function hexOf(ch: string, width: number): string {
  return ch.charCodeAt(0).toString(16).toUpperCase().padStart(width, "0");
}

const ENCODINGS: [string, (text: string) => string][] = [
  ["JSON-escaped", (text) => [...text].map((ch) => `\\u${hexOf(ch, 4)}`).join("")],
  ["percent-encoded", (text) => [...text].map((ch) => `%${hexOf(ch, 2)}`).join("")],
];

for (const [encoding, encode] of ENCODINGS) {
  for (const [form, secret] of [["the PAT", MARKER_PAT], ["its Basic form", BASIC]]) {
    test(`${form} echoed ${encoding} is not printed`, async () => {
      const echoed = encode(secret);
      const message = await deniedWith(JSON.stringify({ message: "denied" }).replace("denied", `denied ${echoed}`));
      assert.ok(!message.includes(echoed) && !message.includes(echoed.toLowerCase()), message);
    });
  }
}

test("an empty PAT leaves the error body as the server wrote it", async () => {
  const { server, url } = await deniedServer(() => "denied");
  try {
    await assert.rejects(azdoRequest(azdoPullRequest(url), "", { pat: "" }), (err) => err instanceof Error && err.message.endsWith(": denied"));
  } finally {
    server.close();
  }
});
