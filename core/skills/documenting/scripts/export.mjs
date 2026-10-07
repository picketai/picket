#!/usr/bin/env node
// Converts a Markdown artifact to a styled Word document via pandoc, then runs the
// docx post-processor. Cross-OS (Node + pandoc only) — replaces the original
// export.ps1 + fix_tables.py pair.
//
// Usage:
//   node export.mjs --input <file.md> [--output <file.docx>] [--reference <ref.docx>]
//   node export.mjs -i <file.md> -o <file.docx>
//
// --output defaults to <input> with a .docx extension.
// --reference defaults to the bundled reference.docx (Word styling template).
import { existsSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fixPandocTables } from './docx-postprocess.mjs';

const scriptDir = dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const opts = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--input' || a === '-i') opts.input = argv[++i];
    else if (a === '--output' || a === '-o') opts.output = argv[++i];
    else if (a === '--reference' || a === '-r') opts.reference = argv[++i];
    else if (!opts.input) opts.input = a; // first positional = input
  }
  return opts;
}

function fail(msg) {
  process.stderr.write(`error: ${msg}\n`);
  process.exit(1);
}

const opts = parseArgs(process.argv.slice(2));

if (!opts.input) fail('usage: export.mjs --input <file.md> [--output <file.docx>] [--reference <ref.docx>]');

const inputFile = resolve(opts.input);
if (!existsSync(inputFile)) fail(`input file not found: ${inputFile}`);

const outputFile = resolve(opts.output ?? inputFile.replace(/\.md$/i, '.docx'));
const referenceDoc = resolve(opts.reference ?? resolve(scriptDir, 'reference.docx'));
if (!existsSync(referenceDoc)) fail(`reference doc not found: ${referenceDoc}`);

const outDir = dirname(outputFile);
if (outDir && !existsSync(outDir)) mkdirSync(outDir, { recursive: true });

process.stdout.write(`Converting: ${inputFile}\n`);
process.stdout.write(`Output:     ${outputFile}\n`);
process.stdout.write(`Style:      ${referenceDoc}\n`);

const pandoc = spawnSync(
  'pandoc',
  [
    inputFile,
    '--from', 'markdown',
    '--to', 'docx',
    '--reference-doc', referenceDoc,
    '--output', outputFile,
    '--standalone',
  ],
  { stdio: 'inherit' },
);

if (pandoc.error?.code === 'ENOENT') {
  fail('pandoc is not installed or not on PATH. Install it from https://pandoc.org/installing.html and retry.');
}
if (pandoc.status !== 0) {
  fail(`pandoc exited with code ${pandoc.status}`);
}

process.stdout.write(`Fixing tables: ${outputFile}\n`);
try {
  fixPandocTables(outputFile);
} catch (err) {
  fail(`post-processing failed: ${err.message}`);
}

process.stdout.write(`Done: ${outputFile}\n`);
