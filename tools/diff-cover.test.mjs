import { describe, expect, it } from 'vitest';
import {
  computeDiffCoverage,
  decideExit,
  isInScope,
  lineHits,
  parseAddedLines,
  toRanges,
} from './diff-cover.mjs';

// Minimal istanbul FileCoverage builder: `lines` maps line-number → hit count.
function coverageEntry(path, lines) {
  const statementMap = {};
  const s = {};
  let i = 0;
  for (const [line, count] of Object.entries(lines)) {
    statementMap[i] = {
      start: { line: Number(line), column: 0 },
      end: { line: Number(line), column: null },
    };
    s[i] = count;
    i += 1;
  }
  return { path, statementMap, s };
}

describe('parseAddedLines', () => {
  it('extracts new-side line numbers from -U0 hunks', () => {
    const diff = [
      'diff --git a/src/lib/foo.ts b/src/lib/foo.ts',
      'index 111..222 100644',
      '--- a/src/lib/foo.ts',
      '+++ b/src/lib/foo.ts',
      '@@ -12,0 +13,2 @@',
      '+const a = 1;',
      '+const b = 2;',
      '@@ -20 +22 @@ export function ctx()',
      '-old();',
      '+changed();',
    ].join('\n');
    const added = parseAddedLines(diff);
    expect([...added.get('src/lib/foo.ts')].sort((a, b) => a - b)).toEqual([13, 14, 22]);
  });

  it('handles multiple files and ignores pure deletions', () => {
    const diff = [
      'diff --git a/src/lib/a.ts b/src/lib/a.ts',
      '--- a/src/lib/a.ts',
      '+++ b/src/lib/a.ts',
      '@@ -5,2 +5,0 @@', // pure deletion → no added lines
      '-gone1();',
      '-gone2();',
      'diff --git a/src/lib/b.ts b/src/lib/b.ts',
      '--- a/src/lib/b.ts',
      '+++ b/src/lib/b.ts',
      '@@ -1 +1,1 @@',
      '+first();',
    ].join('\n');
    const added = parseAddedLines(diff);
    expect(added.has('src/lib/a.ts')).toBe(false);
    expect([...added.get('src/lib/b.ts')]).toEqual([1]);
  });

  it('treats a deleted file (+++ /dev/null) as having no added lines', () => {
    const diff = [
      'diff --git a/src/lib/gone.ts b/src/lib/gone.ts',
      '--- a/src/lib/gone.ts',
      '+++ /dev/null',
      '@@ -1,2 +0,0 @@',
      '-a();',
      '-b();',
    ].join('\n');
    expect(parseAddedLines(diff).size).toBe(0);
  });

  it('returns an empty map for an empty diff', () => {
    expect(parseAddedLines('').size).toBe(0);
  });
});

describe('lineHits', () => {
  it('maps statement start lines to their hit counts (max per line)', () => {
    const entry = {
      statementMap: {
        0: { start: { line: 10, column: 0 } },
        1: { start: { line: 10, column: 20 } }, // same line, higher count wins
        2: { start: { line: 11, column: 0 } },
      },
      s: { 0: 0, 1: 3, 2: 0 },
    };
    const hits = lineHits(entry);
    expect(hits.get(10)).toBe(3);
    expect(hits.get(11)).toBe(0);
    expect(hits.has(12)).toBe(false);
  });

  it('tolerates a missing/empty entry', () => {
    expect(lineHits(undefined).size).toBe(0);
    expect(lineHits({}).size).toBe(0);
  });
});

describe('toRanges', () => {
  it('compacts consecutive runs', () => {
    expect(toRanges([1, 2, 3, 5, 7, 8])).toBe('1-3, 5, 7-8');
    expect(toRanges([42])).toBe('42');
    expect(toRanges([])).toBe('');
  });
});

