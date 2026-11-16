import { guardOutput } from "#test/hook.mts";
import { withProject } from "#test/project.mts";
import { closureTests, interpreterArgv, interpreterRowSource, loadedExport, loadGuard, programSeeds, shellCommands, tableRows, type Invocation, type PipedSeed } from "#test/variants.mts";
import { inPlaceTargets } from "./in-place.mts";
import type { Family } from "./interpreters.mts";

const NODE_WRITE = "require('fs').writeFileSync('src/a.ts','x')";
const PYTHON_WRITE = "open('src/a.py','w').write('x')";
const RUBY_WRITE = "File.write('src/a.rb','x')";

const inline = (...argv: string[]): Invocation => ({ argv, heredocs: [] });
const fedOnStdin = (program: string, ...argv: string[]): Invocation => ({ argv, heredocs: [program] });

const PERL_WRITE = "open(my $f, '>', 'src/a.pl')";
const PHP_WRITE = `file_put_contents("src/a.ts", "x");`;
const PHP_SCRIPT = "<?php file_put_contents('src/a.ts', 'x');";
const LUA_WRITE = `io.open("src/a.ts","w"):write("x")`;
const R_WRITE = `writeLines("x", "src/a.ts")`;
const AWK_WRITE = `BEGIN { print "x" > "src/a.ts" }`;
const TCL_WRITE = "set f [open src/a.ts w]";

const REVIEW_PROBES = [
  inline("node", `--eval=${NODE_WRITE}`),
  inline("node", "-pe", NODE_WRITE),
  inline("python3", "-Bc", PYTHON_WRITE),
  fedOnStdin(PYTHON_WRITE, "python3", "-X", "utf8", "-"),
  inline("perl", "-e", PERL_WRITE),
  inline("perl", "-e", `open(my $f, ">>", "src/a.pl")`),
  inline("perl", "-e", "open(my $f, '+<', 'src/a.pl')"),
  inline("perl", "-e", "open(F, '>src/a.pl')"),
  inline("perl", "-e", `open(F, ">>src/a.pl")`),
  inline("perl", "-e", "open(F, '+<src/a.pl')"),
  inline("perl", "-e", `open(F, "> src/a.pl")`),
  inline("perl", "-e", `open(F, ">> src/a.pl")`),
  inline("perl", "-e", "open(F, '+< src/a.pl')"),
  inline("perl", "-e", "open my $f, '>', 'src/a.pl'"),
  inline("perl", "-we", PERL_WRITE),
  fedOnStdin(PERL_WRITE, "perl", "-"),
  fedOnStdin(PYTHON_WRITE, "python3", "-X", "utf8"),
  fedOnStdin(PYTHON_WRITE, "python3", "-W", "ignore"),
  fedOnStdin(NODE_WRITE, "node", "--require", "./x.js"),
  inline("php", "-r", PHP_WRITE),
  inline("php", "-r", `$f = fopen("src/a.ts", "w");`),
  fedOnStdin(PHP_SCRIPT, "php"),
  fedOnStdin(PHP_SCRIPT, "php", "-c", "php.ini"),
  inline("lua", "-e", LUA_WRITE),
  inline("lua", "-e", `io.output("src/a.ts")`),
  fedOnStdin(LUA_WRITE, "lua", "-"),
  inline("Rscript", "-e", R_WRITE),
  inline("Rscript", "-e", `cat("x", file = "src/a.ts")`),
  inline("Rscript", `-e${R_WRITE}`),
  fedOnStdin(R_WRITE, "R", "--vanilla"),
  inline("awk", AWK_WRITE),
  inline("awk", "-F:", "-v", "n=1", `BEGIN { print n >> "src/a.ts" }`),
  inline("gawk", "-e", `BEGIN { printf "x" > "src/a.ts" }`),
  fedOnStdin(AWK_WRITE, "awk", "-f", "-"),
  inline("gawk", "-i", "inplace", "{ print }", "src/a.ts"),
  inline("gawk", "--include=inplace", "{ print }", "src/a.ts"),
  inline("gawk", "-i", "inplace", "-e{ print }", "src/a.ts"),
  fedOnStdin(AWK_WRITE, "gawk", "--file=/dev/stdin"),
  fedOnStdin(AWK_WRITE, "gawk", "-f/dev/stdin"),
  fedOnStdin(AWK_WRITE, "gawk", "-bf/dev/stdin"),
  inline("gawk", "-i", "inplace", "-be{ print }", "src/a.ts"),
  fedOnStdin(R_WRITE, "R", "--no-save", "-f", "/dev/stdin"),
  inline("gawk", "-i", "inplace", "--file=fix.awk", "src/a.ts"),
  inline("gawk", "-e", AWK_WRITE, "-e1"),
  inline("php", "-B", PHP_WRITE, "-Recho 1;"),
  inline("lua", "-e", LUA_WRITE, "-ex=1"),
  inline("Rscript", "-e", R_WRITE, "-e1"),
  fedOnStdin(TCL_WRITE, "tclsh"),
  fedOnStdin(`set f [open "src/a.ts" a]`, "tclsh"),
  fedOnStdin("set f [open src/a.ts {WRONLY CREAT}]", "tclsh"),
  fedOnStdin(TCL_WRITE, "tclsh", "/dev/stdin"),
  fedOnStdin(PERL_WRITE, "perl", "/dev/fd/0"),
  fedOnStdin(PHP_SCRIPT, "php", "/proc/self/fd/0"),
  fedOnStdin(LUA_WRITE, "lua", "/dev/stdin"),
  fedOnStdin(AWK_WRITE, "gawk", "-f", "/proc/self/fd/0"),
  inline("perl", `-weopen(F,">src/a.pl"); print F "x"`),
  inline("python3", "-Ecopen('src/a.py','w')"),
];

