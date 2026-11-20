import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { Refused } from "../action.mts";
import type { EnvModel, EnvService } from "../env/model.mts";
import { browserStack, pagesOf, PLAYWRIGHT_VERSION, prepareBrowser, withDriverPort, type BrowserFiles } from "./service.mts";

function service(name: string, role: string, ports: number[] = []): EnvService {
  return { name, role, build: null, image: null, healthcheck: null, ports: ports.map((target) => ({ target, published: null })), volumes: [], profiles: [], environment: {}, labels: {} };
}

const WITH_BROWSER: EnvModel = { name: "shop", services: [service("web", "app", [3000]), service("browser", "browser")], picket: null };
const WITHOUT_BROWSER: EnvModel = { name: "shop", services: [service("web", "app", [3000])], picket: null };

function project(t: TestContext): { root: string; files: BrowserFiles } {
  const root = mkdtempSync(join(tmpdir(), "picket-browser-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const built = join(root, "built");
  mkdirSync(join(built, "playwright-core"), { recursive: true });
  writeFileSync(join(built, "driver.mjs"), "driver program\n");
  writeFileSync(join(built, "playwright-core", "package.json"), `{"version":"${PLAYWRIGHT_VERSION}"}\n`);
  return { root, files: { driver: join(built, "driver.mjs"), vendored: join(built, "playwright-core") } };
}

test("the browser overlay runs the driver with two read-only binds, its health check, one engine-picked port on the loopback address only, init and ipc host (T-2.2)", (t) => {
  const { root, files } = project(t);
  const fragments = prepareBrowser(root, "picket-proj-481", WITH_BROWSER, files);
  const driver = join(root, ".picket", "state", "env", "picket-proj-481", "browser", "driver.mjs");
  const vendored = join(root, ".picket", "state", "browser", `playwright-core-${PLAYWRIGHT_VERSION}`);
  assert.deepEqual(fragments, {
    browser: {
      command: ["node", "/picket/driver.mjs", "--serve"],
      volumes: [
        { type: "bind", source: driver, target: "/picket/driver.mjs", read_only: true },
        { type: "bind", source: vendored, target: "/picket/node_modules/playwright-core", read_only: true },
      ],
      healthcheck: { test: ["CMD", "node", "/picket/driver.mjs", "--health"], interval: "2s", timeout: "2s", retries: 15 },
      ports: [{ target: 8080, host_ip: "127.0.0.1" }],
      init: true,
      ipc: "host",
    },
  });
  assert.equal(readFileSync(driver, "utf8"), "driver program\n");
  assert.equal(JSON.parse(readFileSync(join(vendored, "package.json"), "utf8")).version, PLAYWRIGHT_VERSION);
});

test("the vendored package is copied once per version and reused by the next stack", (t) => {
  const { root, files } = project(t);
  prepareBrowser(root, "picket-a", WITH_BROWSER, files);
  writeFileSync(join(files.vendored, "package.json"), '{"version":"changed"}\n');
  const [again] = Object.values(prepareBrowser(root, "picket-b", WITH_BROWSER, files));
  const copy = again.volumes[1].source;
  assert.equal(JSON.parse(readFileSync(join(copy, "package.json"), "utf8")).version, PLAYWRIGHT_VERSION);
  assert.ok(!existsSync(`${copy}.partial`));
});

test("an environment without a browser service gets no overlay and needs no driver; one with it refuses a missing driver", (t) => {
  const { root } = project(t);
  const missing = { driver: join(root, "absent.mjs"), vendored: join(root, "absent") };
  assert.deepEqual(prepareBrowser(root, "picket-a", WITHOUT_BROWSER, missing), {});
  assert.ok(!existsSync(join(root, ".picket", "state", "env", "picket-a", "browser")));
  assert.throws(() => prepareBrowser(root, "picket-a", WITH_BROWSER, missing), (err) => err instanceof Refused && err.message === "the browser driver or its Playwright package is missing: rebuild Picket");
});

test("pages map each service with a port to its in-network address, the browser excluded (T-2.2)", () => {
  const services = [service("web", "app", [3000, 9229]), service("payments-mock", "mock", [8080]), service("cache", "dependency"), service("browser", "browser", [8080])];
  assert.deepEqual(pagesOf(services), { web: "http://web:3000", "payments-mock": "http://payments-mock:8080" });
});

test("the browser stack names the driver's host endpoint, or no driver without a browser service", () => {
  const ported = withDriverPort(WITH_BROWSER.services);
  assert.deepEqual(ported[1].ports, [{ target: 8080, published: null }]);
  const endpoints = { web: "http://127.0.0.1:49153", browser: "http://127.0.0.1:49154" };
  assert.deepEqual(browserStack(ported, endpoints), { driver: "http://127.0.0.1:49154", pages: { web: "http://web:3000" } });
  assert.deepEqual(browserStack(WITHOUT_BROWSER.services, endpoints), { driver: null, pages: { web: "http://web:3000" } });
});

test("the devDependency and the built vendored copy are both Playwright PLAYWRIGHT_VERSION (T-2.6)", () => {
  const pkg = JSON.parse(readFileSync(resolve("package.json"), "utf8"));
  assert.equal(pkg.devDependencies["playwright-core"], PLAYWRIGHT_VERSION);
  const vendored = JSON.parse(readFileSync(resolve("dist", "lib", "vendor", "playwright-core", "package.json"), "utf8"));
  assert.equal(vendored.version, PLAYWRIGHT_VERSION);
});
