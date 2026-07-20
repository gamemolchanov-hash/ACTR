/**
 * diff-cover.mjs — diff-coverage gate for the ACTR storefront (FBG-387).
 * Запуск всегда `node tools/diff-cover.mjs` (npm-скрипт `diff-cover`) — шебанг здесь
 * запрещён: vitest SSR-обёртка сдвигает `#!` внутрь модуля → SyntaxError.
 *
 * The regular gates prove "tests are green" but never demand that NEW/changed code be
 * covered — untested logic slips through silently. This gate runs vitest with v8 coverage,
 * takes the lines changed since a base ref, and fails if the covered fraction of those
 * changed lines (over the in-scope files only) is below a threshold.
 *
 *   DIFF_COVER_BASE  base ref for the diff (default: origin/main)
 *   DIFF_COVER_MIN   minimum % of changed in-scope lines that must be covered (default: 60)
 *
 * Exit codes: 0 = pass (or nothing in scope to measure), 1 = below threshold / tests failed,
 * 2 = could not measure. The gate is fail-closed: if an in-scope changed file is absent from
 * the coverage report (bad base ref, broken path mapping, or coverage/scope drift), we return
 * 2 rather than silently passing — an unmeasurable diff is never treated as a covered one.
 *
 * The pure helpers (parseAddedLines / lineHits / computeDiffCoverage / decideExit / isInScope /
 * toRanges) are exported and unit-tested in diff-cover.test.mjs.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..');

export const DEFAULT_BASE = 'origin/main';
export const DEFAULT_MIN = 60;

/**
 * In-scope = application source under src/ that is actually executed by vitest, i.e. .ts/.tsx
 * files minus tests (`*.test.ts(x)`, anything under `__tests__/`) and type declarations
 * (`*.d.ts`). This MUST stay consistent with the coverage include/exclude in
 * tools/vitest.diff-cover.config.mjs, or an in-scope file excluded from coverage would be
 * reported as unmeasurable (code 2). A changed file outside scope is skipped entirely.
 * @param {string} rel repo-relative POSIX path
 */
