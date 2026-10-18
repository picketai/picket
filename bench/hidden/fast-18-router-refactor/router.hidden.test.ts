import { describe, expect, it } from "vitest";
import { Router, json } from "../../src/http/router.js";

function router() {
  return new Router()
    .add("GET", "/health", () => json(200, { ok: true }))
    .add("get", "/invoices/:id", ({ params, query }) => json(200, { id: params.id, view: query.get("view") }))
    .add("POST", "/boom", () => {
      throw new Error("kaput");
    });
}

const call = async (method: string, url: string) => {
  const res = await router().handle({ method, url, headers: {} });
  return { status: res.status, body: JSON.parse(res.body), type: res.headers["content-type"] };
};

describe("hidden: the router behaves as before the refactor", () => {
  it("matches a static route and ignores a trailing slash", async () => {
    expect(await call("GET", "/health")).toEqual({ status: 200, body: { ok: true }, type: "application/json; charset=utf-8" });
    expect((await call("GET", "/health/")).status).toBe(200);
  });

  it("decodes params, passes the query and matches methods in any case", async () => {
    expect((await call("get", "/invoices/INV%2D1003?view=short")).body).toEqual({ id: "INV-1003", view: "short" });
  });

  it("answers 404 with the method and path for no route, including a wrong method", async () => {
    expect(await call("GET", "/nope")).toEqual({ status: 404, body: { error: { message: "no route for GET /nope" } }, type: "application/json; charset=utf-8" });
    expect((await call("DELETE", "/health")).body).toEqual({ error: { message: "no route for DELETE /health" } });
  });

  it("answers 500 with the error message when a handler throws", async () => {
    expect(await call("POST", "/boom")).toEqual({ status: 500, body: { error: { message: "kaput" } }, type: "application/json; charset=utf-8" });
  });

  it("does not match a path with a different segment count", async () => {
    expect((await call("GET", "/invoices")).status).toBe(404);
    expect((await call("GET", "/invoices/1/extra")).status).toBe(404);
  });
});
