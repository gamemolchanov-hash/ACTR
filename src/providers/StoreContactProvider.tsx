'use client';

import { createContext, useContext, type ReactNode } from 'react';

/**
 * Public contact phone for the storefront chrome (footer) and the Contacts page.
 *
 * Read once per render in the locale layout from `getStorefrontConfig()` (BFF
 * `/config` → `contact_phone`, i.e. the distributor's phone in Portal) and handed
 * down here, so the number is changed in Portal instead of in code. The 5-minute
 * config cache is fine for a phone. Null → the phone and the WhatsApp icon are
 * simply not shown.
 */
const StoreContactContext = createContext<string | null>(null);

export function StoreContactProvider({
  phone,
  children,
}: {
  phone: string | null;
  children: ReactNode;
}) {
  return <StoreContactContext.Provider value={phone}>{children}</StoreContactContext.Provider>;
}

export function useStoreContactPhone(): string | null {
  return useContext(StoreContactContext);
}
