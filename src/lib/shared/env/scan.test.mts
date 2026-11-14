import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { cpSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { scanUmbrella, type ScannedEntry } from "./scan.mts";

const UMBRELLA = resolve("test/fixtures/env/umbrella");
const SECRETS = ["fixture-secret-1", "fixture-secret-2", "fixture-secret-3"];

function entry(key: string): ScannedEntry {
  const found = scanUmbrella(UMBRELLA).entries.find((e) => e.key === key);
  assert.ok(found, key);
  return found;
}

test("the fixture scans into billing, legacy and orders with their runtimes and defaults (T-3.3)", () => {
  assert.deepEqual(
    scanUmbrella(UMBRELLA).services.map((s) => [s.id, s.path, s.runtime, s.linux, s.dockerfile, s.default]),
    [
      ["S1", "services/billing", "dotnet", true, null, "write"],
      ["S2", "services/legacy", "dotnet-framework", false, null, "shared"],
      ["S3", "services/orders", "node", true, null, "write"],
    ],
  );
});

test("the fixture's address entries carry their targets, defaults and variables (T-3.3)", () => {
  assert.deepEqual(
    scanUmbrella(UMBRELLA).entries.map((e) => [e.id, e.file, e.key]),
    [
      ["C1", "services/billing/appsettings.json", "ConnectionStrings:Billing"],
      ["C2", "services/billing/appsettings.json", "Services:Orders:Url"],
      ["C3", "services/legacy/web.config", "Legacy"],
      ["C4", "services/legacy/web.config", "OrdersUrl"],
      ["C5", "services/orders/.env", "PAYMENTS_URL"],
    ],
  );
  assert.deepEqual(entry("Services:Orders:Url"), { id: "C2", service: "billing", file: "services/billing/appsettings.json", key: "Services:Orders:Url", value: "http://localhost:5080", target: { kind: "local" }, choices: ["env", "file", "keep"], default: "env", variable: "Services__Orders__Url" });
  assert.equal(entry("ConnectionStrings:Billing").default, "env");
  assert.deepEqual([entry("OrdersUrl").default, entry("OrdersUrl").target], ["file", { kind: "service", name: "orders" }]);
  assert.deepEqual([entry("Legacy").default, entry("Legacy").target], ["file", { kind: "outside", host: "db01" }]);
  assert.deepEqual([entry("PAYMENTS_URL").target, entry("PAYMENTS_URL").variable, entry("PAYMENTS_URL").service], [{ kind: "outside", host: "payments.example.com" }, "PAYMENTS_URL", "orders"]);
});

test("the scan holds no secret value and masks the connection-string password", () => {
  const text = JSON.stringify(scanUmbrella(UMBRELLA));
  for (const secret of SECRETS) assert.ok(!text.includes(secret), secret);
  assert.equal(entry("ConnectionStrings:Billing").value, "Server=localhost,1433;Database=Billing;User Id=sa;Password=***;TrustServerCertificate=True");
});

function copy(t: TestContext): string {
  const root = mkdtempSync(join(tmpdir(), "picket-scan-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  cpSync(UMBRELLA, root, { recursive: true });
  return root;
}

test("the fingerprint is stable for the same tree, ignores a changed secret, and changes with a new service", (t) => {
  const root = copy(t);
  const first = scanUmbrella(root).fingerprint;
  assert.match(first, /^[0-9a-f]{64}$/);
  assert.equal(scanUmbrella(root).fingerprint, first);
  writeFileSync(join(root, "services/orders/.env"), "PAYMENTS_URL=https://payments.example.com\nPAYMENTS_API_KEY=another\n");
  assert.equal(scanUmbrella(root).fingerprint, first);
  writeFileSync(join(root, "services/go.mod"), "module x\n");
  assert.notEqual(scanUmbrella(root).fingerprint, first);
});
