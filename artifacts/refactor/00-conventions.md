# Conventions

Decisions that hold across every refactor item. Each item checks itself against this file; an item that changes an entry bumps its marker and adds a line to the revision log.

## Entries

### C-001: Source in `src/`, output in `dist/`
Everything hand-written lives in `src/`. `dist/` is generated whole by `npm run build`, ignored by git, and never edited. From item 01, L-1.

### C-002: Code is `.mts`, imports name the output
New and converted modules are `.mts` and pass `strict`. An import names the file it will load at runtime: `import { readState } from "./work.mjs"`, never `./work.mts`. From item 01, L-2 and L-4.

### C-003: Convert bottom-up
A module converts to `.mts` only after the modules it imports, or together with them in the same change. From item 01, L-4.

### C-004 (r2): Shipped code runs on Node 22, tooling on Node 24
Code under `src/` that ships uses no API newer than Node 22 (`@types/node` at the 22 line enforces it; esbuild targets `node22`). Build, watch and test scripts may use Node 24 APIs. From item 01, L-5 (r2).

### C-005: Generated files carry a banner
Every built JavaScript file starts with `// generated from src/ by scripts/build.mjs; edit the source`. This is the only comment the build adds. From item 01, L-7.

## Revision log

- 2026-10-22: C-004 (r2): floor raised from Node 20 to 22 for shipped code, 24 for tooling; item 01 L-5 (r2).
