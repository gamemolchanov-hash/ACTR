'use client';

import { useEffect, useState } from 'react';

/**
 * Shape of the auto-applied promo returned by BFF /cart/validate.
 * Mirrors `BogoResult` in packs/oms/bff/promo-bogo/validator.ts.
 */
export interface AutoPromoData {
  valid: boolean;
  discount_amount: number;
  free_quantity: number;
  eligible_quantity?: number;
  code: string;
  description: string | null;
  promo_id: string;
  discount_type: 'bogo';
}

/**
 * Hook that extracts `auto_promo` from a /cart/validate response and keeps
 * sessionStorage in sync so the checkout page can read it.
 *
 * Pass the raw response data (e.g. `validateRes.data`). The hook reads the
 * `auto_promo` field if present (added by the BFF promo-bogo enricher).
 */
export function useAutoPromo(
  validateData: { auto_promo?: AutoPromoData | null } | null | undefined,
): AutoPromoData | null {
  const [autoPromo, setAutoPromo] = useState<AutoPromoData | null>(null);

  useEffect(() => {
    const promo = (validateData?.auto_promo ?? null) as AutoPromoData | null;
    setAutoPromo(promo);

    if (promo && promo.discount_amount > 0) {
      // Use same sessionStorage key as manual promo so checkout can pick it up.
      sessionStorage.setItem(
        'checkout_promo',
        JSON.stringify({
          valid: true,
          code: promo.code,
          discount_type: promo.discount_type,
          discount_value: 0,
          discount_amount: promo.discount_amount,
          description: promo.description,
          promo_id: promo.promo_id,
          auto_apply: true,
        }),
      );
    } else {
      // Clear only if we previously had an auto_apply entry — don't overwrite a manual promo.
      try {
        const raw = sessionStorage.getItem('checkout_promo');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.auto_apply) sessionStorage.removeItem('checkout_promo');
        }
      } catch {
        /* ignore */
      }
    }
  }, [validateData]);

  return autoPromo;
}
