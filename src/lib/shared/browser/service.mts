import { copyFileSync, cpSync, existsSync, mkdirSync, renameSync, rmSync } from "node:fs";
import { join } from "node:path";
import { Refused } from "../action.mts";
import type { EnvModel, EnvService } from "../env/model.mts";
import { BROWSER_ROLE, PLAYWRIGHT_VERSION } from "../env/standard.mts";
import { pluginRoot, statePath } from "../paths.mts";

export type BrowserFragment = {
  command: string[];
  volumes: { type: "bind"; source: string; target: string; read_only: true }[];
  healthcheck: { test: string[]; interval: string; timeout: string; retries: number };
  ports: { target: number; host_ip: string }[];
  init: true;
  ipc: "host";
};
export type BrowserFiles = { driver: string; vendored: string };
export type BrowserStack = { driver: string | null; pages: Record<string, string> };

export { BROWSER_ROLE, PLAYWRIGHT_VERSION };
export const DRIVER_PORT = 8080;
const LOOPBACK = "127.0.0.1";
const DRIVER_NAME = "driver.mjs";
const PACKAGE_NAME = "playwright-core";
const CONTAINER_DRIVER = `/picket/${DRIVER_NAME}`;
const CONTAINER_PACKAGE = `/picket/node_modules/${PACKAGE_NAME}`;
const HEALTH_INTERVAL = "2s";
const HEALTH_TIMEOUT = "2s";
const HEALTH_RETRIES = 15;

export function browserFiles(): BrowserFiles {
  const lib = join(pluginRoot(), "lib");
  return { driver: join(lib, "shared", "browser", DRIVER_NAME), vendored: join(lib, "vendor", PACKAGE_NAME) };
}

export function browserService(services: readonly EnvService[]): EnvService | null {
  return services.find((service) => service.role === BROWSER_ROLE && service.profiles.length === 0) ?? null;
}

function bind(source: string, target: string): BrowserFragment["volumes"][number] {
  return { type: "bind", source, target, read_only: true };
}

export function browserFragment(driver: string, vendored: string): BrowserFragment {
  return {
    command: ["node", CONTAINER_DRIVER, "--serve"],
    volumes: [bind(driver, CONTAINER_DRIVER), bind(vendored, CONTAINER_PACKAGE)],
    healthcheck: { test: ["CMD", "node", CONTAINER_DRIVER, "--health"], interval: HEALTH_INTERVAL, timeout: HEALTH_TIMEOUT, retries: HEALTH_RETRIES },
    ports: [{ target: DRIVER_PORT, host_ip: LOOPBACK }],
    init: true,
    ipc: "host",
  };
}

function vendoredCopy(root: string, vendored: string): string {
  const target = statePath(root, `browser/${PACKAGE_NAME}-${PLAYWRIGHT_VERSION}`);
  if (existsSync(target)) return target;
  const partial = `${target}.partial`;
  rmSync(partial, { recursive: true, force: true });
  cpSync(vendored, partial, { recursive: true });
  renameSync(partial, target);
  return target;
}

export function prepareBrowser(root: string, stack: string, model: EnvModel, files: BrowserFiles = browserFiles()): Record<string, BrowserFragment> {
  const service = browserService(model.services);
  if (service === null) return {};
  if (!existsSync(files.driver) || !existsSync(files.vendored)) throw new Refused("the browser driver or its Playwright package is missing: rebuild Picket");
  const folder = statePath(root, `env/${stack}/browser`);
  mkdirSync(folder, { recursive: true });
  const driver = join(folder, DRIVER_NAME);
  copyFileSync(files.driver, driver);
  return { [service.name]: browserFragment(driver, vendoredCopy(root, files.vendored)) };
}

export function withDriverPort(services: EnvService[]): EnvService[] {
  return services.map((service) => (service.role === BROWSER_ROLE ? { ...service, ports: [{ target: DRIVER_PORT, published: null }] } : service));
}

export function pagesOf(services: readonly EnvService[]): Record<string, string> {
  const paged = services.filter((service) => service.role !== BROWSER_ROLE && service.ports.length > 0);
  return Object.fromEntries(paged.map((service) => [service.name, `http://${service.name}:${service.ports[0].target}`]));
}

export function browserStack(services: EnvService[], endpoints: Record<string, string>): BrowserStack {
  const service = browserService(services);
  return { driver: service === null ? null : (endpoints[service.name] ?? null), pages: pagesOf(services) };
}
