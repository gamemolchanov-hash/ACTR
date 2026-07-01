# Phase 7: Каталог-данные TR - Pattern Map

**Mapped:** 2026-07-01
**Files analyzed:** 5
**Analogs found:** 5 / 5 (4 exact-file self-analogs — modify in place; 1 new-file scaffold assembled from 2 partial analogs, no exact match exists)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|----------------|
| `src/lib/server-api.ts` | service (SSR BFF fetcher) | request-response | itself — `bffGet()`'s existing `init.headers` seam (lines 71-77) | exact (same file, same seam, add one header key) |
| `src/lib/api.ts` | service (client axios fetcher) | request-response | itself — `currencyHeader()` usage at L184/204/232/275 (`validatePromo`/`validateCart`/`fetchShippingRates`/`createOrder`) | exact (same file, same helper, apply to 2 more call sites) |
| `src/lib/server-api.test.ts` | test | request-response | itself — existing `fetchProductServer` fetch-mock test at lines 20-35 | exact (same file, extend existing `init.headers` assertion) |
| `src/lib/api.test.ts` (NEW) | test | request-response | `src/lib/currency-default.test.ts` (scaffold/style: dynamic import, env reset, vitest describe/it) + `src/lib/server-api.test.ts` (fetch-mock → for `api.test.ts` use `vi.mock('axios')` instead, no exact axios-mock analog exists in repo) | role-match (no axios-mock test file exists yet in this repo — assembled from 2 partial analogs, see below) |
| `src/app/api/storefront/__tests__/proxy.test.ts` | test | request-response | itself — existing `?lang` injection test block (lines 49-112), `makeReq`/`mockFetch`/`makeCtx` harness (lines 13-47) | exact (same file, same harness, add analogous `X-Currency` case) |

## Pattern Assignments

### `src/lib/server-api.ts` (service, request-response)

**Analog:** itself, `bffGet()` (lines 63-88)

**Current headers block to modify** (lines 71-77):
```typescript
const init: RequestInit & { next?: { revalidate?: number } } = {
  headers: {
    'X-Tenant-ID': TENANT_ID,
    ...(STOREFRONT_KEY ? { 'X-Storefront-Key': STOREFRONT_KEY } : {}),
  },
  next: { revalidate: REVALIDATE_SECONDS },
};
```

**Pattern to copy — add a module-level currency constant next to the existing `TENANT_ID`/`STOREFRONT_KEY` constants (lines 30-31)**, matching the exact fallback expression already used in `api.ts:153` (`currencyHeader()`) and `money.ts:10` — do not invent a new literal:
```typescript
// place alongside TENANT_ID / STOREFRONT_KEY (line ~31)
const STOREFRONT_CURRENCY = process.env.NEXT_PUBLIC_STOREFRONT_CURRENCY || 'TRY';
```
Then extend the `init.headers` object (line 73-74):
```typescript
headers: {
  'X-Tenant-ID': TENANT_ID,
  ...(STOREFRONT_KEY ? { 'X-Storefront-Key': STOREFRONT_KEY } : {}),
  'X-Currency': STOREFRONT_CURRENCY,
},
```
This single edit covers all three exported SSR fetchers (`fetchProductServer`, `fetchCategoriesServer`, `fetchAllProductsServer`) since they all funnel through `bffGet()` — no per-function threading needed.

**Stale comment fix (line 8):** replace `${BFF}/public/oms/storefront/*` with `${BFF}/public/arm/storefront/*` (the constant `STOREFRONT_BASE` at line 32 already uses `arm`; only the docstring is stale).

**Error handling pattern (unchanged, do not touch):** `bffGet()` lines 79-88 — the 404→`null` vs 5xx→`throw BffUnavailableError` split is load-bearing (FBG-67 review) and orthogonal to this phase's header change.

---

### `src/lib/api.ts` (service, request-response)

**Analog:** itself — `currencyHeader()` helper (lines 149-154) and its 4 existing call sites (`validatePromo` L181-185, `validateCart` L201-205, `fetchShippingRates` L225-233, `createOrder` L274-276)

**Helper, already exists — reuse verbatim, do not duplicate:**
```typescript
// src/lib/api.ts:149-154
export function currencyHeader(): Record<string, string> {
  return { 'X-Currency': process.env.NEXT_PUBLIC_STOREFRONT_CURRENCY || 'TRY' };
}
```

