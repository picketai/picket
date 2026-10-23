import { test } from "node:test";
import assert from "node:assert/strict";
import { securityPathOf } from "./security-paths.mts";

const CONFIGURED = ["src/auth/", "src/payments/**", "src/pay", "Authentication/", "./src/crypto/*"];

const CASES: [string, string | null][] = [
  ["src/auth/token.ts", "src/auth/"],
  ["src/authz/rule.ts", null],
  ["src\\auth\\token.ts", "src/auth/"],
  ["lib/src/auth/token.ts", null],
  ["src/payments/charge.ts", "src/payments/**"],
  ["src/payment-ui/button.tsx", null],
  ["src/pay/refund.ts", "src/pay"],
  ["./src/crypto/aes.ts", "./src/crypto/*"],
  ["Authentication/Handler.cs", "Authentication/"],
  ["src/Api/Authentication/Handler.cs", "Authentication/"],
  ["src/Api/MyAuthentication/Handler.cs", null],
  ["src/Api/Authentication.cs", null],
];

for (const [path, expected] of CASES) {
  test(`securityPathOf(${path}) gives ${expected}`, () => {
    assert.equal(securityPathOf(path, CONFIGURED), expected);
  });
}
