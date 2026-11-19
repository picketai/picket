import { test } from "node:test";
import assert from "node:assert/strict";
import { maskConnection, readTarget } from "./connection.mts";

const SQL_SERVER = "Server=tcp:sql01,1433;Database=orders_test;User Id=qa;Password=s3cret";
const POSTGRES = "postgresql://qa:s3cret@db.test:5432/orders_test";

test("the key=value and URL forms each give one server and one database (T-1.1)", () => {
  assert.deepEqual(readTarget("Data Source=DB01\\SQL2016;Initial Catalog=ShopTest;Integrated Security=True"), { target: { server: "DB01\\SQL2016", database: "ShopTest" } });
  assert.deepEqual(readTarget("Server=tcp:db01.corp,1433;Database=ShopTest;User Id=qa;Password=x"), { target: { server: "tcp:db01.corp,1433", database: "ShopTest" } });
  assert.deepEqual(readTarget("postgres://qa:pw@db01:5432/shop"), { target: { server: "db01:5432", database: "shop" } });
});

test("keys are read in any case and under their other names, with a trailing separator allowed", () => {
  assert.deepEqual(readTarget("DATA SOURCE=sql02;Initial Catalog=billing;pwd=x;"), { target: { server: "sql02", database: "billing" } });
  assert.deepEqual(readTarget("host=db;dbname=shop"), { target: { server: "db", database: "shop" } });
  assert.deepEqual(readTarget("Address=db;DATABASE=shop"), { target: { server: "db", database: "shop" } });
});

test("an ambiguous, incomplete or unknown form is a problem with no target, and never quotes the string (T-1.2)", () => {
  const refused = [
    "Server=db01;Database=ShopTest;Data Source=prod01",
    "Server=db01;Database=ShopTest;Server=db01",
    "jdbc:sqlserver://db01:1433;databaseName=ShopTest",
    "host=db01 port=5432 dbname=shop",
    "Server=db01;Password=s3cret",
    "Server=db01;Password=\"a;Database=prod\";Database=ShopTest",
    "mysql://db.test/",
    "orders",
    "",
  ];
  for (const text of refused) {
    const read = readTarget(text);
    assert.ok("problem" in read && !("target" in read), text);
    assert.ok(!read.problem.includes("s3cret") && !read.problem.includes("db01") && !read.problem.includes("prod"), read.problem);
  }
});

test("each problem names what is missing or repeated", () => {
  assert.deepEqual(readTarget("Server=db01;Database=ShopTest;Data Source=prod01"), { problem: "it names the server more than once (server, data source, address, addr, host)" });
  assert.deepEqual(readTarget("Server=db01;Initial Catalog=a;Database=a"), { problem: "it names the database more than once (database, initial catalog, dbname)" });
  assert.deepEqual(readTarget("Server=db01;Password=s3cret"), { problem: "it names no database" });
  assert.deepEqual(readTarget("Database=shop;Server="), { problem: "it names no server" });
  assert.deepEqual(readTarget("mysql://db.test/"), { problem: "it names no database" });
  assert.deepEqual(readTarget("orders"), { problem: "it is neither a URL (scheme://host/database) nor key=value pairs separated by ;" });
});

test("the whole string and its password are masked wherever they appear (T-8.4)", () => {
  const stderr = `login failed for '${SQL_SERVER}'; password s3cret rejected`;
  const masked = maskConnection(stderr, SQL_SERVER);
  assert.equal(masked, "login failed for '***'; password *** rejected");
  assert.equal(maskConnection("auth s3cret failed", POSTGRES), "auth *** failed");
  assert.equal(maskConnection("PWD rejected", "Server=a;pwd=PWD"), "*** rejected");
  assert.equal(maskConnection("plain text", ""), "plain text");
});
