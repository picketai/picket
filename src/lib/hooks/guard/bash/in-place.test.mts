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

test("a command that is not an interpreter yields nothing", () => {
  assert.deepEqual(inPlaceTargets(["cat", "-"], ["open('src/a.py','w').write('x')"]), []);
});
