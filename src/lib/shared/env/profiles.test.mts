import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { dotnetVariable, PROFILES, profileFor, upperSnake } from "./profiles.mts";
import { scanUmbrella } from "./scan.mts";

function umbrella(t: TestContext, files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "picket-profiles-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  return root;
}

test("a library .csproj on the plain SDK is dotnet with default ignore (T-3.4)", (t) => {
  const root = umbrella(t, { "lib/Lib.csproj": '<Project Sdk="Microsoft.NET.Sdk"><PropertyGroup><TargetFramework>net8.0</TargetFramework></PropertyGroup></Project>' });
  const [service] = scanUmbrella(root).services;
  assert.deepEqual(service, { id: "S1", path: "lib", name: "lib", runtime: "dotnet", linux: true, dockerfile: null, choices: ["write", "user", "shared", "ignore"], default: "ignore" });
});

test("a console .csproj with OutputType Exe is a dotnet service with default write", (t) => {
  const root = umbrella(t, { "worker/Worker.csproj": '<Project Sdk="Microsoft.NET.Sdk"><PropertyGroup><OutputType>Exe</OutputType></PropertyGroup></Project>' });
  assert.equal(scanUmbrella(root).services[0].default, "write");
});

test("a folder with go.mod is runtime go with default user (T-3.4)", (t) => {
  const root = umbrella(t, { "stock/go.mod": "module stock\n" });
  assert.deepEqual(scanUmbrella(root).services, [{ id: "S1", path: "stock", name: "stock", runtime: "go", linux: true, dockerfile: null, choices: ["user", "shared", "ignore"], default: "user" }]);
});

test("a package.json inside a node service folder is folded into it (T-3.4)", (t) => {
  const root = umbrella(t, { "web/package.json": "{}", "web/packages/ui/package.json": "{}" });
  assert.deepEqual(
    scanUmbrella(root).services.map((s) => s.path),
    ["web"],
  );
});

test("a Dockerfile in the folder offers use first and makes it the default", (t) => {
  const root = umbrella(t, { "web/package.json": "{}", "web/Dockerfile": "FROM scratch\n" });
  const [service] = scanUmbrella(root).services;
  assert.deepEqual([service.runtime, service.dockerfile, service.choices, service.default], ["node", "web/Dockerfile", ["use", "write", "user", "shared", "ignore"], "use"]);
});

test("a Dockerfile with no other marker is runtime container; a framework project is not Linux and defaults to shared", (t) => {
  const root = umbrella(t, { "proxy/Dockerfile": "FROM scratch\n", "old/Old.csproj": "<Project><PropertyGroup><TargetFrameworkVersion>v4.8</TargetFrameworkVersion></PropertyGroup></Project>" });
  const [old, proxy] = scanUmbrella(root).services;
  assert.deepEqual([old.runtime, old.linux, old.default], ["dotnet-framework", false, "shared"]);
  assert.deepEqual([proxy.runtime, proxy.default, proxy.choices], ["container", "use", ["use", "user", "shared", "ignore"]]);
});

test("skipped folders are not walked", (t) => {
  const root = umbrella(t, { "node_modules/x/package.json": "{}", "bin/go.mod": "", ".picket/env/docker/a/Dockerfile": "", "work/item/package.json": "{}" });
  assert.deepEqual(scanUmbrella(root).services, []);
});

test("variable names: dotnet keeps case with __, other rows are upper snake case", () => {
  assert.equal(dotnetVariable("Services:Orders:Url"), "Services__Orders__Url");
  assert.equal(upperSnake("orders.baseUrl"), "ORDERS_BASE_URL");
  assert.equal(upperSnake("payments-url"), "PAYMENTS_URL");
});

test("only dotnet and node carry a Picket-written Dockerfile step", () => {
  assert.deepEqual(
    PROFILES.filter((p) => p.dockerfileStep !== null).map((p) => p.name),
    ["dotnet", "node"],
  );
  assert.equal(profileFor(["README.md"], () => ""), null);
});
