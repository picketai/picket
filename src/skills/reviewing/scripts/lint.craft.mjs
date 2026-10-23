#!/usr/bin/env node
// Craft lint — locate comment-discipline and test-kind violations in a diff.
//
// Only decidable things set exit 1 — errors are CD1 and TK1/TK2 alone.
//
// A tool that reported judgement calls as errors would train its readers to pass
// `--no-verify`, so the two classes stay separate and only errors set exit 1.
//
// Scope is ADDED LINES ONLY. Pre-existing comments are somebody else's decision
// and flagging them would bury this phase's actual findings.
//
// Exit: 0 clean · 1 errors present (or candidates under --strict) · 2 bad usage.

import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { LANGS, MARKUP, DIRECTIVE_MARKERS, extOf, commentOf } from '../../../lib/shared/comments.mjs';
import { isTestPath } from '../../../lib/shared/silenced.mjs';

// ---------------------------------------------------------------- args

const argv = process.argv.slice(2);
const opt = { range: null, staged: false, strict: false, json: false, rules: 'both', cwd: process.cwd() };

for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--staged') opt.staged = true;
  else if (a === '--strict') opt.strict = true;
  else if (a === '--json') opt.json = true;
  else if (a === '--range') opt.range = argv[++i];
  else if (a === '--rules') opt.rules = argv[++i];
  else if (a === '-C') opt.cwd = argv[++i];
  else if (a === '--help' || a === '-h') { usage(); process.exit(0); }
  else { console.error(`craft-lint: unknown argument "${a}"`); usage(); process.exit(2); }
}

if (!['both', 'comments', 'tests'].includes(opt.rules)) {
  console.error(`craft-lint: --rules must be one of both|comments|tests`);
  process.exit(2);
}

function usage() {
  console.log(`usage: node lint.craft.mjs [--staged | --range A..B] [--rules both|comments|tests]
                           [--strict] [--json] [-C <repo>]`);
}

// ---------------------------------------------------------------- signal tables

// Commented-out code. Decidable enough to be an error rather than a candidate.
// Shapes that are code on their own, no corroboration needed.
const CODE_SHAPES_STRONG = [
  /;\s*$/, /=>\s*$/,
  /^\s*(if|for|while|foreach|switch|else|try|catch|finally|return|throw|await|yield)\b[^.]*[;{}()=]/i,
  /^\s*(var|let|const|public|private|protected|internal|static|def|fn|func|function|class|interface|struct|enum|package|namespace)\s+[\w.<>$]+\s*[;{(=:]/i,
  /^\s*(import|using|from|require)\b.*['"]/i,
  /^\s*[\w.$]+\s*\([^)]*\)\s*;?\s*$/, /^\s*[\w.$]+\s*=[^=]/, /\)\s*\.\w+\(/,
  /^\s*\}\s*(else|catch|finally|\))/, /^\s*#\s*(include|define|endif)\b/,
];

