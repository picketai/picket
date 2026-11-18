import { test } from "node:test";
import assert from "node:assert/strict";
import { connectionTarget, maskConnection } from "./connection.mts";

const SQL_SERVER = "Server=tcp:sql01,1433;Database=orders_test;User Id=qa;Password=s3cret";
const POSTGRES = "postgresql://qa:s3cret@db.test:5432/orders_test";

test("server and database come from key=value pairs, a URL, or read as unknown (T-8.3)", () => {
  assert.deepEqual(connectionTarget(SQL_SERVER), { server: "tcp:sql01,1433", database: "orders_test" });
  assert.deepEqual(connectionTarget(POSTGRES), { server: "db.test:5432", database: "orders_test" });
  assert.deepEqual(connectionTarget("orders"), { server: "unknown", database: "unknown" });
});

test("keys are read in any case and under their other names", () => {
  assert.deepEqual(connectionTarget("DATA SOURCE=sql02;Initial Catalog=billing;pwd=x"), { server: "sql02", database: "billing" });
  assert.deepEqual(connectionTarget("host=db;dbname=shop"), { server: "db", database: "shop" });
  assert.deepEqual(connectionTarget("mysql://db.test/"), { server: "db.test", database: "unknown" });
});

test("the whole string and its password are masked wherever they appear (T-8.4)", () => {
  const stderr = `login failed for '${SQL_SERVER}'; password s3cret rejected`;
  const masked = maskConnection(stderr, SQL_SERVER);
  assert.equal(masked, "login failed for '***'; password *** rejected");
  assert.equal(maskConnection("auth s3cret failed", POSTGRES), "auth *** failed");
  assert.equal(maskConnection("PWD rejected", "Server=a;pwd=PWD"), "*** rejected");
  assert.equal(maskConnection("plain text", ""), "plain text");
});
