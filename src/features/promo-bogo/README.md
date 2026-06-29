# BOGO Promo Feature (Storefront)

Isolated UI for the **Color Gel 1+1** campaign (25-31 May 2026). Includes:

- `PromoBanner` — home-page banner
- `PromoBadge` — "1+1" chip on product cards
- `PromoPlashka` — applied-discount notice in basket
- `useAutoPromo` — hook reading `auto_promo` from `/cart/validate`

## Date control

Dates live in `config.ts` (`PROMO_FROM_ISO`, `PROMO_TO_ISO`). Banner and badge
auto-hide outside the window — no code redeploy needed when the promo ends.

## How to remove this feature

After the promo ends, you have two options:

**Soft-disable** (recommended if you might re-run the promo):
- Deactivate the live promo: `python3 scripts/delete_promo_colorgel_2x1.py 8060`
- Banner and badge stop showing because dates have passed.

**Hard-remove** (full cleanup):
1. `git grep -nl "BOGO HOOK"` → delete each `// BOGO HOOK START` … `// BOGO HOOK END` block (one in `page.tsx`, one in `ProductCard.tsx`, one in `basket/page.tsx`, plus one in `lib/api.ts` if present).
2. `rm -rf services/storefront/src/features/promo-bogo`
3. `rm -rf services/storefront/public/promo-bogo`
4. Mirror the same on the BFF side — see `packs/oms/bff/promo-bogo/README.md`.
5. Rebuild + redeploy storefront and BFF.