// A trailing brace is suggestive but not sufficient: `// path -> { added: [...],
// isNew }` sketches a data shape, which is prose ABOUT types, not disabled code.
// Require statement punctuation alongside the brace before calling it code.
const CODE_SHAPE_BRACE = /[{}]\s*$/;
const STATEMENT_PUNCT = /[;=(]|\b(if|for|while|return|function|def|new)\b/;

function isCommentedOutCode(body) {
  if (CODE_SHAPES_STRONG.some(re => re.test(body))) return true;
  return CODE_SHAPE_BRACE.test(body) && STATEMENT_PUNCT.test(body);
}

// Test-kind signals: path shapes and in-file harness references. Each maps to the
// excluded kind it evidences, so the report names the policy line it trips.
const TEST_PATH_SIGNALS = [
  { re: /(^|\/)(e2e|end-to-end|endtoend)(\/|\.|-|_)/i, kind: 'end-to-end' },
  { re: /(^|\/)(cypress|playwright|selenium|puppeteer)(\/|\.)/i, kind: 'end-to-end' },
  { re: /\.(e2e|uitest|ui-test)\.[a-z]+$/i, kind: 'end-to-end' },
  { re: /(^|\/)integration[-_.]?tests?(\/|\.)/i, kind: 'integration' },
  { re: /\.(integration|it)\.[a-z]+$/i, kind: 'integration' },
  { re: /\w*IntegrationTests?\.\w+$/, kind: 'integration' },
  { re: /(^|\/)(perf|performance|load|stress|soak|bench|benchmarks?)(\/|\.|-|_)/i, kind: 'performance' },
  { re: /\w*(Benchmarks?|LoadTests?|PerfTests?)\.\w+$/, kind: 'performance' },
  { re: /(^|\/)(contract|pact)[-_.]?tests?(\/|\.)/i, kind: 'contract' },
  { re: /(^|\/)smoke[-_.]?tests?(\/|\.)/i, kind: 'smoke' },
];

const TEST_CONTENT_SIGNALS = [
  { re: /\bTestcontainers?\b/i, kind: 'integration', what: 'Testcontainers' },
  { re: /\bWebApplicationFactory\b/, kind: 'integration', what: 'WebApplicationFactory' },
  { re: /\bnew TestServer\b|Microsoft\.AspNetCore\.TestHost/, kind: 'integration', what: 'TestServer' },
  { re: /@SpringBootTest|@DataJpaTest|@WebMvcTest/, kind: 'integration', what: 'Spring integration harness' },
  { re: /require\(['"]supertest['"]\)|from ['"]supertest['"]/, kind: 'integration', what: 'supertest' },
  { re: /\bUseSqlServer\(|\bUseNpgsql\(|\bUseMySql\(/, kind: 'integration', what: 'a real DB provider' },
  { re: /from ['"]@playwright\/|require\(['"]playwright/, kind: 'end-to-end', what: 'Playwright' },
  { re: /\bcy\.(visit|get)\(|from ['"]cypress/, kind: 'end-to-end', what: 'Cypress' },
  { re: /\bWebDriver\b|ChromeDriver|selenium/i, kind: 'end-to-end', what: 'WebDriver/Selenium' },
  { re: /puppeteer/i, kind: 'end-to-end', what: 'Puppeteer' },
  { re: /BenchmarkDotNet|\[Benchmark\]|\bJMH\b|criterion::/i, kind: 'performance', what: 'a benchmark harness' },
  { re: /\bk6\b|import http from ['"]k6|locust/i, kind: 'performance', what: 'a load-test harness' },
  { re: /\bPact\b|pactWith\(|PactBuilder/, kind: 'contract', what: 'Pact' },
  { re: /toMatchSnapshot\(|toMatchInlineSnapshot\(/, kind: 'rendered-output snapshot', what: 'a snapshot assertion' },
];

const ARCH_SIGNALS = [
  { re: /NetArchTest|ArchUnit|com\.tngtech\.archunit|ts-arch|dependency-cruiser/i, what: 'an architecture-test harness' },
];

// ---------------------------------------------------------------- git plumbing

function git(args) {
  return execFileSync('git', args, { cwd: opt.cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

function diffArgs() {
  if (opt.range) return ['diff', '-U0', '--no-color', '--diff-filter=ACMR', opt.range];
  if (opt.staged) return ['diff', '-U0', '--no-color', '--diff-filter=ACMR', '--cached'];
  return ['diff', '-U0', '--no-color', '--diff-filter=ACMR', 'HEAD'];
}

// path -> { added: [{line, text}], isNew }
function collectAdded() {
  const files = new Map();
  let raw;
  try {
    raw = git(diffArgs());
  } catch (e) {
    console.error(`craft-lint: git diff failed: ${String(e.stderr || e.message).trim()}`);
    process.exit(2);
  }

  let cur = null, next = 0;
  for (const line of raw.split('\n')) {
    if (line.startsWith('+++ ')) {
      const p = line.slice(4).replace(/^b\//, '').trim();
      cur = p === '/dev/null' ? null : p;
      if (cur && !files.has(cur)) files.set(cur, { added: [], isNew: false });
      continue;
    }
    if (line.startsWith('@@')) {
      const m = /\+(\d+)/.exec(line);
      next = m ? Number(m[1]) : 0;
      continue;
    }
    if (cur && line.startsWith('+') && !line.startsWith('+++')) {
      files.get(cur).added.push({ line: next++, text: line.slice(1) });
    }
  }

  // Untracked files count as wholly added — a new e2e suite is usually untracked
  // at the moment the developer is about to summarise the phase.
  if (!opt.range && !opt.staged) {
    let others = '';
    try { others = git(['ls-files', '--others', '--exclude-standard']); } catch { /* ignore */ }
    for (const p of others.split('\n').map(s => s.trim()).filter(Boolean)) {
      const abs = join(opt.cwd, p);
      if (!existsSync(abs)) continue;
      let body;
      try { body = readFileSync(abs, 'utf8'); } catch { continue; }
      if (body.indexOf(String.fromCharCode(0)) !== -1) continue;
      files.set(p, { added: body.split('\n').map((text, i) => ({ line: i + 1, text })), isNew: true });
    }
  }

  return files;
}

// ---------------------------------------------------------------- comment scan

const findings = [];
function report(sev, rule, file, line, message, detail) {
  findings.push({ severity: sev, rule, file, line, message, detail });
}

function hasAllow(rule, lines, i) {
  const re = new RegExp(`craft-lint-allow:\\s*(${rule}|ALL)\\b`, 'i');
  return re.test(lines[i]?.text || '') || re.test(lines[i - 1]?.text || '');
}

function isDirective(body, text) {
  return DIRECTIVE_MARKERS.some(re => re.test(body) || re.test(text));
}

function scanComments(file, added) {
  const lang = LANGS[extOf(file)];
  if (!lang) return;

  for (const { line, text } of added) {
    const c = commentOf(text, lang);
    if (!c) continue;
    const body = c.body.trim();
    if (!body || isDirective(body, text)) continue;

    if (isCommentedOutCode(body)) {
      report('error', 'CD1', file, line, 'commented-out code: delete it; git remembers', body.slice(0, 80));
    } else {
      report('candidate', 'CD2', file, line, `new ${c.isDoc ? 'doc ' : ''}comment: allowed only with an approval recorded by picket comment`, body.slice(0, 80));
    }
  }
}

// ---------------------------------------------------------------- test-kind scan

function scanTests(file, added, isNew) {
  const lang = LANGS[extOf(file)];
  // Only source files can BE a test. A policy document, a YAML registry, or this
  // linter's own signal table merely NAMES Testcontainers — mentioning a harness
  // is not using one, and a tool that cannot tell the difference flags every file
  // that documents the rule it enforces.
  if (!lang || lang === MARKUP) return;

  const body = added.map(a => a.text).join('\n');
  const allowAll = /craft-lint-allow:\s*(TK\d|ALL)\b/i.test(body);

  const pathNamesKind = TEST_PATH_SIGNALS.some(s => s.re.test(file));
  const looksLikeTest = isTestPath(file) || pathNamesKind;

  // TK1 — the path itself names an excluded kind.
  for (const sig of TEST_PATH_SIGNALS) {
    if (sig.re.test(file)) {
      if (!allowAll) {
        report('error', 'TK1', file, added[0]?.line ?? 1,
          `${isNew ? 'new file' : 'changed file'} is a ${sig.kind} test: off by default (the developer writes unit and architecture tests only)`, file);
      }
      break;
    }
  }

  // TK2 / TK3 — an excluded harness is referenced on an added line of a test file.
  // Gated on looksLikeTest: a harness name inside production code is a different
  // conversation (and usually a dependency question, not a test-kind one).
  for (let i = 0; looksLikeTest && i < added.length; i++) {
    const text = added[i].text;
    // A comment naming a harness is discussion, not usage.
    const asComment = commentOf(text, lang);
    if (asComment && !asComment.inline) continue;
    for (const sig of TEST_CONTENT_SIGNALS) {
      if (!sig.re.test(text)) continue;
      if (allowAll || hasAllow('TK2', added, i)) continue;
      report('error', 'TK2', file, added[i].line,
        `${sig.what} → ${sig.kind} test: off by default; cover the rule with a unit test + the step-7a drive`, text.trim().slice(0, 80));
    }
    for (const sig of ARCH_SIGNALS) {
      if (!sig.re.test(text)) continue;
      if (allowAll || hasAllow('TK3', added, i)) continue;
      report('candidate', 'TK3', file, added[i].line,
        `${sig.what}: architecture tests are permitted only when the harness already exists; never introduced on the developer's initiative`, text.trim().slice(0, 80));
    }
  }

  // TK4 — a new test file that asserts nothing is not a unit test either way.
  if (isNew && looksLikeTest && !/\b(assert|expect|should|Assert\.|verify|toBe|toEqual)\b/i.test(body) && !allowAll) {
    report('candidate', 'TK4', file, 1, 'new test file with no visible assertion: confirm it verifies a business rule', null);
  }
}

// ---------------------------------------------------------------- run

const files = collectAdded();
for (const [file, { added, isNew }] of files) {
  if (!added.length) continue;
  if (opt.rules !== 'tests') scanComments(file, added);
  if (opt.rules !== 'comments') scanTests(file, added, isNew);
}

const errors = findings.filter(f => f.severity === 'error');
const candidates = findings.filter(f => f.severity === 'candidate');

if (opt.json) {
  console.log(JSON.stringify({
    scope: opt.range || (opt.staged ? 'staged' : 'working tree vs HEAD'),
    files: files.size, errors, candidates,
  }, null, 2));
} else {
  const scope = opt.range || (opt.staged ? 'staged changes' : 'working tree vs HEAD');
  console.log(`craft-lint: ${files.size} changed file(s), scope ${scope}, rules ${opt.rules}\n`);

  if (errors.length) {
    console.log(`errors (${errors.length}); fix before the phase summary:`);
    for (const f of errors) console.log(`  ${f.rule} ${f.file}:${f.line}  ${f.message}${f.detail ? `\n       ${f.detail}` : ''}`);
    console.log('');
  }
  if (candidates.length) {
    console.log(`candidates (${candidates.length}); JUDGEMENT REQUIRED, each is a question not a verdict:`);
    for (const f of candidates) console.log(`  ${f.rule} ${f.file}:${f.line}  ${f.message}${f.detail ? `\n       ${f.detail}` : ''}`);
    console.log('');
  }
  if (!findings.length) console.log('clean: no comment or test-kind violations in added lines.\n');

  console.log(`craft-lint: ${errors.length} error(s), ${candidates.length} candidate(s)`);
  if (candidates.length) {
    console.log('  A candidate is not a finding. Confirm it against the comments rule (no new comment');
    console.log('  unless exempt or approved with picket comment), then fix or dismiss it.');
  }
}

process.exit(errors.length || (opt.strict && candidates.length) ? 1 : 0);
