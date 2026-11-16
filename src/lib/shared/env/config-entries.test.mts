import { test } from "node:test";
import assert from "node:assert/strict";
import { configFormat, isAddressLike, isSecretName, mapSecretLeaves, masked, readConfigFile } from "./config-entries.mts";

const ADDRESS_VALUES = [
  "Server=localhost,1433;Database=Billing;User Id=sa;Password=x",
  "Data Source=db01;Initial Catalog=Legacy;Integrated Security=True",
  "Host=pg;Port=5432",
  "mongodb://user:pw@mongo:27017/db",
  "(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=ora1)(PORT=1521)))",
  "jdbc:sqlserver://db:1433;databaseName=x",
  "redis:6379",
];

test("isAddressLike holds for URLs, JDBC, host:port, address pairs and address-named keys (T-3.1)", () => {
  for (const value of ADDRESS_VALUES) assert.equal(isAddressLike("Value", value), true, value);
  assert.equal(isAddressLike("PAYMENTS_URL", "https://payments.example.com"), true);
  assert.equal(isAddressLike("Billing:Dsn", "billing"), true);
});

test("isAddressLike is false for plain settings, a clock time and an empty address key (T-3.1)", () => {
  assert.equal(isAddressLike("Logging:LogLevel:Default", "Information"), false);
  assert.equal(isAddressLike("Time", "12:30"), false);
  assert.equal(isAddressLike("ORDERS_URL", ""), false);
  assert.equal(isAddressLike("ORDERS_URL", null), false);
});

test("masked hides connection-string, JDBC and URL passwords and whole secret-named values (T-3.2)", () => {
  assert.equal(masked("ConnectionStrings:Billing", "Server=localhost,1433;Database=Billing;User Id=sa;Password=fixture"), "Server=localhost,1433;Database=Billing;User Id=sa;Password=***");
  assert.equal(masked("MONGO", "mongodb://user:pw@mongo:27017/db"), "mongodb://user:***@mongo:27017/db");
  assert.equal(masked("Jdbc", "jdbc:sqlserver://db:1433;databaseName=x;password=fixture"), "jdbc:sqlserver://db:1433;databaseName=x;password=***");
  assert.equal(masked("Payments:ApiKey", "abc123"), "***");
  assert.equal(masked("PAYMENTS_API_KEY", "abc123"), "***");
  assert.equal(masked("Storage", "AccountEndpoint=https://x.example.com/;AccountKey=abc=="), "AccountEndpoint=https://x.example.com/;AccountKey=***");
});

test("masked hides secrets in query strings and SAS values, which isAddressLike lists", () => {
  const cases: [string, string][] = [
    ["https://pay.example.com/hook?apikey=abc123", "https://pay.example.com/hook?apikey=***"],
    ["jdbc:mysql://h:3306/db?user=a&password=hunter2", "jdbc:mysql://h:3306/db?user=a&password=***"],
    ["redis://h:6379?password=zzz", "redis://h:6379?password=***"],
    ["Endpoint=sb://bus.example.com/;SharedAccessSignature=sv=2020&sig=SECRETSIG", "Endpoint=sb://bus.example.com/;SharedAccessSignature=***"],
    ["https://blob.example.com/c?sv=2020&sig=SECRETSIG", "https://blob.example.com/c?sv=2020&sig=***"],
    ["https://fn.example.com/api/run?code=FUNCKEY", "https://fn.example.com/api/run?code=***"],
  ];
  for (const [value, expected] of cases) {
    assert.equal(isAddressLike("Value", value), true, value);
    assert.equal(masked("Value", value), expected, value);
  }
});

test("masked hides any pair whose name contains a secret word, after earlier plain pairs", () => {
  const cases: [string, string][] = [
    ["https://a.example.com/x?api_key=K1", "https://a.example.com/x?api_key=***"],
    ["https://a.example.com/x?access_token=K2", "https://a.example.com/x?access_token=***"],
    ["https://a.example.com/x?client_secret=K3", "https://a.example.com/x?client_secret=***"],
    ["https://s3.example.com/b/o?X-Amz-Date=20261114&X-Amz-Signature=K4", "https://s3.example.com/b/o?X-Amz-Date=20261114&X-Amz-Signature=***"],
    ["jdbc:postgresql://h/db?user=a&sslpassword=K5", "jdbc:postgresql://h/db?user=a&sslpassword=***"],
    ["Server=db;Api Key=K6;Database=x", "Server=db;Api Key=***;Database=x"],
  ];
  for (const [value, expected] of cases) {
    assert.equal(isAddressLike("Value", value), true, value);
    assert.equal(masked("Value", value), expected, value);
  }
});

