/**
 * FBG-227 — Cache-Control for public/ static assets.
 *
 * Locks the header table Next serves for public/ so a returning visitor stops
 * re-fetching unchanged chrome on Cloudflare's 4h default TTL. Guards both the
 * exact acceptance value (`curl -sI /icons/cart.svg` → 1-year immutable) and the
 * two deliberate exceptions (favicon.ico revalidatable, robots.txt untouched),
 * plus that next.config.js actually wires the table into headers().
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  STATIC_CACHE_HEADERS,
  IMMUTABLE_ONE_YEAR,
  IMMUTABLE_DIRS,
} from '../../next-cache-headers.js';

type Rule = { source: string; headers: { key: string; value: string }[] };

const rules = STATIC_CACHE_HEADERS as Rule[];
const bySource = (src: string) => rules.find((r) => r.source === src);
const cacheValue = (rule?: Rule) =>
  rule?.headers.find((h) => h.key.toLowerCase() === 'cache-control')?.value;

describe('FBG-227 — public/ static Cache-Control', () => {
  it('freezes the exact acceptance value (matches the curl criterion)', () => {
    expect(IMMUTABLE_ONE_YEAR).toBe('public, max-age=31536000, immutable');
  });

  it.each(IMMUTABLE_DIRS)('serves /%s/* immutable for a year', (dir) => {
    // `:path*` is a catch-all, so nested art like /images/contacts/* is covered.
    const rule = bySource(`/${dir}/:path*`);
    expect(rule).toBeDefined();
    expect(rule!.source).toBe(`/${dir}/:path*`);
    expect(cacheValue(rule)).toBe(IMMUTABLE_ONE_YEAR);
  });

  it('covers the Lighthouse-flagged chrome (icons/*, logo.png)', () => {
    // payment-sprite.svg + trending-topic.png live under /icons.
    expect(cacheValue(bySource('/icons/:path*'))).toBe(IMMUTABLE_ONE_YEAR);
    expect(cacheValue(bySource('/logo.png'))).toBe(IMMUTABLE_ONE_YEAR);
  });

  it('keeps favicon.ico cacheable but revalidatable, never immutable', () => {
    // Fixed root path → can't be renamed, so a year of immutability would trap
    // a rebrand. A ≥1-day TTL still clears the Lighthouse cache audit.
    const value = cacheValue(bySource('/favicon.ico'));
    expect(value).toBeDefined();
    expect(value).toMatch(/^public, max-age=\d+$/);
    expect(value).not.toContain('immutable');
    expect(Number(value!.match(/max-age=(\d+)/)![1])).toBeGreaterThanOrEqual(86400);
  });

  it('never freezes robots.txt (crawler rules must stay fresh)', () => {
    expect(bySource('/robots.txt')).toBeUndefined();
    for (const rule of rules) {
      expect(rule.source).not.toContain('robots');
    }
  });

  it('emits exactly one Cache-Control per rule and no short TTLs', () => {
    for (const rule of rules) {
      const cc = rule.headers.filter((h) => h.key.toLowerCase() === 'cache-control');
      expect(cc).toHaveLength(1);
      expect(cc[0].value).not.toMatch(/no-store|no-cache|max-age=0\b/);
    }
  });
});

describe('FBG-227 — next.config wires the table into headers()', () => {
  const config = readFileSync(resolve(__dirname, '../../next.config.js'), 'utf8');

  it('requires the shared table and returns it from an async headers()', () => {
    expect(config).toMatch(/require\(['"]\.\/next-cache-headers['"]\)/);
    expect(config).toMatch(/async headers\(\)/);
    expect(config).toContain('STATIC_CACHE_HEADERS');
  });
});
