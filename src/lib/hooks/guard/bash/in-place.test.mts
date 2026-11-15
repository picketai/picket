import { test } from "node:test";
import assert from "node:assert/strict";
import { inPlaceTargets } from "./in-place.mts";

const words = (command: string) => command.split(" ");

test("perl and ruby with an -i cluster write their file operands", () => {
  assert.deepEqual(inPlaceTargets(["perl", "-pi", "-e", "s/a/b/", "src/a.ts"], []), ["src/a.ts"]);
  assert.deepEqual(inPlaceTargets(["perl", "-i.bak", "-pe", "s/a/b/", "src/a.ts", "src/b.ts"], []), ["src/a.ts", "src/b.ts"]);
  assert.deepEqual(inPlaceTargets(words("ruby -i fix.rb src/a.rb"), []), ["src/a.rb"]);
  assert.deepEqual(inPlaceTargets(["perl", "-pe", "s/a/b/", "src/a.ts"], []), []);
  assert.deepEqual(inPlaceTargets(["perl", "-Mstrict", "-e", "print 1", "src/a.ts"], []), []);
});

test("an inline program with a write call yields its quoted literals", () => {
  assert.deepEqual(inPlaceTargets(["node", "-e", "require('fs').writeFileSync('src/a.mts', 'x')"], []), ["fs", "src/a.mts", "x"]);
  assert.deepEqual(inPlaceTargets(["python3", "-c", "open('src/a.py', 'w').write('x')"], []), ["src/a.py", "w", "x"]);
  assert.deepEqual(inPlaceTargets(["deno", "eval", "await Deno.writeFile('src/a.ts', d)"], []), ["src/a.ts"]);
  assert.deepEqual(inPlaceTargets(["ruby", "-e", "File.write('src/a.rb', 'x')"], []), ["src/a.rb", "x"]);
});

test("an attached --eval= program and a flag cluster ending in c, e or p carry the program", () => {
  assert.deepEqual(inPlaceTargets(["node", "--eval=require('fs').writeFileSync('src/a.ts','x')"], []), ["fs", "src/a.ts", "x"]);
  assert.deepEqual(inPlaceTargets(["node", "-pe", "require('fs').writeFileSync('src/a.ts','x')"], []), ["fs", "src/a.ts", "x"]);
  assert.deepEqual(inPlaceTargets(["python3", "-Bc", "open('src/a.py','w').write('x')"], []), ["src/a.py", "w", "x"]);
});

test("an inline program without a write call yields nothing", () => {
  assert.deepEqual(inPlaceTargets(["python3", "-c", "print(open('src/a.py').read())"], []), []);
  assert.deepEqual(inPlaceTargets(["python3", "-c", "open('src/a.py', 'r').read()"], []), []);
});

test("a heredoc is the program of an interpreter that names no script file", () => {
  const body = "p='src/mods/status/hooks/index.test.tsx'\ns=open(p,encoding='utf-8').read()\nopen(p,'w',encoding='utf-8').write(s.replace('a','b'))\n";
  const targets = inPlaceTargets(["python3", "-"], [body]);
  assert.ok(targets.includes("src/mods/status/hooks/index.test.tsx"), targets.join(" "));
  assert.ok(inPlaceTargets(["python3"], [body]).includes("src/mods/status/hooks/index.test.tsx"));
  assert.deepEqual(inPlaceTargets(["python3", "fix.py"], [body]), []);
  assert.deepEqual(inPlaceTargets(["node", "--test", "test/cli/close.test.mjs"], [body]), []);
});

test("a - operand after a flag value reads the heredoc, and a here-string with a write call is the program", () => {
  const body = "open('src/a.py','w').write('x')\n";
  assert.ok(inPlaceTargets(["python3", "-X", "utf8", "-"], [body]).includes("src/a.py"));
  assert.ok(inPlaceTargets(["python3", "open('src/a.py','w').write('x')"], []).includes("src/a.py"));
});

test("a Perl open with a write mode yields the path without its mode prefix (T-1.3)", () => {
  assert.deepEqual(inPlaceTargets(["perl", "-e", "open(F, '>src/a.pl')"], []), ["src/a.pl"]);
  assert.deepEqual(inPlaceTargets(["perl", "-e", "open(my $f, '+<', 'src/a.pl')"], []), ["src/a.pl"]);
});

test("a Perl two-argument open with spaces after the mode yields the path alone", () => {
  assert.deepEqual(inPlaceTargets(["perl", "-e", `open(F, ">>  src/a.pl")`], []), ["src/a.pl"]);
  assert.deepEqual(inPlaceTargets(["perl", "-e", "open(F, '+<\tsrc/a.pl')"], []), ["src/a.pl"]);
});

test("a Perl two-argument read with a space after the mode yields nothing", () => {
  assert.deepEqual(inPlaceTargets(["perl", "-e", "open(F, '< src/a.pl')"], []), []);
});

