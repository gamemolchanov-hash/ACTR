/**
 * Localised 404 (FBG-126).
 *
 * Async Server Component — body is rendered to static HTML and NOT hydrated,
 * reducing hydration surface for garbage/bot traffic (old .php URLs) that were
 * causing recoverable hydration errors in GlitchTip. The "go home" link is a plain
 * <a> (not next/link) to avoid pulling extra client code into the 404 bundle.
 *
 * Located inside [locale] segment so NextIntl provider is active; uses
 * getTranslations (server-side) to avoid the 'use client' penalty.
 */
import { getTranslations } from 'next-intl/server';

export default async function NotFound() {
  const t = await getTranslations('errors');

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        padding: '24px',
        textAlign: 'center',
      }}
    >
      <p style={{ margin: '0 0 8px', fontSize: '48px', fontWeight: 700, lineHeight: 1 }}>404</p>
      <h2 style={{ margin: '0 0 12px', fontSize: '20px' }}>{t('notFoundTitle')}</h2>
      <p style={{ margin: '0 0 24px', color: '#666', fontSize: '14px' }}>
        {t('notFoundDesc')}
      </p>
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- intentional plain <a>: a full reload to "/" keeps this 404 a non-hydrated Server Component (see file docstring), so next/link is deliberately not used here. */}
      <a
        href="/"
        style={{
          padding: '10px 24px',
          backgroundColor: '#111',
          color: '#fff',
          borderRadius: '4px',
          fontSize: '14px',
          fontWeight: 500,
          textDecoration: 'none',
        }}
      >
        {t('backHome')}
      </a>
    </div>
  );
}