**Core pattern to copy into `fetchProducts` (currently lines 97-129, GET call at line 127) and `fetchCategories` (currently lines 141-145, GET call at line 143)** — mirror the exact `{ headers: currencyHeader() }` shape used in `validatePromo` (lines 181-185):
```typescript
// src/lib/api.ts:181-185 (existing pattern to mirror)
const { data } = await api.post(
  '/promo/validate',
  { code, subtotal },
  { headers: currencyHeader() },
);
```
Applied to the two catalog GETs (merge with the existing `params` option, do not replace it):
```typescript
// fetchProducts — current line 127:
const { data } = await api.get<ArmPaginated<ArmDistributorProduct>>('/products', { params });
// →
const { data } = await api.get<ArmPaginated<ArmDistributorProduct>>('/products', {
  params,
  headers: currencyHeader(),
});

// fetchCategories — current line 143:
const { data } = await api.get<{ data: ArmCategory[] }>('/categories');
// →
const { data } = await api.get<{ data: ArmCategory[] }>('/categories', {
  headers: currencyHeader(),
});
```
**Do not touch:** the 4 existing checkout call sites, `USE_MOCKS` branches (mock data has no header concept), or `bearerHeader()` merge logic in `createOrder` (line 275) — all verified correct already.

---

### `src/lib/server-api.test.ts` (test, request-response)

**Analog:** itself — `fetchProductServer` describe block (lines 20-35), fetch-mock harness (`vi.stubGlobal('fetch', fetchMock)`, `fetchMock.mock.calls[0] as unknown as [string, RequestInit]`)

