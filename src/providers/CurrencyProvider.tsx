'use client';

import { createContext, useContext } from 'react';

const CurrencyContext = createContext<string | undefined>(undefined);

/**
 * Provides the active storefront display currency, resolved once server-side
 * in the locale layout via `getStorefrontCurrency()` and threaded through as
 * `initialCurrency`. Server-rendered HTML and the client's first render use
 * the same value, so there is no hydration mismatch and no visible
 * TRY -> config.currency flash.
 */
export function CurrencyProvider({
  initialCurrency,
  children,
}: {
  initialCurrency: string;
  children: React.ReactNode;
}) {
  return <CurrencyContext.Provider value={initialCurrency}>{children}</CurrencyContext.Provider>;
}

export function useCurrency(): string {
  const ctx = useContext(CurrencyContext);
  if (ctx === undefined) {
    return process.env.NEXT_PUBLIC_STOREFRONT_CURRENCY || 'TRY';
  }
  return ctx;
}
