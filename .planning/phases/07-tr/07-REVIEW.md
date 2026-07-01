---
phase: 07-tr
reviewed: 2026-07-01T15:47:55Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - src/lib/server-api.ts
  - src/lib/api.ts
  - src/lib/server-api.test.ts
  - src/lib/api.test.ts
  - src/app/api/storefront/__tests__/proxy.test.ts
findings:
  critical: 0
  warning: 3
  info: 1
  total: 4
status: issues_found
---

# Phase 7: Code Review Report

**Reviewed:** 2026-07-01T15:47:55Z
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

Phase 7 wires `X-Currency: TRY` into the catalog read paths: `server-api.ts` (SSR
`bffGet`) injects it into the shared `init.headers`, and `api.ts` applies the existing
`currencyHeader()` helper to `fetchProducts`/`fetchCategories`. The default currency was
also flipped `USD → TRY` in `currencyHeader()` and `fetchShippingRates`, and `currencyHeader()`
was exported. Three test files gained `X-Currency` assertions.

The production changes are correct in isolation and introduce **no security regression** —
`X-Storefront-Key` stays server-side (it is only read in `server-api.ts`/route handler, never in
the axios client bundle), and `X-Currency` is non-sensitive. **No BLOCKER-level defects** were found.

Three quality/correctness concerns remain: (1) the sibling client read `fetchProduct` was left
without `X-Currency`, so client-hydrated product-detail pages are now inconsistent with the list
and SSR paths; (2) `server-api.test.ts` ships red (3 failing tests) and the new tests paper over
the root cause with a swallow-all `try/catch`; (3) the "single canonical currency source" comment
is misleading — the `|| 'TRY'` fallback is duplicated across 8 sites with no shared constant.

I verified against the running suite: `vitest run` on the three reviewed test files reports
**3 failed / 21 passed**. The 3 failures were confirmed pre-existing at the phase diff base
(`a2ba277^`) — Phase 7 did not introduce them, but it modified the file and left them red.

## Warnings

### WR-01: Client `fetchProduct` omits X-Currency while sibling catalog reads now send it

**File:** `src/lib/api.ts:134-142`
**Issue:** Phase 7 added `currencyHeader()` to `fetchProducts` (list) and `fetchCategories`, and
`fetchProductServer` (SSR single product) already sends `X-Currency` via the shared `bffGet` header.
But the **client-side single-product read** `fetchProduct(id)` was left untouched — it calls
`api.get('/products/${id}')` with no header override, so only the axios default `X-Tenant-ID` is sent.
The `/api/storefront` proxy forwards `X-Currency` only when present on the inbound request
(`route.ts:50-51` — `if (currency) headers['X-Currency'] = currency`), so no currency reaches the BFF
for this path. `fetchProduct` is consumed by `ProductDetail.tsx:202` (`queryFn: () => fetchProduct(productId)`)
whose `product.price` is rendered directly. Per this file's own `currencyHeader()` comment, the BFF is
currency-sensitive ("USD here makes cart/validate return product_not_found for TRY-priced products"),
so a client-navigated/hydrated product-detail page can receive default-currency pricing that disagrees
with the TRY list and SSR metadata. This asymmetry (list + SSR carry currency, client detail does not)
reads as an oversight, not the intentional single-currency design.
**Fix:**
```ts
export async function fetchProduct(id: string): Promise<{ data: Product }> {
  if (USE_MOCKS) { /* ... */ }
  const { data } = await api.get<{ data: ArmDistributorProduct }>(`/products/${id}`, {
    headers: currencyHeader(),
  });
  return { data: armToProduct(data.data) };
}
```
Verify against BFF behavior; if the BFF genuinely ignores currency on product-detail GET, document that
explicitly rather than leaving the read paths inconsistent.

### WR-02: server-api.test.ts ships red; new tests swallow all errors instead of fixing the fixture