const WRITES: Record<string, string[]> = {
  python3: [PYTHON_WRITE, "open('src/a.py','w')", "__import__('pathlib').Path('src/a.py').write_text('x')"],
  node: [NODE_WRITE, "require('fs').writeFile('src/a.ts','x',()=>{})", "require('fs').appendFileSync('src/a.ts','x')", "require('fs').createWriteStream('src/a.ts').write('x')"],
  perl: [PERL_WRITE, "open(F, '>src/a.pl')"],
  ruby: [RUBY_WRITE, `File.write "src/a.rb", "x"`, "open('src/a.rb','w'){|f| f.puts 1}"],
  bun: ["Bun.write('src/a.ts','x')", NODE_WRITE],
  deno: ["Deno.writeFileSync('src/a.ts', new TextEncoder().encode('x'))"],
  php: [PHP_WRITE, `$f = fopen("src/a.ts", "w");`],
  lua: [LUA_WRITE, `io.output("src/a.ts")`],
  Rscript: [R_WRITE, `writeChar("x", "src/a.ts")`, `writeBin(as.raw(1), "src/a.ts")`, `write("x", "src/a.ts")`, `sink("src/a.ts")`, `cat("x", file = "src/a.ts")`, `close(file("src/a.ts", "w"))`],
  awk: [AWK_WRITE],
  tclsh: [TCL_WRITE],
};

const interpreters = await loadGuard(() => import("./interpreters.mts"), "src/lib/hooks/guard/bash/interpreters.mts");
const familyOf = (name: string) => loadedExport(interpreters, "familyOf")(name);

closureTests({
  guard: "in-place guard",
  grammar: interpreterArgv,
  seeds: programSeeds(WRITES),
  probes: REVIEW_PROBES,
  rows: [interpreterRowSource(tableRows<Family>(interpreters, "FAMILIES"), familyOf, WRITES)],
  run: ({ argv, heredocs }: Invocation) => inPlaceTargets(argv, heredocs),
  closed: (targets) => targets.some((target) => target.startsWith("src/a.")),
});

const PIPED_PROGRAM_SEEDS = [
  `echo 'open("src/a.py","w").write("x")' | python3`,
  `echo -n 'open("src/a.py","w").write("x")' | python3 -`,
  `printf '%s' 'require("fs").writeFileSync("src/a.ts","x")' | node`,
  `printf 'require("fs").writeFileSync("src/a.ts","x")' |& node`,
  `echo 'BEGIN { print "x" > "src/a.ts" }' | gawk -f /dev/stdin`,
  `echo 'File.write("src/a.rb","x")' | ruby`,
  `bash -c "echo 'open(\\"src/a.py\\",\\"w\\").write(\\"x\\")' | python3"`,
  `cat <<'EOF' | python3\nopen("src/a.py","w").write("x")\nEOF`,
  `command echo 'open("src/a.py","w").write("x")' | python3`,
  `builtin echo 'open("src/a.py","w").write("x")' | python3`,
  `env -i echo 'open("src/a.py","w").write("x")' | python3`,
  `{ echo 'open("src/a.py","w").write("x")'; } | python3`,
];

const PIPED_PYTHON_WRITE = `open("src/a.py","w").write("x")`;
const pipedPython = (writer: string): PipedSeed => ({ writer, program: PIPED_PYTHON_WRITE, interpreter: "python3" });

const inPlace = await loadGuard(() => import("./in-place.mts"), "src/lib/hooks/guard/bash/in-place.mts");

closureTests({
  guard: "in-place guard on piped programs",
  grammar: shellCommands,
  seeds: [pipedPython("echo")],
  probes: PIPED_PROGRAM_SEEDS,
  rows: [{ table: tableRows<string>(inPlace, "VISIBLE_WRITERS"), key: (writer) => writer, seedsOf: (writer) => [pipedPython(writer)] }],
  run: (command: string, t) => guardOutput(command, { root: withProject(t, { host: true, picket: false }), tool: "Bash" }),
  closed: (out) => out?.permissionDecision === "deny" && out.permissionDecisionReason.startsWith("guard.bash: src/a."),
});
