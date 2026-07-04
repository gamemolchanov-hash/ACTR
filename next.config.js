const { withSentryConfig } = require('@sentry/nextjs');
const createNextIntlPlugin = require('next-intl/plugin');
const { STATIC_CACHE_HEADERS } = require('./next-cache-headers');

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  skipTrailingSlashRedirect: true,

  // FBG-227: long-lived Cache-Control for public/ static so returning visitors
  // stop re-downloading unchanged chrome on Cloudflare's 4h default TTL.
  // Table (and the rename-on-change rationale) lives in ./next-cache-headers.js.
  async headers() {
    return STATIC_CACHE_HEADERS;
  },

  async redirects() {
    // Trailing-slash hygiene only for existing TR routes (D-07, CLEAN-01).
    // All legacy Bitrix/RU URL-migration redirects removed — a TR-native
    // site has no legacy Bitrix URLs to migrate from. Every surviving
    // destination below is a static, same-origin literal path (no
    // user-input interpolation — open-redirect invariant holds, T-06-06).
    return [
      { source: '/contacts/', destination: '/contacts', statusCode: 301 },
      { source: '/basket/', destination: '/basket', statusCode: 301 },
      { source: '/catalog/', destination: '/catalog', statusCode: 301 },
    ];
  },

  // Phase 1: `/api/storefront/*` теперь обслуживает ARM route-handler
  // (src/app/api/storefront/[...path]/route.ts) с server-side X-Storefront-Key.
  // Картинки идут туда же (ARM `/images/:tenantId/*`). Прежний OMS-rewrite убран.
};

module.exports = withSentryConfig(withNextIntl(nextConfig), {
  // Suppress source map upload warnings when no auth token
  silent: true,
  // Don't widen the scope of tree-shaking done by bundlers
  disableLogger: true,
});