**File:** `src/lib/server-api.test.ts:22-35, 75-88, 160-176`
**Issue:** `vitest run src/lib/server-api.test.ts` reports **3 failing tests** (`returns product data
and sends the tenant header`, `encodes the slug/id path segment`, `walks every page`). Root cause: the
fixtures are flat (`{ data: { id: 'p1', name: 'BASE GEL' } }`) but `armToProduct` reads the nested
`dp.product.name` (`arm-adapter.ts:33`), so the adapter throws. The two new Phase 7 tests
(`sends X-Currency: TRY on the product-detail fetch`, `... on the all-products walk`) knowingly reuse
this broken fixture and wrap the call in a bare `try { ... } catch {}` that swallows **every** error,
then assert on `fetchMock.mock.calls[0]`. This is a test-reliability smell: the empty catch hides any
future regression in the function's pre-fetch control flow (only a "fetch never called" failure survives,
because destructuring `mock.calls[0]` then throws). The clean D-06 coverage already exists in
`fetchCategoriesServer` (line 92-106, resolvable fixture, no catch), making the two swallow-all variants
low-value. A nested fixture would have fixed both the new assertions **and** the 3 pre-existing failures.
**Fix:** Use a fixture matching the adapter and drop the try/catch, e.g.:
```ts
json: async () => ({ data: { id: 'dp1', price: '10', product: { name: 'BASE GEL' } } }),
```
Then assert normally (`const [, init] = fetchMock.mock.calls[0]`) with no catch. This also greens the
suite so CI/`vitest run` is a meaningful gate.

### WR-03: Misleading "single canonical currency source" comment over duplicated TRY fallback

**File:** `src/lib/server-api.ts:32-33` (also `src/lib/api.ts:158`, `src/lib/api.ts:234`)
**Issue:** The new comment states `// D-06: single canonical currency source, reused across api.ts /
money.ts / here.` — but there is no shared constant/module. `NEXT_PUBLIC_STOREFRONT_CURRENCY || 'TRY'`
is independently re-derived in at least 8 locations (`server-api.ts:33`, `api.ts:158`, `api.ts:234`,
`money.ts:10`, `seo.ts:68`, `seo.ts:159`, `checkout/page.tsx:84`, `basket/page.tsx:50`). The comment
claims a single source that does not exist, and this exact duplication is what produced the `USD`/`TRY`
drift the phase is fixing (the old `currencyHeader()` still defaulted `USD`). Any future default change
must touch all 8 sites or silently reintroduce the bug.
**Fix:** Extract one shared constant and import it everywhere, e.g. in `src/lib/currency.ts`:
```ts
export const STOREFRONT_CURRENCY = process.env.NEXT_PUBLIC_STOREFRONT_CURRENCY || 'TRY';
```
then `import { STOREFRONT_CURRENCY }` in `server-api.ts`, `api.ts`, `money.ts`, `seo.ts`, and the pages,
and correct the comment. If a shared module is out of scope, remove the false "single canonical source"
claim so it does not mislead.

## Info

### IN-01: Currency read at module-load in server-api.ts vs call-time in api.ts

**File:** `src/lib/server-api.ts:33` vs `src/lib/api.ts:158`
**Issue:** `server-api.ts` captures `STOREFRONT_CURRENCY` once at module load (`const`), while
`api.ts` `currencyHeader()` re-reads `process.env` on every call. The `api.test.ts` suite depends on
call-time reads (it `delete process.env.NEXT_PUBLIC_STOREFRONT_CURRENCY` in `beforeEach` then dynamic-imports).
The server-side const cannot be overridden per-request or per-test without a module reset. Harmless today
(env is static in the Next server runtime and both default `TRY`), but the inconsistency is a latent
testability wrinkle.
**Fix:** Standardize on one approach — ideally the shared constant from WR-03 — so both sides behave identically.

---

_Reviewed: 2026-07-01T15:47:55Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
