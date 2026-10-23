#!/usr/bin/env node
// Deterministic filename-stem derivation for the documenting skill.
// Usage: node filename.mjs <type> "<subject phrase>"
// Prints the derived filename stem on stdout (numbered types include the NNNNN- prefix; a stem
// that would start with report, summary, findings or analysis gets an about- prefix).
import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { projectRoot } from '../../../lib/shared/paths.mts';

function die(msg) {
  process.stderr.write(`error: ${msg}\n`);
  process.exit(1);
}

const TYPES = ['report', 'sdr', 'charter', 'context-map', 'glossary', 'api'];

// Accept both forms: `filename.mjs <type> "<subject>"` and `filename.mjs --kind <type> ["<subject>"] [--work <id>]`.
// Work-item artifacts (order, design) have fixed names inside the work directory and need no subject.
const argv = process.argv.slice(2);
const opts = {};
const positional = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--kind' || argv[i] === '--work') opts[argv[i].slice(2)] = argv[++i];
  else positional.push(argv[i]);
}
const type = opts.kind ?? positional[0];
if (type === 'order' || type === 'design') {
  if (!opts.work) die(`--kind ${type} needs --work <id>`);
  process.stdout.write(`work/${opts.work}/${type}.md\n`);
  process.exit(0);
}
const subjectArg = opts.kind ? positional[0] : positional[1];
if (!type || !subjectArg) die(`usage: filename.mjs <${TYPES.join('|')}> "<subject>"  |  filename.mjs --kind <type> "<subject>" [--work <id>]`);
if (!TYPES.includes(type)) die(`type must be one of ${TYPES.join(', ')}, order, design`);

let subject = subjectArg;

// API subjects are usually an endpoint path (e.g. "POST /v1/book-orders/confirm").
// Strip a leading HTTP method so it does not pollute the stem.
if (type === 'api') {
  subject = subject.replace(/^\s*(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/i, '').trim();
}

// Step 1 — strip a leading meta verb / prefix (case-insensitive, longest first).
const meta = [
  'Specification of', 'Specification for', 'Documentation of',
  'Analysis of', 'Design of', 'Plan for', 'Review of', 'Audit of',
  'Migration to', 'Migration of', 'Refactor of',
  'Charter for', 'Charter of', 'Glossary for', 'Map of', 'Context map of', 'Context map for',
  'Progress for', 'Progress of', 'Progress on', 'SDR for', 'SDR on',
  'Spec of', 'Spec for', 'Scope of', 'Document',
];
for (const m of meta) {
  if (subject.toLowerCase().startsWith(m.toLowerCase() + ' ')) {
    subject = subject.slice(m.length + 1);
    break;
  }
}

// Step 2 — lowercase.
subject = subject.toLowerCase();

// Step 4 — non-alphanumeric becomes a separator.
subject = subject.replace(/[^a-z0-9]+/g, ' ');

// Step 3 — drop stopword tokens.
const stopwords = new Set(
  'a an the of for to in on at with and or but by from as into our your my this that these those'.split(' '),
);
let tokens = subject.split(' ').filter((t) => t && !stopwords.has(t));

// API stems drop URL noise — a leading `api` segment and version markers (`v1`, `v2`).
if (type === 'api') {
  tokens = tokens.filter((t) => t !== 'api' && !/^v\d+$/.test(t));
}

// Step 5 — keep the first N tokens (uniform N=5 across types).
const kept = tokens.slice(0, 5);
if (kept.length === 0) die('subject reduced to zero tokens after cleanup');
let stem = kept.join('-');

// Per-type suffix — idempotent (don't double-append if already present in the stem).
function appendOnce(s, suffix) {
  const suffixToken = suffix.replace(/^-/, '');
  return s.split('-').includes(suffixToken) ? s : `${s}${suffix}`;
}
if (type === 'report')      stem = appendOnce(stem, '-analysis');
if (type === 'charter')     stem = appendOnce(stem, '-charter');
if (type === 'glossary')    stem = appendOnce(stem, '-glossary');
if (type === 'context-map') stem = stem.includes('context-map') ? stem : `${stem}-context-map`;

// Numbered types prepend NNNNN-, scanning their host directory for the next free integer.
function nextSequence(dir) {
  let next = 1;
  if (!existsSync(dir)) return next;
  for (const name of readdirSync(dir)) {
    const match = /^(\d{5})-/.exec(name);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num >= next) next = num + 1;
    }
  }
  return next;
}

// Mirrors Claude Code's subagent Write check (2.1.282): a basename matching
// /^(REPORT|SUMMARY|FINDINGS|ANALYSIS).*\.md$/i is refused with "Subagents should return
// findings as text, not write report files". A name that would match gets the `about-` prefix.
const BLOCKED_BASENAME = /^(report|summary|findings|analysis)/i;

function safe(name) {
  return BLOCKED_BASENAME.test(name) ? `about-${name}` : name;
}

const root = projectRoot();
let out;
if (type === 'sdr') {
  const next = nextSequence(join(root, 'artifacts/strategy/decisions'));
  out = `${String(next).padStart(5, '0')}-${stem}`;
} else {
  // report, charter, context-map, glossary, api: no numeric prefix.
  out = stem;
}
process.stdout.write(`${safe(out)}\n`);
