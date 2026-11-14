import { test } from "node:test";
import assert from "node:assert/strict";
import { configFormat, isAddressLike, masked, readConfigFile } from "./config-entries.mts";

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
