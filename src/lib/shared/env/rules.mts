import type { EnvModel, EnvService } from "./model.mts";
import { BROWSER_ROLE, DATA_PROFILE, isRole, LONG_RUNNING, PLAYWRIGHT_VERSION, ROLE_LABEL, ROLES, X_PICKET } from "./standard.mts";

export type Finding = { rule: string; service: string | null; level: "error" | "pending"; message: string };

type ServiceRule = { rule: string; check: (service: EnvService, stubbed: readonly string[]) => string[] };

const ADDRESS_VARIABLE = /^[A-Z_][A-Z0-9_]*$/;
const PINNED = "@sha256:";
const DISABLED_TEST = "NONE";

function healthy(service: EnvService): boolean {
  const check = service.healthcheck;
  return check !== null && !check.disable && check.test.length > 0 && check.test[0] !== DISABLED_TEST;
}

const SERVICE_RULES: ServiceRule[] = [
  { rule: "E1", check: (s) => (isRole(s.role) ? [] : [`label ${ROLE_LABEL} must be one of ${ROLES.join(", ")}`]) },
  { rule: "E2", check: (s) => (s.role === "app" && s.build === null ? ["an app is built from source: add build"] : []) },
  { rule: "E3", check: (s, stubbed) => (isRole(s.role) && LONG_RUNNING.includes(s.role) && !stubbed.includes(s.name) && !healthy(s) ? [`a ${s.role} needs a healthcheck with a test`] : []) },
  { rule: "E4", check: (s) => s.ports.filter((p) => p.published !== null).map((p) => `port ${p.target} is published on host port ${p.published}: leave the host port to the engine`) },
  {
    rule: "E5",
    check: (s) =>
      s.volumes.flatMap((v) => {
        if (v.type === "volume" && v.source === null) return [`the volume at ${v.target} has no name`];
        if (v.type === "bind" && !v.read_only) return [`the bind mount at ${v.target} is writable: make it read_only`];
        return [];
      }),
  },
  { rule: "E6", check: (s) => (s.image !== null && s.build === null && !s.image.includes(PINNED) ? [`image ${s.image} is not pinned by digest (${PINNED})`] : []) },
  { rule: "E7", check: (s) => (s.role === "data" && !s.profiles.includes(DATA_PROFILE) ? [`a data service runs only under the ${DATA_PROFILE} profile`] : []) },
];

function xPicketMessages(model: EnvModel): string[] {
  const block = model.picket;
  if (block === null) return [`${X_PICKET} is missing`];
  const messages: string[] = [];
  if (block.version !== 1) messages.push(`${X_PICKET}.version must be 1`);
  for (const key of block.unknown_keys) messages.push(`${X_PICKET}.${key} is not a known key`);
  for (const [name, { address }] of Object.entries(block.shared)) {
    if (!ADDRESS_VARIABLE.test(address)) messages.push(`${X_PICKET}.shared.${name}.address must name a variable, such as PICKET_SHARED_${name.toUpperCase()}`);
  }
  return messages;
}

const MODEL_RULE = "E8";
const BROWSER_RULE = "E15";
const PLAYWRIGHT_TAG = `:v${PLAYWRIGHT_VERSION}-`;

function browserMessages(service: EnvService, first: EnvService): string[] {
  const second = service === first ? [] : [`${first.name} is the browser service already: keep one`];
  if (service.build !== null) return [...second, "a browser service runs the Playwright image, not a build: remove build"];
  const tagged = service.image === null || service.image.includes(PLAYWRIGHT_TAG);
  return [...second, ...(tagged ? [] : [`image ${service.image} is not Playwright v${PLAYWRIGHT_VERSION}: use mcr.microsoft.com/playwright${PLAYWRIGHT_TAG}<distro> pinned by digest`])];
}

function browserFindings(model: EnvModel): Finding[] {
  const browsers = model.services.filter((service) => service.role === BROWSER_ROLE);
  return browsers.flatMap((service) => browserMessages(service, browsers[0]).map((message) => error(BROWSER_RULE, service.name, message)));
}

function error(rule: string, service: string | null, message: string): Finding {
  return { rule, service, level: "error", message };
}

export function staticFindings(model: EnvModel, stubbed: readonly string[] = []): Finding[] {
  const serviceFindings = SERVICE_RULES.flatMap(({ rule, check }) => model.services.flatMap((service) => check(service, stubbed).map((message) => error(rule, service.name, message))));
  return [...serviceFindings, ...browserFindings(model), ...xPicketMessages(model).map((message) => error(MODEL_RULE, null, message))];
}

export function hasError(findings: Finding[]): boolean {
  return findings.some((finding) => finding.level === "error");
}
