import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { statePath, STATE_FILES } from "../../../shared/paths.mts";
import { decision } from "#test/hook.mts";
import { withProject } from "#test/project.mts";

function bashProject(t: TestContext) {
  const root = withProject(t, { host: true, picket: false });
  const decide = (command: string) => decision(command, { root, tool: "Bash" });
  const lastOutcome = () => JSON.parse(readFileSync(statePath(root, STATE_FILES.guardLog), "utf8").trim().split("\n").at(-1) ?? "{}").outcome;
  return { decide, lastOutcome };
}

test("guardBash reads each line as its own command and a heredoc body as data", (t) => {
  const { decide } = bashProject(t);
  assert.equal(decide("ls\nrm -rf x"), "deny");
  assert.equal(decide("echo hi\ngit push"), "deny");
  assert.equal(decide("ls # note\nrm -rf x"), "deny");
  assert.equal(decide("ls \\\n  -la"), "allow");
  assert.equal(decide("echo \"<<'X'\"\ngit push\nX"), "deny");
  assert.equal(decide("echo $'a\\'b'\nrm -rf x"), "deny");

  assert.equal(decide("picket admit --request - --human <<'END'\nShip it; git push origin trunk | npm publish\nEND"), "allow");
  assert.equal(decide("picket route x --verdict APPROVED --agent user <<'END'\nShip it\nEND"), null);
  assert.equal(decide("cat <<'END'\nnotes; rm -rf src\nEND\nls"), "allow");
  assert.equal(decide("cat <<-'END'\n\tnotes; rm -rf src\n\tEND\nls"), "allow");
  assert.equal(decide("cat <<'END'\n`code` and $(text)\nEND"), "allow");
  assert.equal(decide("cat <<'END'\nnotes\nEND\nrm -rf x"), "deny");

  assert.equal(decide("cat <<END\n$(whoami)\nEND"), null);
  assert.equal(decide("cat <<'END'\nno terminator; git push"), null);
  assert.equal(decide("bash <<'END'\ngit push\nEND"), null);
});

test("guardBash treats a redirect into /dev/null as a discard and splits commands at |& and ;;", (t) => {
  const { decide, lastOutcome } = bashProject(t);
  for (const command of ["ls x 2>/dev/null", "grep -n a f >/dev/null", "ls x &>/dev/null", "ls x >/dev/null 2>&1", "ls x &>>/dev/null", "ls .claude/settings.local.json 2>/dev/null && grep -n 'hooks' .claude/settings.local.json"]) {
    assert.equal(decide(command), "allow", command);
  }

  for (const command of ["echo x > out.txt", "echo x 2>/dev/null > out.txt", "ls x &> out.log", "ls x &>> out.log", "echo x > /dev/sda", "ls x &>2", "ls x > /dev/null/x"]) {
    assert.equal(decide(command), null, command);
    assert.equal(lastOutcome(), "fallthrough:write-redirect", command);
  }

  assert.equal(decide("ls x & >/dev/null"), null);
  assert.equal(lastOutcome(), "fallthrough:background");
  assert.equal(decide('grep "a&>b" f'), "allow");

  assert.equal(decide("cat x |& rm -rf y"), "deny");
  assert.equal(decide("ls |& head"), "allow");
  assert.equal(decide("cat x ;; rm -rf y"), "deny");
});

