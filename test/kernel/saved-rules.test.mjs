import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { couldMatchEscalation, couldMatchPowerShellEscalation, escalationAllowRules } from "../../dist/lib/saved-rules.mjs";

function settings(dir, file, allow) {
  mkdirSync(join(dir, ".claude"), { recursive: true });
  writeFileSync(join(dir, ".claude", file), typeof allow === "string" ? allow : JSON.stringify({ permissions: { allow } }));
}

test("a saved rule could match an escalation when it allows every Bash command, starts with a wildcard, or names the marker", () => {
  for (const rule of ["Bash", "Bash(*)", "Bash(* push)", "Bash(*:*)", "Bash(PICKET_ESCALATE=*)", " Bash(PICKET_ESCALATE=x git push) ", "Bash(PICKET_*)", "Bash(P*)", "Bash(PICK:*)", "Bash(PICKET_ESCALATE=x *)"]) {
    assert.equal(couldMatchEscalation(rule), true, rule);
  }
  for (const rule of ["Bash(git push *)", "Bash(git commit *)", "Bash()", "Read(*)", "WebFetch", "Bashful(*)", "Bash(PX*)", "Bash(npm:*)", "Bash(PICKET_X*)"]) {
    assert.equal(couldMatchEscalation(rule), false, rule);
  }
});

test("a saved PowerShell rule could match an escalation when it allows everything, names the marker, or its prefix starts the command", () => {
  for (const rule of ["PowerShell", "PowerShell(*)", "PowerShell(git *)", "PowerShell($env:PICKET_ESCALATE*)", "PowerShell(GIT:*)", "PowerShell($e*)"]) {
    assert.equal(couldMatchPowerShellEscalation(rule, "git push"), true, rule);
  }
  for (const rule of ["PowerShell(picket *)", "Bash(git *)", "Bash(*)", "PowerShell(git push)", "PowerShell()", "PowerShellX(*)"]) {
    assert.equal(couldMatchPowerShellEscalation(rule, "git push"), false, rule);
  }
});

test("the saved-rule check reads PowerShell rules for a PowerShell escalation and Bash rules otherwise", () => {
  const root = mkdtempSync(join(tmpdir(), "picket-saved-rules-"));
  const home = mkdtempSync(join(tmpdir(), "picket-saved-home-"));
  try {
    settings(root, "settings.local.json", ["PowerShell(git *)", "PowerShell(picket *)", "Bash(git *)", "Bash(*)"]);
    const file = join(root, ".claude", "settings.local.json");
    assert.deepEqual(escalationAllowRules({ root, home, tool: "PowerShell", command: "git push" }), [{ rule: "PowerShell(git *)", file }]);
    assert.deepEqual(escalationAllowRules({ root, home }), [{ rule: "Bash(*)", file }]);
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(home, { recursive: true, force: true });
  }
});

test("the rules are read from the user settings and both project settings files, and a missing or broken file adds none", () => {
  const root = mkdtempSync(join(tmpdir(), "picket-saved-rules-"));
  const home = mkdtempSync(join(tmpdir(), "picket-saved-home-"));
  try {
    assert.deepEqual(escalationAllowRules({ root, home }), []);
    settings(home, "settings.json", ["Bash"]);
    settings(root, "settings.json", ["Bash(git status)", "Read(*)"]);
    settings(root, "settings.local.json", ["Bash(PICKET_ESCALATE=*)", 7]);
    assert.deepEqual(escalationAllowRules({ root, home }), [
      { rule: "Bash", file: join(home, ".claude", "settings.json") },
      { rule: "Bash(PICKET_ESCALATE=*)", file: join(root, ".claude", "settings.local.json") },
    ]);
    settings(root, "settings.local.json", "{ not json");
    assert.deepEqual(escalationAllowRules({ root, home }), [{ rule: "Bash", file: join(home, ".claude", "settings.json") }]);
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(home, { recursive: true, force: true });
  }
});
