import { asWritten, closureTests, invocationLabel, programFlagSpellings, stdinSpellings, type Invocation } from "#test/variants.mts";
import { inPlaceTargets } from "./in-place.mts";

const NODE_WRITE = "require('fs').writeFileSync('src/a.ts','x')";
const PYTHON_WRITE = "open('src/a.py','w').write('x')";
const RUBY_WRITE = "File.write('src/a.rb','x')";

const inline = (...argv: string[]): Invocation => ({ argv, heredocs: [] });
const fedOnStdin = (program: string, ...argv: string[]): Invocation => ({ argv, heredocs: [program] });

const REVIEW_PROBES = [
  inline("node", `--eval=${NODE_WRITE}`),
  inline("node", "-pe", NODE_WRITE),
  inline("python3", "-Bc", PYTHON_WRITE),
  fedOnStdin(PYTHON_WRITE, "python3", "-X", "utf8", "-"),
];

closureTests({
  guard: "in-place guard",
  run: ({ argv, heredocs }: Invocation) => inPlaceTargets(argv, heredocs),
  closed: (targets) => targets.some((target) => target.startsWith("src/a.")),
  checks: [
    { family: asWritten(invocationLabel), seeds: REVIEW_PROBES },
    { family: programFlagSpellings, seeds: [inline("node", "-e", NODE_WRITE), inline("python3", "-c", PYTHON_WRITE), inline("ruby", "-e", RUBY_WRITE)] },
    { family: stdinSpellings, seeds: [fedOnStdin(NODE_WRITE, "node"), fedOnStdin(PYTHON_WRITE, "python3"), fedOnStdin(RUBY_WRITE, "ruby")] },
  ],
});