**Existing assertion to extend (lines 30-34):**
```typescript
const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
expect(url).toContain('/public/oms/storefront/products/198');   // ⚠ stale — fix to /public/arm/storefront/products/198 (Pitfall 4) IF touching this line at all
expect((init.headers as Record<string, string>)['X-Tenant-ID']).toBeTruthy();
```
**Pattern to add** (same `init.headers` cast, one more assertion line, no new mock scaffold needed — this file's `it('returns product data and sends the tenant header...')` block already captures `init`):
```typescript
expect((init.headers as Record<string, string>)['X-Currency']).toBe('TRY');
```
Repeat the equivalent `init.headers['X-Currency']` assertion in the `fetchCategoriesServer` block (lines 72-84) and `fetchAllProductsServer` block (lines 95-115) — same `fetchMock.mock.calls[N][1]` destructure style already used at line 32/105.

**Known pre-existing failures (do not fix as part of this phase unless bundling per Open Question #1):** 3 of these tests fail today on an unrelated `armToProduct`/`dp.product` fixture mismatch (Pitfall 3) — baseline is 16/17 files / 129/132 tests passing. New `X-Currency` assertions should be added without expecting the whole file to go green.

---

### `src/lib/api.test.ts` (NEW — test, request-response)

**No exact in-repo analog exists** (confirmed via `find` — `api.ts` currently has zero dedicated test file). Assemble the scaffold from two partial analogs:

1. **Style/structure analog:** `src/lib/currency-default.test.ts` (lines 1-71) — `describe`/`it`/`expect` shape, `beforeEach`/`afterEach` env-var reset pattern (lines 44-55), and the "dynamic `await import('./api')` so `process.env` is read at call time" trick (lines 57-63) — reuse this exact re-import trick since `currencyHeader()` reads `process.env` lazily.
2. **Mocking-the-transport analog:** since `api.ts`'s `api` instance is `axios.create(...)` (not global `fetch`), the `vi.stubGlobal('fetch', ...)` pattern from `server-api.test.ts`/`proxy.test.ts` does NOT apply directly — instead mock `axios` itself. No existing file does this, so use the standard Vitest `vi.mock('axios')` factory pattern (idiomatic vitest, not invented per-project convention):

```typescript
// src/lib/api.test.ts — NEW FILE, recommended scaffold
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the axios module BEFORE importing api.ts so `axios.create()` returns
// a mock instance whose .get/.post we can assert on (mirrors the module-load-time
// mocking already used in proxy.test.ts: "Stub global fetch BEFORE importing the route").
const mockGet = vi.fn();
const mockPost = vi.fn();
vi.mock('axios', () => ({
  default: {
    create: () => ({ get: mockGet, post: mockPost }),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockGet.mockResolvedValue({ data: { data: [], meta: { total: 0, page: 1, limit: 12, totalPages: 0 } } });
});

describe('fetchProducts — X-Currency header', () => {
  it('sends X-Currency: TRY on /products', async () => {
    const { fetchProducts } = await import('./api');
    await fetchProducts();
    expect(mockGet).toHaveBeenCalledWith(
      '/products',
      expect.objectContaining({ headers: { 'X-Currency': 'TRY' } }),
    );
  });
});

describe('fetchCategories — X-Currency header', () => {
  it('sends X-Currency: TRY on /categories', async () => {
    mockGet.mockResolvedValue({ data: { data: [] } });
    const { fetchCategories } = await import('./api');
    await fetchCategories();
    expect(mockGet).toHaveBeenCalledWith(
      '/categories',
      expect.objectContaining({ headers: { 'X-Currency': 'TRY' } }),
    );
  });
});
```
**Guardrails from research/context (must carry over):**
- Ensure `NEXT_PUBLIC_USE_MOCKS` is unset/false in the test env (or explicitly `delete process.env.NEXT_PUBLIC_USE_MOCKS` in `beforeEach`) — `fetchProducts`/`fetchCategories` short-circuit to `MOCK_PRODUCTS`/`MOCK_CATEGORIES` when `USE_MOCKS` is true (lines 105, 142 of `api.ts`), which would bypass the axios call entirely and produce a false pass.
- Do not assert against `currency-default.test.ts`'s existing `currencyHeader()` unit tests — this new file's job is the two catalog call sites, not re-testing the helper itself.

---

### `src/app/api/storefront/__tests__/proxy.test.ts` (test, request-response)

**Analog:** itself — `makeReq`/`makeCtx`/`mockFetch` harness (lines 13-47), existing `?lang` injection describe block (lines 49-112)

**Harness to reuse verbatim (no changes needed to the harness itself):**
```typescript
// lines 13-29 (existing, verified)
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);
import { GET } from '../[...path]/route';

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockResolvedValue(
    new Response(JSON.stringify({ data: [] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }),
  );
});

function makeReq(pathStr: string, locale?: string, query?: string): NextRequest { /* ... */ }
function makeCtx(pathParts: string[]) { /* ... */ }
```

**New test case pattern — mirror the existing `?lang` cases (e.g. lines 50-55) but assert on request headers via `mockFetch.mock.calls[0][1]` (the `init` object) instead of the URL string** (the route already forwards `X-Currency` at `route.ts:50-51` — this is a regression guard, not new route code):
```typescript
it('forwards inbound X-Currency header to the BFF unchanged', async () => {
  const req = new NextRequest('http://localhost:3000/api/storefront/products', {
    headers: { 'x-currency': 'TRY' },
  });
  await GET(req, makeCtx(['products']));
  const [, init] = mockFetch.mock.calls[0] as unknown as [string, RequestInit];
  expect((init.headers as Record<string, string>)['X-Currency']).toBe('TRY');
});

it('does not add an X-Currency header when the inbound request has none', async () => {
  const req = makeReq('categories');
  await GET(req, makeCtx(['categories']));
  const [, init] = mockFetch.mock.calls[0] as unknown as [string, RequestInit];
  expect((init.headers as Record<string, string>)['X-Currency']).toBeUndefined();
});
```
Note: `makeReq()` (lines 37-43) does not currently accept custom headers beyond the `NEXT_LOCALE` cookie — either extend `makeReq` with an optional headers param, or construct a raw `NextRequest` inline (as shown above) to avoid touching the shared helper's signature for other tests.

**Do not touch:** `proxy.ts` route code itself — verified already correct (Pattern already documented in RESEARCH.md, lines 48-51 of `route.ts`); this file only needs a new regression-guard test.

---

## Shared Patterns

### Currency env-fallback constant
**Source:** `src/lib/api.ts:149-154` (`currencyHeader()`) and `src/lib/money.ts:10`
**Apply to:** `server-api.ts` (new `STOREFRONT_CURRENCY` constant), any future currency-header call site
```typescript
process.env.NEXT_PUBLIC_STOREFRONT_CURRENCY || 'TRY'
```
**Constraint (enforced by `currency-default.test.ts`):** no new `|| 'USD'` (or any other hardcoded non-TRY fallback) literal may be introduced anywhere in `src/` — that test greps the whole source tree and will fail on any offending literal, new files included.

### Fetch-mock init/headers assertion idiom
**Source:** `src/lib/server-api.test.ts:32` and `src/app/api/storefront/__tests__/proxy.test.ts` (harness)
**Apply to:** `server-api.test.ts` extensions, `proxy.test.ts` extensions
```typescript
const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
expect((init.headers as Record<string, string>)['X-Currency']).toBe('TRY');
```

### Dynamic re-import for env-sensitive modules in tests
**Source:** `src/lib/currency-default.test.ts:57-63`
**Apply to:** `src/lib/api.test.ts` (NEW) — any test that needs `process.env.NEXT_PUBLIC_STOREFRONT_CURRENCY` read at call time rather than module-load time
```typescript
const { currencyHeader } = await import('./api');
```

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/lib/api.test.ts` (axios-mock scaffold specifically) | test | request-response | No file in this repo mocks `axios.create()` today — every existing test either mocks global `fetch` (`server-api.test.ts`, `proxy.test.ts`) or does pure source/env inspection (`currency-default.test.ts`). The scaffold above is assembled from idiomatic Vitest `vi.mock('axios')` conventions, not copied from an in-repo precedent — flagged so the executor knows this part is synthesized, not extracted. |

## Metadata

**Analog search scope:** `src/lib/`, `src/app/api/storefront/`, all `*.test.ts`/`*.test.tsx` files repo-wide (17 test files enumerated via `find`)
**Files scanned:** `server-api.ts`, `api.ts`, `server-api.test.ts`, `proxy.test.ts`, `route.ts`, `currency-default.test.ts`, `money.ts` (referenced, not modified), plus a directory listing of all 17 existing test files to confirm no axios-mock precedent exists
**Pattern extraction date:** 2026-07-01

## PATTERN MAPPING COMPLETE