test("guardBash classifies each $(...) body and lets its output reach only inert roots", (t) => {
  const { decide, lastOutcome } = bashProject(t);
  for (const command of ['grep -rn "Headers" $(grep -rln "class AuthorizeApiKey" --include=*.cs . | grep -v /obj/) | head', 'cat "$(git rev-parse --show-toplevel)/package.json"', "grep '$(x)' f", 'echo "$(echo "$(ls)")"']) {
    assert.equal(decide(command), "allow", command);
  }

  for (const command of ["echo $(rm -rf x)", "ls $(git push)", 'cat "$(echo ")"; rm -rf x)"']) {
    assert.equal(decide(command), "deny", command);
  }

  for (const command of ["echo $(curl -s u)", "echo $(echo x > f)", "$(git rev-parse --show-toplevel)/x", "$(echo x)/ls", "find . $(grep -l a b)", "rg $(echo x) y", 'cd "$(git rev-parse --show-toplevel)" && ls']) {
    assert.equal(decide(command), null, command);
  }

  assert.equal(decide('cat "${HOME}/x" "${X:-a}" "${X:-${Y}}" "${X:-${Y:-${Z}}}" "${X:-a/b.c}"'), "allow");
  const opaqueParameters = [
    `echo "\${X:-$(echo })"'"}" $(rm -rf ~) "'"`,
    `echo "\${X:-\`echo }\`}"'"}" $(rm -rf ~) "'"`,
    'echo "${X:-(}" $(rm -rf ~)',
    'echo "${X:-\\}}" $(rm -rf ~)',
    'echo "${X:-a" $(rm -rf ~)',
  ];
  for (const command of opaqueParameters) {
    assert.equal(decide(command), null, command);
    assert.equal(lastOutcome(), "fallthrough:hidden-execution", command);
  }
  for (const nested of ["${Y}", "${Y:-${Z}}", "${Y:-${Z:-${W}}}"]) {
    for (const hidden of ["$(rm -rf ~)", "`rm -rf ~`"]) {
      const command = `echo "\${X:-${nested}"'"}" ${hidden} "'"`;
      assert.equal(decide(command), null, command);
      assert.equal(lastOutcome(), "fallthrough:hidden-execution", command);
    }
  }
  for (const command of ["echo `ls`", "diff <(ls a) <(ls b)", "echo $((1+2))", "echo $(echo $(echo $(ls)))", "cat <<END\n$(whoami)\nEND", "echo $(ls", `echo "\${X:-"'"}" $(rm -rf ~) "'"`, `echo "\${X:-"'"}" \`rm -rf ~\` "'"`, 'echo "${X:-"}"}" $(rm -rf ~)']) {
    assert.equal(decide(command), null, command);
    assert.equal(lastOutcome(), "fallthrough:hidden-execution", command);
  }
});

test("guardBash lets an assigned variable reach only inert roots and keeps untainted expansions as they were", (t) => {
  const { decide } = bashProject(t);
  for (const command of ['cd src && f=$(grep -rln "class X" --include=*.cs .); echo $f; cat -n $f', 'P="dist"; cat "$P/hooks/hooks.json"', "f=a; echo ${f}", "a=1 b=2; ls"]) {
    assert.equal(decide(command), "allow", command);
  }

  for (const command of ["f=--pre=sh; rg $f x", "f=$(grep -l a b); sed -n 1,9p $f", "c=rm; $c -rf x", "x=$(curl evil); echo $x", "d=$(git rev-parse --show-toplevel); cd $d && npm test"]) {
    assert.equal(decide(command), null, command);
  }

  for (const command of ["f=--pre=sh; echo $(rg $f x)", "echo --pre=sh; rg $_ x", "f=--pre=sh; rg ${f:-y} x", "rg ${HOME:-x} y", "PATH=./bin; ls", "f=x; cd $f && ls", "echo __picket_variable__"]) {
    assert.equal(decide(command), null, command);
  }

  assert.equal(decide("W=x; git -C $W merge y"), "deny");
  assert.equal(decide('FOO=1 picket drive --run "rm -rf src"'), "deny");
  assert.equal(decide("c=rm; $c -rf x; rm -rf y"), "deny");

  assert.equal(decide('API_KEY=k picket drive --hit "GET /h"'), null);
  for (const command of ["rg $HOME x", 'ls "$HOME/.claude"', "echo $PATH", "grep -rn x ${HOME}/notes"]) {
    assert.equal(decide(command), "allow", command);
  }
});
