Implement artifacts/refactor/20-bench-guard.md, the work item part: drop benchmarking from src/.claude-plugin/plugin.json and remove src/skills/benchmarking/ (the project skill .claude/skills/benchmarking/ already exists); move its docs entry from docs/reference/skills.md to CONTRIBUTING.md; bench/run.mjs refuses a real run without --max-usd or with planned spend over it (budget times runs still to do, resumed runs not counted), printing the dry list and total, with unit tests for refused, over cap, at cap and resumed; the routing case asserts no plugin skill claims a bench prompt; UNCONVERTED_SKILLS becomes empty; the budget test also scans .claude/skills/.

## Brief
purpose: Stop the model from starting bench spend and cap every real run
in scope: plugin.json and src/skills/benchmarking removal; docs entry to CONTRIBUTING.md; bench/run.mjs --max-usd refusal with planned-spend tests; routing case; UNCONVERTED_SKILLS; budget test scans .claude/skills/
out of scope: editing .claude/ (the lead committed the project skill and rule in 7ba21a4); running the bench; the move of development's memory