export function isInScope(rel) {
  if (!rel.startsWith('src/')) return false;
  if (!(rel.endsWith('.ts') || rel.endsWith('.tsx'))) return false;
  if (rel.endsWith('.d.ts')) return false;
  if (rel.endsWith('.test.ts') || rel.endsWith('.test.tsx')) return false;
  if (/(^|\/)__tests__\//.test(rel)) return false;
  return true;
}

/**
 * Parse `git diff -U0` output into the set of added/changed line numbers (new-side) per file.
 * @param {string} diffText
 * @returns {Map<string, Set<number>>}
 */
export function parseAddedLines(diffText) {
  const added = new Map();
  let current = null; // relPath, or null between a `diff --git` header and its `+++` line
  let newLine = 0;
  for (const raw of diffText.split('\n')) {
    if (raw.startsWith('diff --git')) {
      current = null;
      continue;
    }
    if (raw.startsWith('+++ ')) {
      const p = raw.slice(4).trim();
      current = p === '/dev/null' ? null : p.replace(/^b\//, '');
      continue;
    }
    if (raw.startsWith('--- ')) continue;
    if (raw.startsWith('@@')) {
      const m = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(raw);
      if (m) newLine = parseInt(m[1], 10);
      continue;
    }
    if (current === null) continue;
    if (raw.startsWith('+')) {
      if (!added.has(current)) added.set(current, new Set());
      added.get(current).add(newLine);
      newLine += 1;
    } else if (raw.startsWith('-')) {
      // removed line — old side only, does not advance the new-side counter
    } else if (raw.startsWith(' ')) {
      newLine += 1; // context (absent with -U0, handled for safety)
    }
  }
  return added;
}

/**
 * Istanbul FileCoverage entry → Map<line, maxHitCount>, matching istanbul's getLineCoverage
 * (a line's count is the max over the statements starting on it; a line is "coverable" iff a
 * statement starts on it, and "covered" iff that count is > 0).
 * @param {{statementMap?: object, s?: object}} entry
 * @returns {Map<number, number>}
 */
export function lineHits(entry) {
  const map = new Map();
  const sm = entry?.statementMap ?? {};
  const s = entry?.s ?? {};
  for (const id of Object.keys(sm)) {
    const loc = sm[id];
    if (typeof loc?.start?.line !== 'number') continue;
    const line = loc.start.line;
    const count = s[id] ?? 0;
    const prev = map.get(line);
    if (prev === undefined || prev < count) map.set(line, count);
  }
  return map;
}

/** Compact a sorted list of line numbers into human-readable ranges: [1,2,3,5] → "1-3, 5". */
export function toRanges(lines) {
  const sorted = [...new Set(lines)].sort((a, b) => a - b);
  const ranges = [];
  let start = null;
  let prev = null;
  for (const n of sorted) {
    if (start === null) {
      start = prev = n;
    } else if (n === prev + 1) {
      prev = n;
    } else {
      ranges.push(start === prev ? `${start}` : `${start}-${prev}`);
      start = prev = n;
    }
  }
  if (start !== null) ranges.push(start === prev ? `${start}` : `${start}-${prev}`);
  return ranges.join(', ');
}

/**
 * Combine changed lines + coverage map + scope filter into a per-file / total diff-coverage
 * report. Only changed lines that are "coverable" (map to a statement) count toward the
 * denominator — comments, blanks and type-only lines are ignored.
 * @param {Map<string, Set<number>>} addedByFile
 * @param {Map<string, object>} coverageByRel istanbul entries keyed by repo-relative path
 * @param {(rel: string) => boolean} inScope
 */
export function computeDiffCoverage(addedByFile, coverageByRel, inScope = isInScope) {
  const files = [];
  const noData = [];
  let totalCoverable = 0;
  let totalCovered = 0;
  for (const rel of [...addedByFile.keys()].filter(inScope).sort()) {
    const entry = coverageByRel.get(rel);
    if (!entry) {
      noData.push(rel);
      continue;
    }
    const hits = lineHits(entry);
    let coverable = 0;
    let covered = 0;
    const uncovered = [];
    for (const ln of [...addedByFile.get(rel)].sort((a, b) => a - b)) {
      if (!hits.has(ln)) continue; // non-executable changed line — excluded from ratio
      coverable += 1;
      if (hits.get(ln) > 0) covered += 1;
      else uncovered.push(ln);
    }
    if (coverable === 0) continue;
    totalCoverable += coverable;
    totalCovered += covered;
    files.push({ file: rel, coverable, covered, uncovered });
  }
  const pct = totalCoverable === 0 ? null : (totalCovered / totalCoverable) * 100;
  return { files, noData, totalCoverable, totalCovered, pct };
}

/**
 * Map a diff-coverage result to an exit decision. Fail-closed: `noData` (in-scope changed
 * files missing from the coverage report) means the coverage/scope mapping is broken, so the
 * diff is UNMEASURABLE — we cannot certify it, hence code 2 regardless of the ratio of the
 * files we could measure. Only an empty scope with no missing files is a clean "nothing to
 * measure" (code 0).
 * @param {{noData: string[], totalCoverable: number, pct: number|null}} result
 * @param {number} min
 * @returns {{code: 0 | 1 | 2, reason: string}}
 */
export function decideExit(result, min) {
  if (result.noData.length > 0) {
    return {
      code: 2,
      reason: `missing coverage data for ${result.noData.length} in-scope file(s)`,
    };
  }
  if (result.totalCoverable === 0) {
    return { code: 0, reason: 'no coverable changed lines' };
  }
  return result.pct >= min
    ? { code: 0, reason: 'threshold met' }
    : { code: 1, reason: 'below threshold' };
}

// ------------------------------------------------------------------ runtime glue

function gitDiff(base) {
  return execFileSync('git', ['diff', '-U0', '--no-color', `${base}...HEAD`], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
  });
}

function runCoverage(outDir) {
  const vitestBin = join(REPO_ROOT, 'node_modules', '.bin', 'vitest');
  const config = join(HERE, 'vitest.diff-cover.config.mjs');
  execFileSync(
    vitestBin,
    [
      'run',
      '--config',
      config,
      '--coverage',
      '--coverage.reporter=json',
      `--coverage.reportsDirectory=${outDir}`,
    ],
    { cwd: REPO_ROOT, stdio: 'inherit' },
  );
}

function loadCoverage(outDir) {
  const json = JSON.parse(readFileSync(join(outDir, 'coverage-final.json'), 'utf8'));
  const byRel = new Map();
  for (const key of Object.keys(json)) {
    const entry = json[key];
    const rel = relative(REPO_ROOT, entry.path ?? key)
      .split('\\')
      .join('/');
    byRel.set(rel, entry);
  }
  return byRel;
}

function printReport(result, base, min) {
  const { files, noData, totalCovered, totalCoverable, pct } = result;
  for (const f of files) {
    const line = `  ${f.file}: covered ${f.covered} of ${f.coverable} changed lines`;
    console.log(f.uncovered.length ? `${line}, uncovered: ${toRanges(f.uncovered)}` : line);
  }
  for (const rel of noData) {
    console.log(`  ${rel}: MISSING from coverage report (scope/coverage mapping drift)`);
  }
  const pctStr = pct === null ? 'n/a' : `${pct.toFixed(1)}%`;
  console.log(
    `diff-cover: ${totalCovered}/${totalCoverable} changed in-scope lines covered ` +
      `(${pctStr}), threshold ${min}%, base ${base}`,
  );
}

export async function main(env = process.env) {
  const base = env.DIFF_COVER_BASE || DEFAULT_BASE;
  const rawMin = env.DIFF_COVER_MIN;
  // Treat unset/blank as "use default" — `Number('')` is 0, which would silently disable the gate.
  const min = rawMin === undefined || String(rawMin).trim() === '' ? DEFAULT_MIN : Number(rawMin);
  if (!Number.isFinite(min) || min < 0 || min > 100) {
    process.stderr.write(`diff-cover: invalid DIFF_COVER_MIN='${rawMin}' (expected 0..100)\n`);
    return 2;
  }

  let diffText;
  try {
    diffText = gitDiff(base);
  } catch (e) {
    process.stderr.write(`diff-cover: could not diff against '${base}': ${e.message}\n`);
    return 2;
  }

  const added = parseAddedLines(diffText);
  const scoped = [...added.keys()].filter(isInScope);
  if (scoped.length === 0) {
    console.log(`diff-cover: no in-scope changed lines vs ${base} — nothing to measure.`);
    return 0;
  }

  const outDir = mkdtempSync(join(tmpdir(), 'diff-cover-'));
  try {
    try {
      runCoverage(outDir);
    } catch (e) {
      process.stderr.write(`diff-cover: vitest coverage run failed: ${e.message}\n`);
      return 1;
    }
    const coverage = loadCoverage(outDir);
    const result = computeDiffCoverage(added, coverage);
    printReport(result, base, min);
    const { code, reason } = decideExit(result, min);
    if (code === 2) {
      process.stderr.write(
        `diff-cover: ${reason} — the diff is unmeasurable (coverage/scope mapping broken); ` +
          `failing closed. Files:\n${result.noData.map((f) => `  ${f}`).join('\n')}\n`,
      );
    } else if (result.totalCoverable === 0) {
      console.log('diff-cover: no coverable changed lines — nothing to measure.');
    }
    return code;
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
}

const invokedDirectly =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  main()
    .then((code) => process.exit(code))
    .catch((e) => {
      process.stderr.write(`diff-cover: ${e?.stack ?? e}\n`);
      process.exit(2);
    });
}
