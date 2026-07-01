'use client';

import { createContext, useContext } from 'react';

const CurrencyContext = createContext<string | undefined>(undefined);
const FormatLocaleContext = createContext<string | undefined>(undefined);

/**
 * Provides the active storefront display currency AND the country-derived
 * format locale (D1), both resolved once server-side in the locale layout
 * (`getStorefrontConfig()` + `formatLocaleFromCountry()`) and threaded
 * through as `initialCurrency`/`initialFormatLocale`. Server-rendered HTML
 * and the client's first render use the same values, so there is no
 * hydration mismatch and no visible flash.
 */
export function CurrencyProvider({
  initialCurrency,
  initialFormatLocale,
  children,
}: {
  initialCurrency: string;
  initialFormatLocale: string;
  children: React.ReactNode;
}) {
  return (
    <CurrencyContext.Provider value={initialCurrency}>
      <FormatLocaleContext.Provider value={initialFormatLocale}>
        {children}
      </FormatLocaleContext.Provider>
    </CurrencyContext.Provider>
  );
}

export function useCurrency(): string {
  const ctx = useContext(CurrencyContext);
  if (ctx === undefined) {
    return process.env.NEXT_PUBLIC_STOREFRONT_CURRENCY || 'TRY';
  }
  return ctx;
}

/**
 * Country-derived CANONICAL format locale (D1/D3) — use for ALL money and
 * date formatting so number separators/symbol position follow the tenant's
 * country, not the UI language.
 */
export function useFormatLocale(): string {
  const ctx = useContext(FormatLocaleContext);
  if (ctx === undefined) {
    return 'en-US';
  }
  return ctx;
}
