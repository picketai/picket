import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { couldMatchEscalation, escalationAllowRules } from "../../core/lib/saved-rules.mjs";

function settings(dir, file, allow) {
  mkdirSync(join(dir, ".claude"), { recursive: true });
  writeFileSync(join(dir, ".claude", file), typeof allow === "string" ? allow : JSON.stringify({ permissions: { allow } }));
}

test("a saved rule could match an escalation when it allows every Bash command, starts with a wildcard, or names the marker", () => {
  for (const rule of ["Bash", "Bash(*)", "Bash(* push)", "Bash(*:*)", "Bash(PICKET_ESCALATE=*)", " Bash(PICKET_ESCALATE=x git push) "]) {
    assert.equal(couldMatchEscalation(rule), true, rule);
  }
  for (const rule of ["Bash(git push *)", "Bash(git commit *)", "Bash()", "Read(*)", "WebFetch", "Bashful(*)"]) {
    assert.equal(couldMatchEscalation(rule), false, rule);
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