test("a Perl read, a read across two lines, a module run and a script file after a value flag yield nothing (T-1.4)", () => {
  const write = "open('src/a.py','w').write('x')\n";
  assert.deepEqual(inPlaceTargets(["perl", "-e", "open(my $f, '<', 'src/a.pl')"], []), []);
  assert.deepEqual(inPlaceTargets(["perl", "-e", "open(F, 'src/a.pl')"], []), []);
  assert.deepEqual(inPlaceTargets(["python3", "-"], ["s=open('src/a.py').read()\nprint('>')\n"]), []);
  assert.deepEqual(inPlaceTargets(["python3", "-m", "mod"], [write]), []);
  assert.deepEqual(inPlaceTargets(["node", "-r", "./x.js", "script.js"], ["require('fs').writeFileSync('src/a.ts','x')\n"]), []);
  assert.deepEqual(inPlaceTargets(["node", "--test", "test/cli/close.test.mjs"], ["require('fs').writeFileSync('src/a.ts','x')\n"]), []);
});

test("a versioned or aliased interpreter name resolves to its family (T-1.3)", () => {
  const write = "open('src/a.py','w').write('x')";
  for (const argv of [["python3.14", "-c", write], ["python3.14t", "-c", write], ["pypy3", "-c", write], ["py", "-3", "-c", write]]) {
    assert.ok(inPlaceTargets(argv, []).includes("src/a.py"), argv.join(" "));
  }
  assert.deepEqual(inPlaceTargets(words("ruby3.3 -i fix.rb src/a.rb"), []), ["src/a.rb"]);
});

test("a name that only starts with an interpreter's name is no interpreter (T-1.4)", () => {
  assert.deepEqual(inPlaceTargets(words("nodemon -e ts src/a.ts"), []), []);
  assert.deepEqual(inPlaceTargets(words("python3-config --cflags"), []), []);
  assert.deepEqual(inPlaceTargets(["pydoc"], ["open('src/a.py','w').write('x')\n"]), []);
});

test("a php, lua or R read, and a php or lua script file beside a write heredoc, yield nothing (T-2.3)", () => {
  assert.deepEqual(inPlaceTargets(["php", "-r", `echo file_get_contents("src/a.ts");`], []), []);
  assert.deepEqual(inPlaceTargets(["lua", "-e", `io.open("src/a.ts","r")`], []), []);
  assert.deepEqual(inPlaceTargets(["Rscript", "-e", `readLines("src/a.ts")`], []), []);
  assert.deepEqual(inPlaceTargets(["php", "fix.php"], ["<?php file_put_contents('src/a.ts', 'x');\n"]), []);
  assert.deepEqual(inPlaceTargets(["lua", "fix.lua"], [`io.open("src/a.ts","w"):write("x")\n`]), []);
});

test("a php or lua value flag before the program does not hide its write (T-2.4)", () => {
  assert.ok(inPlaceTargets(["php", "-c", "php.ini", "-r", `file_put_contents("src/a.ts","x");`], []).includes("src/a.ts"));
  assert.ok(inPlaceTargets(["lua", "-l", "mod", "-"], [`io.open("src/a.ts","w")\n`]).includes("src/a.ts"));
});

test("an awk read, an awk script file, a tcl read and a tcl script file beside a write heredoc yield nothing (T-3.3)", () => {
  assert.deepEqual(inPlaceTargets(["awk", "{ print $1 }", "src/a.ts"], []), []);
  assert.deepEqual(inPlaceTargets(words("awk -f fix.awk src/a.ts"), []), []);
  assert.deepEqual(inPlaceTargets(["tclsh"], ["set f [open src/a.ts r]\n"]), []);
  assert.deepEqual(inPlaceTargets(["tclsh"], ["set f [open src/a.ts]\n"]), []);
  assert.deepEqual(inPlaceTargets(["tclsh", "fix.tcl"], ["set f [open src/a.ts w]\n"]), []);
});

test("gawk with the inplace library edits the file operands after its program (T-3.4)", () => {
  assert.deepEqual(inPlaceTargets(["gawk", "-i", "inplace", "{ print }", "src/a.ts", "src/b.ts"], []), ["src/a.ts", "src/b.ts"]);
  assert.deepEqual(inPlaceTargets(["gawk", "-i", "inplace", "-e", "{ print }", "src/a.ts"], []), ["src/a.ts"]);
});

test("a tcl open for writing yields its bare, quoted or braced path alone", () => {
  assert.deepEqual(inPlaceTargets(["tclsh"], [`set f [open src/a.ts w]\nset g [open "src/b.ts" a+]\nset h [open {src/c.ts} {WRONLY CREAT}]\n`]), ["src/a.ts", "src/b.ts", "src/c.ts"]);
});

test("a command that is not an interpreter yields nothing", () => {
  assert.deepEqual(inPlaceTargets(["cat", "-"], ["open('src/a.py','w').write('x')"]), []);
});
