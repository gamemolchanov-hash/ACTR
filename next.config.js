const { withSentryConfig } = require('@sentry/nextjs');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  skipTrailingSlashRedirect: true,

  async redirects() {
    // Old Bitrix category slugs → new storefront category slugs
    const categoryMap = {
      bazovye_pokrytiya: 'base_gel',
      topovye_pokrytiya: 'top_gel',
      tsvetnye_geli: 'color_gel',
      tsvetnye_bazovye_pokrytiya: 'base_gel',
      kamuflyazhi_disguise_col_: 'disguise_collection',
      geli_dlya_narashchivaniya: 'build_up_gel',
    };

    const redirects = [];

    // ── Static pages ──

    // /help/delivery/ → /delivery
    redirects.push({ source: '/help/delivery', destination: '/delivery', statusCode: 301 });
    redirects.push({ source: '/help/delivery/', destination: '/delivery', statusCode: 301 });

    // /info/faq/ → /faq
    redirects.push({ source: '/info/faq', destination: '/faq', statusCode: 301 });
    redirects.push({ source: '/info/faq/', destination: '/faq', statusCode: 301 });

    // /contacts/ → /contacts (trailing slash)
    redirects.push({ source: '/contacts/', destination: '/contacts', statusCode: 301 });

    // /basket/ → /basket (trailing slash)
    redirects.push({ source: '/basket/', destination: '/basket', statusCode: 301 });

    // /novinki.php → /catalog?sort=-date_created
    redirects.push({
      source: '/novinki.php',
      destination: '/catalog?sort=-date_created',
      statusCode: 301,
    });

    // /ankety/ pages → /partners
    redirects.push({ source: '/ankety', destination: '/partners', statusCode: 301 });
    redirects.push({ source: '/ankety/', destination: '/partners', statusCode: 301 });
    redirects.push({ source: '/ankety/nailstudios.php', destination: '/studios', statusCode: 301 });
    redirects.push({
      source: '/ankety/magazinam.php',
      destination: '/partners/shops',
      statusCode: 301,
    });
    redirects.push({
      source: '/ankety/bloggers.php',
      destination: '/partners/bloggers',
      statusCode: 301,
    });
    redirects.push({
      source: '/ankety/schools.php',
      destination: '/partners/schools',
      statusCode: 301,
    });

    // /auth/ → /login
    redirects.push({ source: '/auth', destination: '/login', statusCode: 301 });
    redirects.push({ source: '/auth/', destination: '/login', statusCode: 301 });
    redirects.push({ source: '/auth/registration', destination: '/login', statusCode: 301 });
    redirects.push({ source: '/auth/registration/', destination: '/login', statusCode: 301 });

    // /personal/ → /login
    redirects.push({ source: '/personal', destination: '/login', statusCode: 301 });
    redirects.push({ source: '/personal/', destination: '/login', statusCode: 301 });
    redirects.push({ source: '/personal/:path*', destination: '/login', statusCode: 301 });

    // /catalog/compare.php → /catalog
    redirects.push({ source: '/catalog/compare.php', destination: '/catalog', statusCode: 301 });

    // ── Product pages (BEFORE category pages — more specific match) ──
    // /catalog/{old_category}/{product_id}/ → /catalog/{new_category}/{product_id}

    // vse_tovary products → "all" (ProductDetail resolves by slug, ignores category)
    redirects.push({
      source: '/catalog/vse_tovary/:id/',
      destination: '/catalog/all/:id',
      statusCode: 301,
    });
    redirects.push({
      source: '/catalog/vse_tovary/:id',
      destination: '/catalog/all/:id',
      statusCode: 301,
    });

    // must_have products → "all"
    redirects.push({
      source: '/catalog/must_have/:id/',
      destination: '/catalog/all/:id',
      statusCode: 301,
    });
    redirects.push({
      source: '/catalog/must_have/:id',
      destination: '/catalog/all/:id',
      statusCode: 301,
    });

    // Old category products → new category
    for (const [oldSlug, newSlug] of Object.entries(categoryMap)) {
      redirects.push({
        source: `/catalog/${oldSlug}/:id/`,
        destination: `/catalog/${newSlug}/:id`,
        statusCode: 301,
      });
      redirects.push({
        source: `/catalog/${oldSlug}/:id`,
        destination: `/catalog/${newSlug}/:id`,
        statusCode: 301,
      });
    }

    // ── Category pages (without product ID) ──

    // /catalog/vse_tovary/ → /catalog (all products)
    redirects.push({ source: '/catalog/vse_tovary', destination: '/catalog', statusCode: 301 });
    redirects.push({ source: '/catalog/vse_tovary/', destination: '/catalog', statusCode: 301 });

    // /catalog/must_have/ → /catalog (products are in various new categories)
    redirects.push({ source: '/catalog/must_have', destination: '/catalog', statusCode: 301 });
    redirects.push({ source: '/catalog/must_have/', destination: '/catalog', statusCode: 301 });

    // Old categories → new categories
    for (const [oldSlug, newSlug] of Object.entries(categoryMap)) {
      redirects.push({
        source: `/catalog/${oldSlug}`,
        destination: `/catalog/${newSlug}`,
        statusCode: 301,
      });
      redirects.push({
        source: `/catalog/${oldSlug}/`,
        destination: `/catalog/${newSlug}`,
        statusCode: 301,
      });
    }

    // /catalog/ with trailing slash
    redirects.push({ source: '/catalog/', destination: '/catalog', statusCode: 301 });

    return redirects;
  },

  // Phase 1: `/api/storefront/*` теперь обслуживает ARM route-handler
  // (src/app/api/storefront/[...path]/route.ts) с server-side X-Storefront-Key.
  // Картинки идут туда же (ARM `/images/:tenantId/*`). Прежний OMS-rewrite убран.
};

module.exports = withSentryConfig(nextConfig, {
  // Suppress source map upload warnings when no auth token
  silent: true,
  // Don't widen the scope of tree-shaking done by bundlers
  disableLogger: true,
});
