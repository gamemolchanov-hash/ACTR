'use client';

/**
 * Own ARM analytics (nav.js, 02.10.2026): the cookieless visit collector served
 * by the ARM BFF through the storefront proxy. Loaded only with consent to the
 * «analytics» category of the cookie banner (KVKK) — the collector sets no
 * cookies, but the banner promises that analytics runs only when accepted.
 */
import Script from 'next/script';
import { useConsent } from '@/providers/CookieConsentProvider';

export function ArmNavScript() {
  const { hydrated, canRun } = useConsent();
  if (!hydrated || !canRun('analytics')) return null;
  return <Script id="arm-nav" src="/api/storefront/nav.js" strategy="afterInteractive" />;
}
