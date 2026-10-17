import { test } from "node:test";
import assert from "node:assert/strict";
import { canonicalRoot, readPowerShell } from "../../core/lib/powershell-text.mjs";

const segments = (text) => readPowerShell(text)?.segments ?? null;

test("statements split at ; && || | and newline, and quotes keep their separators", () => {
  assert.deepEqual(segments("Remove-Item -Recurse -Force build; git status"), [["Remove-Item", "-Recurse", "-Force", "build"], ["git", "status"]]);
  assert.deepEqual(segments("echo 'a; rm b'"), [["echo", "a; rm b"]]);
  assert.deepEqual(segments("git status && git push"), [["git", "status"], ["git", "push"]]);
  assert.deepEqual(segments("git status || git push"), [["git", "status"], ["git", "push"]]);
  assert.deepEqual(segments("Get-ChildItem\ngit push"), [["Get-ChildItem"], ["git", "push"]]);
  assert.deepEqual(segments('echo "a | b" | Select-String a'), [["echo", "a | b"], ["Select-String", "a"]]);
});

test("a script block and a subexpression open statements of their own", () => {
  const piped = segments("Get-ChildItem | ForEach-Object { Remove-Item $_ }");
  assert.ok(piped.some((seg) => seg[0] === "Remove-Item"), JSON.stringify(piped));
  const reading = readPowerShell("echo $(git push)");
  assert.deepEqual(reading.segments, [["echo"], ["git", "push"]]);
  assert.equal(reading.hiddenExecution, true);
  assert.equal(readPowerShell("echo @(1, 2)").hiddenExecution, true);
  assert.equal(readPowerShell('echo "now $(Get-Date)"').hiddenExecution, true);
  assert.equal(readPowerShell("echo '$(Get-Date)'").hiddenExecution, false);
});

test("the call and dot-source operators drop away before a literal root and hide a computed one", () => {
  assert.deepEqual(segments("& 'git' push"), [["git", "push"]]);
  assert.deepEqual(segments("& git push"), [["git", "push"]]);
  assert.deepEqual(segments(". ./build.ps1"), [["build.ps1"]]);
  assert.equal(readPowerShell("& $cmd push").hiddenExecution, true);
  assert.equal(readPowerShell("& { git push }").hiddenExecution, true);
  assert.equal(readPowerShell("& ('Remove' + '-Item') x").hiddenExecution, true);
});

test("aliases and casing resolve to one canonical root, and paths and .exe are stripped", () => {
  for (const alias of ["RM", "del", "rd", "ri", "erase", "rmdir", "Remove-Item"]) assert.deepEqual(segments(`${alias} x`), [["Remove-Item", "x"]], alias);
  assert.equal(canonicalRoot("kill"), "Stop-Process");
  assert.equal(canonicalRoot("Set-Location"), "cd");
  assert.equal(canonicalRoot("gc"), "Get-Content");
  assert.equal(canonicalRoot("GIT"), "git");
  assert.equal(canonicalRoot("C:\\Program Files\\Git\\cmd\\git.exe"), "git");
});

test("quotes, escapes, here-strings and comments read as PowerShell reads them", () => {
  assert.deepEqual(segments("echo 'it''s'"), [["echo", "it's"]]);
  assert.deepEqual(segments('echo "say ""hi"" `"now`""'), [["echo", 'say "hi" "now"']]);
  assert.deepEqual(segments("echo a`;b"), [["echo", "a;b"]]);
  assert.deepEqual(segments("git `\n  status"), [["git", "status"]]);
  assert.deepEqual(segments("echo @'\nline; rm -rf x\n'@\ngit status"), [["echo", "line; rm -rf x"], ["git", "status"]]);
  assert.deepEqual(segments("git status # ; rm x\nls"), [["git", "status"], ["Get-ChildItem"]]);
  assert.deepEqual(segments("<# rm x; #> git status"), [["git", "status"]]);
  assert.deepEqual(segments("echo ${env:HOME}"), [["echo", "${env:HOME}"]]);
});

test("unreadable text returns null", () => {
  for (const text of ['echo "x', "echo 'x", "echo @'\nno end", "<# open"]) assert.equal(readPowerShell(text), null, text);
});

test("redirects record their target, $null discards, and stream merging is plumbing", () => {
  const written = readPowerShell("echo x > out.txt; echo y 2>> err.log; echo z *> all.log");
  assert.deepEqual(written.segments, [["echo", "x"], ["echo", "y"], ["echo", "z"]]);
  assert.equal(written.sawWriteRedirect, true);
  assert.deepEqual(written.redirectTargets, ["out.txt", "err.log", "all.log"]);
  const discarded = readPowerShell("git status 2>&1 > $null");
  assert.equal(discarded.sawWriteRedirect, false);
  assert.deepEqual(discarded.segments, [["git", "status"]]);
  assert.deepEqual(readPowerShell("echo x >").redirectTargets, [null]);
});

test("a leading escalation statement folds into the one command after it as a marker assignment", () => {
  assert.deepEqual(segments('$env:PICKET_ESCALATE = "you asked for the tag"; git push origin v1'), [["PICKET_ESCALATE=you asked for the tag", "git", "push", "origin", "v1"]]);
  assert.deepEqual(segments("$ENV:PICKET_ESCALATE='it''s the tag';git push"), [["PICKET_ESCALATE=it's the tag", "git", "push"]]);
  assert.deepEqual(segments('git status; $env:PICKET_ESCALATE = "x"; git push'), [["git", "status"], ["PICKET_ESCALATE=x"], ["git", "push"]]);
  assert.deepEqual(segments('$env:PICKET_ESCALATE = "x"; git status; git push'), [["PICKET_ESCALATE=x"], ["git", "status"], ["git", "push"]]);
  assert.deepEqual(segments('$env:PICKET_ESCALATE = "x"; git push | Out-Null'), [["PICKET_ESCALATE=x"], ["git", "push"], ["out-null"]]);
  assert.deepEqual(segments('$env:PICKET_ESCALATE = "x"\ngit push'), [["PICKET_ESCALATE=x"], ["git", "push"]]);
  assert.deepEqual(segments("$env:PICKET_ESCALATE = $why; git push"), [["$why"], ["git", "push"]]);
  assert.deepEqual(segments('$env:picket_escalate = "x"; git push'), [["x"], ["git", "push"]]);
});

test("an assignment statement is read as the command on its right-hand side", () => {
  for (const text of ["$r = git push origin main 2>&1", "$r=git push origin main", "$r= git push origin main", "$r =git push origin main", "[string]$r = git push origin main", "$a = $b = git push origin main", "$log += git push origin main"]) {
    assert.deepEqual(segments(text), [["git", "push", "origin", "main"]], text);
  }
  assert.deepEqual(segments("$null = Remove-Item -Recurse -Force build"), [["Remove-Item", "-Recurse", "-Force", "build"]]);
  assert.deepEqual(segments("$x -eq 1"), [["$x", "-eq", "1"]]);
});

test("curly quotes delimit strings as PowerShell reads them", () => {
  assert.deepEqual(segments("echo 'a’; Remove-Item -Recurse x; echo ‘b'"), [["echo", "a"], ["Remove-Item", "-Recurse", "x"], ["echo", "b"]]);
  assert.deepEqual(segments("echo “a; b”"), [["echo", "a; b"]]);
});

test("a trailing & runs in the background", () => {
  const reading = readPowerShell("npm start &");
  assert.equal(reading.sawBackground, true);
  assert.deepEqual(reading.segments, [["npm", "start"]]);
});