test("isSecretName passes ordinary code compounds and still matches secret code names (T-1.1)", () => {
  for (const name of ["countryCode", "postalCode", "statusCode", "zipCode", "country_code", "STATUS-CODE"]) assert.equal(isSecretName(name), false, name);
  for (const name of ["authCode", "passcode", "code", "auth_code", "code_verifier", "user_code", "x-code", "countryCodeAuthCode"]) assert.equal(isSecretName(name), true, name);
});

test("masked keeps an ordinary code pair and hides a bare code pair in the same URL (T-1.4)", () => {
  assert.equal(masked("Url", "https://a.example.com/x?countryCode=DE&code=FUNCKEY"), "https://a.example.com/x?countryCode=DE&code=***");
});

test("mapSecretLeaves maps every string or number below a secret key with the nearest secret key, and keeps the rest", () => {
  const value = { secret: { value: "a", n: 1, flag: true, none: null }, sku: "b", list: [{ token: "c" }], password: { apiKey: ["d"] } };
  assert.deepEqual(mapSecretLeaves(value, (leaf, key) => `${key}:${leaf}`), {
    secret: { value: "secret:a", n: "secret:1", flag: true, none: null },
    sku: "b",
    list: [{ token: "token:c" }],
    password: { apiKey: ["apiKey:d"] },
  });
});

test("mapSecretLeaves leaves a value without secret keys as it is", () => {
  assert.deepEqual(mapSecretLeaves([{ sku: "a", n: 2 }, "free", 3], () => "***"), [{ sku: "a", n: 2 }, "free", 3]);
});

test("masked leaves values without secrets as they are and keeps null", () => {
  assert.equal(masked("ORDERS_URL", "http://orders:8080"), "http://orders:8080");
  assert.equal(masked("Legacy", "Data Source=db01;Integrated Security=True"), "Data Source=db01;Integrated Security=True");
  assert.equal(masked("ORDERS_URL", null), null);
});

test("JSON settings flatten to colon keys and keep only string values", () => {
  const text = '{ "Services": { "Orders": { "Url": "http://orders" } }, "Retries": 3, // comment\n "Hosts": ["a:1"] }';
  assert.deepEqual(readConfigFile("svc/appsettings.json", text), [
    { file: "svc/appsettings.json", format: "json", key: "Services:Orders:Url", value: "http://orders", address: true },
    { file: "svc/appsettings.json", format: "json", key: "Hosts:0", value: "a:1", address: true },
  ]);
});

test(".NET XML reads appSettings key/value and connectionStrings name/connectionString", () => {
  const text = '<configuration><appSettings><add key="OrdersUrl" value="http://orders/" /></appSettings><connectionStrings><add connectionString="Data Source=db01" name="Legacy" /></connectionStrings></configuration>';
  assert.deepEqual(readConfigFile("web.config", text), [
    { file: "web.config", format: "xml", key: "OrdersUrl", value: "http://orders/", address: true },
    { file: "web.config", format: "xml", key: "Legacy", value: "Data Source=db01", address: true },
  ]);
});

test("dotenv and properties read key=value lines, skipping comments and unquoting", () => {
  assert.deepEqual(readConfigFile(".env", '# note\nexport ORDERS_URL="http://orders"\nEMPTY=\n'), [
    { file: ".env", format: "dotenv", key: "ORDERS_URL", value: "http://orders", address: true },
    { file: ".env", format: "dotenv", key: "EMPTY", value: "", address: false },
  ]);
  assert.deepEqual(readConfigFile("app.properties", "! note\norders.url: http://orders\n"), [{ file: "app.properties", format: "properties", key: "orders.url", value: "http://orders", address: true }]);
});

test("other configuration-named files are one unread entry, and unrelated files are not configuration", () => {
  assert.deepEqual(readConfigFile("svc/application.yaml", "server: x"), [{ file: "svc/application.yaml", format: "unread", key: null, value: null, address: false }]);
  assert.equal(configFormat("package.json"), null);
  assert.equal(configFormat("docker-compose.yml"), null);
  assert.equal(configFormat("settings.toml"), "unread");
  assert.equal(configFormat(".env.local"), "dotenv");
});
