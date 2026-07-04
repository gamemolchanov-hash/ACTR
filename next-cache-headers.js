/**
 * FBG-227 — Cache-Control for public/ static assets.
 *
 * Next standalone serves everything under public/ without a Cache-Control
 * header, so Cloudflare falls back to its 4h default browser TTL and returning
 * visitors keep re-downloading unchanged chrome (icons, fonts, logo, hero, the
 * static page art). Lighthouse mobile flags this as "use efficient cache
 * lifetimes".
 *
 * Every asset under the dirs below is fingerprinted by convention — change the
 * bytes → change the filename — so a 1-year immutable TTL is safe: a given URL
 * never serves different content. (_next/static/* is already immutable out of
 * the box and is deliberately not matched here.)
 *
 * Kept out on purpose:
 *  - favicon.ico is auto-requested by browsers at the fixed root path and can't
 *    be renamed, so it gets a modest revalidatable week TTL instead of a year of
 *    immutability that a rebrand couldn't bust.
 *  - robots.txt is crawler config (not a page resource Lighthouse audits) and
 *    must stay fresh, so it's left on the platform default.
 *
 * Shared as a plain CJS module so next.config.js and the vitest guard read the
 * exact same table (single source of truth).
 */
const IMMUTABLE_ONE_YEAR = 'public, max-age=31536000, immutable';

// public/ subtrees whose every asset is rename-on-change (safe to freeze).
// `:path*` is a catch-all, so nested art like /images/contacts/* is covered.
const IMMUTABLE_DIRS = ['icons', 'fonts', 'hero', 'images'];

const STATIC_CACHE_HEADERS = [
  ...IMMUTABLE_DIRS.map((dir) => ({
    source: `/${dir}/:path*`,
    headers: [{ key: 'Cache-Control', value: IMMUTABLE_ONE_YEAR }],
  })),
  {
    // Root logo referenced at a fixed path in Header.tsx — versioned by rename.
    source: '/logo.png',
    headers: [{ key: 'Cache-Control', value: IMMUTABLE_ONE_YEAR }],
  },
  {
    // Fixed root path → can't be renamed; cacheable but revalidatable (1 week).
    source: '/favicon.ico',
    headers: [{ key: 'Cache-Control', value: 'public, max-age=604800' }],
  },
];

module.exports = { STATIC_CACHE_HEADERS, IMMUTABLE_ONE_YEAR, IMMUTABLE_DIRS };
