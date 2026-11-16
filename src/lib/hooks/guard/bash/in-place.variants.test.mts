import { asWritten, closureTests, interpreterNames, invocationLabel, programFlagSpellings, stdinSpellings, type Invocation } from "#test/variants.mts";
import { inPlaceTargets } from "./in-place.mts";

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

const AS_WRITTEN_SEEDS = [
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
];

closureTests({
  guard: "in-place guard",
  run: ({ argv, heredocs }: Invocation) => inPlaceTargets(argv, heredocs),
  closed: (targets) => targets.some((target) => target.startsWith("src/a.")),
  checks: [
    { family: asWritten(invocationLabel), seeds: AS_WRITTEN_SEEDS },
    {
      family: programFlagSpellings,
      seeds: [
        inline("node", "-e", NODE_WRITE),
        inline("python3", "-c", PYTHON_WRITE),
        inline("ruby", "-e", RUBY_WRITE),
        inline("php", "-r", PHP_WRITE),
        inline("lua", "-e", LUA_WRITE),
        inline("awk", "-e", AWK_WRITE),
      ],
    },
    { family: stdinSpellings, seeds: [fedOnStdin(NODE_WRITE, "node"), fedOnStdin(PYTHON_WRITE, "python3"), fedOnStdin(RUBY_WRITE, "ruby")] },
    { family: interpreterNames, seeds: [inline("python3", "-c", PYTHON_WRITE), inline("node", "-e", NODE_WRITE), inline("ruby", "-e", RUBY_WRITE), inline("perl", "-e", PERL_WRITE), inline("php", "-r", PHP_WRITE), inline("lua", "-e", LUA_WRITE), inline("awk", AWK_WRITE), fedOnStdin(TCL_WRITE, "tclsh")] },
  ],
});