describe('isInScope (ACTR)', () => {
  it('includes app source under src/ (.ts and .tsx)', () => {
    expect(isInScope('src/lib/money.ts')).toBe(true);
    expect(isInScope('src/lib/server-api.ts')).toBe(true);
    expect(isInScope('src/components/ProductCard.tsx')).toBe(true);
    expect(isInScope('src/app/[locale]/checkout/page.tsx')).toBe(true);
    expect(isInScope('src/middleware.ts')).toBe(true);
  });

  it('excludes non-src, tests, __tests__ helpers and type decls', () => {
    expect(isInScope('tools/diff-cover.mjs')).toBe(false);
    expect(isInScope('scripts/messages-pull.mjs')).toBe(false);
    expect(isInScope('next.config.mjs')).toBe(false);
    expect(isInScope('src/lib/money.test.ts')).toBe(false);
    expect(isInScope('src/components/__tests__/ProductCard.priority.test.tsx')).toBe(false);
    expect(isInScope('src/components/__tests__/ui-assets.weight.test.ts')).toBe(false);
    expect(isInScope('src/lib/arm-types.d.ts')).toBe(false);
    expect(isInScope('src/lib/money.js')).toBe(false);
    expect(isInScope('messages/en.json')).toBe(false);
  });
});

describe('computeDiffCoverage', () => {
  const added = new Map([
    ['src/lib/a.ts', new Set([10, 11, 12, 30])], // 30 is a comment (no statement)
    ['src/lib/x.test.ts', new Set([1, 2])], // out of scope → ignored
    ['src/lib/untested.ts', new Set([5])], // no coverage entry → noData
  ]);
  const coverage = new Map([
    ['src/lib/a.ts', coverageEntry('/repo/src/lib/a.ts', { 10: 1, 11: 0, 12: 5 })],
  ]);

  it('counts only coverable changed lines and reports uncovered ranges', () => {
    const r = computeDiffCoverage(added, coverage);
    expect(r.files).toHaveLength(1);
    const f = r.files[0];
    expect(f.file).toBe('src/lib/a.ts');
    expect(f.coverable).toBe(3); // lines 10,11,12 have statements; 30 does not
    expect(f.covered).toBe(2); // 10 and 12 hit, 11 not
    expect(f.uncovered).toEqual([11]);
    expect(r.totalCoverable).toBe(3);
    expect(r.totalCovered).toBe(2);
    expect(r.pct).toBeCloseTo((2 / 3) * 100);
    expect(r.noData).toEqual(['src/lib/untested.ts']);
  });

  it('yields pct null when nothing coverable is in scope', () => {
    const r = computeDiffCoverage(new Map([['src/lib/x.test.ts', new Set([1])]]), new Map());
    expect(r.pct).toBeNull();
    expect(r.totalCoverable).toBe(0);
    expect(r.files).toEqual([]);
  });
});

describe('decideExit (fail-closed on missing coverage data)', () => {
  it('fails closed (code 2) when an in-scope file is missing from the coverage report', () => {
    // Even with a perfect ratio on the file we could measure, noData must not be swallowed.
    const result = { noData: ['src/lib/critical.ts'], totalCoverable: 3, pct: 100 };
    expect(decideExit(result, 60).code).toBe(2);
  });

  it('fails closed (code 2) when ALL in-scope files are missing (path mapping broken)', () => {
    const result = {
      noData: ['src/lib/a.ts', 'src/lib/b.ts'],
      totalCoverable: 0,
      pct: null,
    };
    expect(decideExit(result, 60).code).toBe(2);
  });

  it('treats empty scope with no missing files as a clean pass (code 0)', () => {
    expect(decideExit({ noData: [], totalCoverable: 0, pct: null }, 60).code).toBe(0);
  });

  it('passes at/above threshold and fails below it', () => {
    expect(decideExit({ noData: [], totalCoverable: 5, pct: 60 }, 60).code).toBe(0);
    expect(decideExit({ noData: [], totalCoverable: 5, pct: 59.9 }, 60).code).toBe(1);
  });
});
