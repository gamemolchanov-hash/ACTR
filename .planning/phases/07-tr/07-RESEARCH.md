# Phase 7: Каталог-данные TR - Research

**Researched:** 2026-07-01
**Domain:** ARM Storefront API currency-header plumbing (Next.js 14 SSR + client fetchers)
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Наполнение данными (TRY-`arm_distributors` `currency=TRY`, `arm_storefronts`,
  `arm_storefront_distributors` `is_default`/`default_for_countries:["TR"]`, `arm_products` +
  `arm_distributor_products` `price` TRY / `show_in_storefront=true` / `is_available=true`) —
  **владелец заводит сам, позже**, вне код-скоупа фазы. Тенант = локальный `demo` (модуль ARM
  установлен). Источник товаров = уже заведённые в этом тенанте товары. Рецепт заведения —
  TZ.md §6 (см. canonical refs).
- **D-02:** **Цены не трогаем.** Назначение TRY-цен (фикс-курс-конвертация ИЛИ ручные) отложено
  (владелец, позже). В этой фазе никаких цен не назначаем и не конвертируем.
- **D-03:** Фулфилмент TR-дистрибьютора ≠ BetaPro («в Турции будет другой фулфилмент»). Локально
  `fulfillment_provider = manual`; реальный TR-фулфилмент — деплой-трек.
- **D-04:** Acceptance criterion фазы = **`/catalog` открывается без 500-ошибок в консоли** и
  рендерит цены в ₺.
- **D-05:** **Приёмка после наполнения** — «нет 500» проверяет владелец уже на своих TR-данных.
  Текущий 500 (нет данных / нет связки currency→distributor) — ожидаемое состояние ДО наполнения,
  **не** провал фазы. Следствие: graceful-degradation (error-boundary/empty-state на случай
  ошибки витрины) НЕ является целью фазы.
- **D-06:** Главная правка — **валюта на SSR-пути**. `src/lib/server-api.ts` (`sfFetch`, ~L72-74)
  сейчас шлёт только `X-Tenant-ID` + `X-Storefront-Key`, **без `X-Currency`**. Добавить
  `X-Currency` (значение `NEXT_PUBLIC_STOREFRONT_CURRENCY || 'TRY'`), чтобы SSR-каталог/деталь/
  категории/sitemap/metadata резолвили TRY так же, как клиентский путь. Заодно поправить
  стале-комментарий `/public/oms/storefront/*` (server-api.ts:8) → arm.
- **D-07:** Выровнять клиентский путь: `api.ts:currencyHeader()` (L149-153) уже шлёт
  `X-Currency: TRY`, а прокси `route.ts:51` форвардит его. Research/planner подтверждает, что
  каталог-листинг (client) тоже несёт валюту (не только cart/checkout). **Research finding: this
  assumption was only half-true — see Summary/Pitfall 1 — `currencyHeader()` exists but is not
  called by `fetchProducts`/`fetchCategories`, so catalog-listing currently sends no currency at
  all; the planner must wire it in, not just verify it.**

### Claude's Discretion

- Точный набор мест инъекции `X-Currency` (все SSR-фетчеры + при необходимости client каталог),
  способ (env-driven константа vs helper) — планировщик/research уточняет. **Research
  recommendation: reuse the existing `currencyHeader()` helper in `api.ts` for the client catalog
  fetchers; add a `STOREFRONT_CURRENCY` constant to `server-api.ts`'s shared `bffGet()` headers
  object for the SSR path (see Architecture Patterns).**
- НЕ добавлять graceful-degradation/error-boundary как основную цель (D-05). Если всплывёт как
  дешёвый побочный эффект — ок, но не расширять скоуп.

### Deferred Ideas (OUT OF SCOPE)

- **Назначение TRY-цен** (фикс-курс-конвертация или ручные; brutto/KDV-inclusive) — владелец,
  позже (D-02).
- **Фактическое заведение TR-данных в ARM** (дистрибьютор/витрина/товары/связки) — владелец,
  вручную, позже (D-01). Вне код-скоупа, но обязательно для приёмки (D-05).
- **Реальный TR-фулфилмент/перевозчик** — деплой-трек.
- **Graceful degradation каталога** при ошибке витрины (error-boundary/empty-state) — не в скоупе
  (D-05); при желании — отдельным слайсом.
- **Реальные TR-переводы контента товаров** (`arm_product_translations` tr-TR) — параллельная
  контент-задача (владелец/контент).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DATA-01 | TRY-витрина+дистрибьютор с товарами AC; TRY-каталог рендерится end-to-end (code-part per CONTEXT.md domain split: currency-header plumbing only — data population is owner-owned, out of code scope) | Architecture Patterns (Pattern 1 + Pattern 2) identify the exact 3 injection sites (`server-api.ts` `bffGet()`, `api.ts` `fetchProducts`/`fetchCategories`, `route.ts` passthrough — already correct). Common Pitfalls #1 corrects the CONTEXT.md D-07 assumption that client catalog already sends currency. Validation Architecture provides a concrete test map (Wave 0 gaps) that verifies the header-injection mechanism independently of the data-dependent live 500 (per D-05). Common Pitfalls #2 + Summary root-cause analysis (live `curl` reproduction + BFF contract reading) confirms the current 500 is a backend/data gap, not something this phase's code can or should try to eliminate. |
</phase_requirements>

## Summary

This phase's code scope is narrow and already almost entirely diagnosed by CONTEXT.md. Live
verification confirms every hypothesis in CONTEXT.md and adds one materially important
correction: **the main `/catalog` listing page does not go through `src/lib/server-api.ts` at
all** — it renders via the client component `CatalogView.tsx`, which calls `fetchProducts` /
`fetchCategories` from `src/lib/api.ts`. Those two functions currently send **no `X-Currency`
header whatsoever** (not even the existing `currencyHeader()` helper — that helper is wired only
into checkout/cart/promo/shipping/order calls). So the D-06/D-07 fix set has three code sites, not
two: (1) SSR fetchers in `server-api.ts` (product-detail/sitemap/metadata), (2) client catalog
fetchers `fetchProducts`/`fetchCategories` in `api.ts` (the actual `/catalog` page), and (3)
confirming the already-correct proxy passthrough in `route.ts`.

Root-cause of the current live 500 is empirically confirmed as a **backend/data gap, not an ACTR
code bug**: `curl`-ing the BFF directly with a valid `X-Storefront-Key`, both with and without
`X-Currency: TRY`, returns HTTP 500 identically in both cases. Reading the ARM contract
(`distributor-resolver.ts`) shows currency-resolution *never* throws — it always falls through to
a legacy `arm_storefronts.distributor` fallback, even with zero `arm_storefront_distributors`
rows. Passing `X-Storefront-Key` gets past the 401 "invalid key" gate (proving the storefront row
exists), so the 500 lives further downstream — almost certainly the legacy `arm_storefronts.
distributor` field being unset/invalid for the local `demo` tenant's storefront, or that
distributor having no products/categories. This is exactly the data gap D-01 assigns to the owner
and confirms D-05's framing: **the current 500 will not be fixed by this phase's code, and is not
expected to be** — code correctness here is about matching the ARM contract and closing an
independent bug (client catalog never sending currency at all), not about eliminating today's 500.

**Primary recommendation:** Add `X-Currency: <NEXT_PUBLIC_STOREFRONT_CURRENCY || 'TRY'>` to (a)
the shared header object in `server-api.ts`'s `bffGet()`, and (b) `fetchProducts` /
`fetchCategories` in `api.ts` (reuse the existing `currencyHeader()` helper — do not invent a
second constant). Fix the stale `/public/oms/storefront/*` comment in `server-api.ts:8`. Verify
with unit tests asserting the header is present on every SSR and client catalog fetch path; do
**not** attempt to make the live 500 disappear locally — that depends on owner data population
(D-01/D-05, out of scope).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Currency header injection (SSR) | Frontend Server (SSR fetchers) | — | `server-api.ts` runs server-side before hydration; must set the header itself (no browser/proxy involved) |
| Currency header injection (client catalog) | Browser / Client | Frontend Server (Next.js API route proxy) | `api.ts` axios calls run in the browser; the proxy (`route.ts`) only forwards headers it receives — it cannot inject a currency the client never sent |
| Currency→distributor resolution | API / Backend (ARM BFF) | Database (Directus `arm_storefront_distributors`) | Resolution logic and data both live in autoCRM/packs — read-only reference for this phase, hard isolation (D-01) |
| Display formatting (₺ symbol, locale) | Browser / Client (React components) | — | `ProductCard.tsx`/`Header.tsx`/`money.ts` already render TRY; no change needed |

## Standard Stack

No new dependencies. This phase touches existing code only:

| File | Role | Change |
|------|------|--------|
| `src/lib/server-api.ts` | SSR BFF fetcher (`bffGet`) | Add `X-Currency` header; fix stale comment |
| `src/lib/api.ts` | Client axios fetchers | Route `fetchProducts`/`fetchCategories` through `currencyHeader()` |
| `src/app/api/storefront/[...path]/route.ts` | Next.js proxy | No change — already forwards inbound `X-Currency` (verified) |
| `src/lib/money.ts`, `ProductCard.tsx`, `Header.tsx` | Display layer | No change — already TRY (verified) |

No package installs → Package Legitimacy Audit is not applicable to this phase.

## Architecture Patterns

### System Architecture Diagram

```
Browser (client, /catalog page)
   │
   │  CatalogView.tsx (use client)
   │  useQuery → fetchProducts() / fetchCategories()   [src/lib/api.ts]
   │  axios instance, baseURL '/api/storefront'
   │  headers: X-Tenant-ID (static) + ⚠ NO X-Currency today
   ▼
Next.js Route Handler  /api/storefront/[...path]/route.ts   (server-side proxy)
   │  injects X-Tenant-ID + X-Storefront-Key (server-only secret)
   │  forwards inbound X-Currency IF the client request had one
   │  forwards inbound Authorization, Content-Type
   ▼
ARM BFF  GET /public/arm/storefront/{config,products,categories}
   │  middleware: validate X-Storefront-Key → resolve storefront row
   │  resolveDistributorForCurrency(tenantId, storefrontId, X-Currency, sf.distributor, sf.currency)
   │     1. exact (storefront,currency) match in arm_storefront_distributors
   │     2. else is_default=true row
   │     3. else legacy sf.distributor / sf.currency fallback (NEVER throws)
   ▼
Directus (Postgres) — arm_storefronts / arm_storefront_distributors / arm_distributor_products
   (owner-owned data population happens here — D-01, out of code scope)

──────────────────────────────────────────────────────────────────────────

Server (SSR paths — product detail, sitemap, generateMetadata)
   │
   │  fetchProductServer() / fetchAllProductsServer() / fetchCategoriesServer()
   │  [src/lib/server-api.ts → bffGet()]
   │  headers: X-Tenant-ID + X-Storefront-Key + ⚠ NO X-Currency today
   ▼
ARM BFF  (direct fetch to BFF_INTERNAL_URL, bypasses the Next.js proxy — different code path,
          same backend contract as above)
```

A reader can trace the primary use case (open `/catalog`) top-to-bottom on the first diagram, and
the secondary SSR paths (product detail / sitemap / SEO metadata) on the second — these are two
genuinely separate code paths that both need the fix, which is the core finding of this research.

### Recommended Project Structure

No new files/folders. Both change sites already exist:
```
src/lib/
├── server-api.ts   # bffGet() — add X-Currency to the shared headers object
├── api.ts          # fetchProducts/fetchCategories — add currencyHeader() to axios calls
└── money.ts         # unchanged — already TRY default
```

### Pattern 1: Single shared header helper, not per-call literals
**What:** `api.ts` already has `currencyHeader()` (L149-153) used by 4 checkout endpoints
(`validateCart`, `validatePromo`, `fetchShippingRates`, `createOrder`). It reads
`NEXT_PUBLIC_STOREFRONT_CURRENCY || 'TRY'`.
**When to use:** Reuse this exact helper for `fetchProducts`/`fetchCategories` — do not
hand-roll a second currency constant. This keeps the "one currency source of truth" invariant
that the existing regression test (`currency-default.test.ts`) already enforces at the source
level (`grep` for `|| 'USD'` literals).
**Example:**
```typescript
// Source: src/lib/api.ts:149-154 (existing, verified)
export function currencyHeader(): Record<string, string> {
  return { 'X-Currency': process.env.NEXT_PUBLIC_STOREFRONT_CURRENCY || 'TRY' };
}

// Recommended change — apply the same helper to catalog reads (currently missing):
export async function fetchProducts(params?: {...}): Promise<PaginatedResponse<Product>> {
  // ...
  const { data } = await api.get<ArmPaginated<ArmDistributorProduct>>('/products', {
    params,
    headers: currencyHeader(), // ← ADD
  });
  return { data: data.data.map(armToProduct), meta: data.meta };
}
```

### Pattern 2: Server-side fetch — header baked into the shared `init` object
**What:** `bffGet()` in `server-api.ts` builds one `init.headers` object reused by every SSR
fetcher (`fetchProductServer`, `fetchCategoriesServer`, `fetchAllProductsServer` all call
`bffGet` internally). Adding `X-Currency` once in `bffGet()` covers all three server call sites —
there is no need to thread a currency parameter through each exported function.
**When to use:** This is the single injection point for D-06. Do not add `X-Currency` at each
call site individually — `bffGet()`'s `init.headers` is exactly the seam the codebase already
uses for the tenant/key headers (see current code, lines 71-77).
**Example:**
```typescript
// Source: src/lib/server-api.ts:71-77 (existing) — recommended addition marked
const STOREFRONT_CURRENCY = process.env.NEXT_PUBLIC_STOREFRONT_CURRENCY || 'TRY';
// ...
const init: RequestInit & { next?: { revalidate?: number } } = {
  headers: {
    'X-Tenant-ID': TENANT_ID,
    ...(STOREFRONT_KEY ? { 'X-Storefront-Key': STOREFRONT_KEY } : {}),
    'X-Currency': STOREFRONT_CURRENCY, // ← ADD (D-06)
  },
  next: { revalidate: REVALIDATE_SECONDS },
};
```

### Anti-Patterns to Avoid
- **Do not add graceful-degradation / error boundaries for the 500** — explicitly out of scope
  (D-05). The current 500 is expected until the owner populates TR data; adding try/catch UI
  fallback here would silently expand scope beyond DATA-01's code slice.
- **Do not touch `createOrder`'s `bearerHeader()`/`currencyHeader()` merge or any of the four
  existing checkout call sites** — they already work (verified: `currencyHeader()` used at
  api.ts:184, 204, 232, 275). Only the two catalog-read functions are missing the header.
- **Do not introduce a second env var or hardcode `'TRY'` as a new literal** — reuse
  `NEXT_PUBLIC_STOREFRONT_CURRENCY || 'TRY'`, matching the existing pattern in `api.ts`,
  `server-api.ts` is the only file currently missing this fallback pattern for currency (it has
  no currency constant at all today).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Currency-code source of truth | New env var or hardcoded string | `process.env.NEXT_PUBLIC_STOREFRONT_CURRENCY || 'TRY'` (already used 3× in the codebase: `api.ts`, `money.ts`, `fetchShippingRates`) | One canonical fallback; `currency-default.test.ts` already grep-gates against stray `'USD'` literals — a new stray `'TRY'` literal would be equally undesirable for maintainability |
| Distributor/currency routing | Any client-side or ACTR-side currency→distributor logic | ARM BFF's `resolveDistributorForCurrency` (already implemented, autoCRM-side) | Hard isolation (D-01) — ACTR must only *send* the header; all resolution logic and fallback semantics live in the BFF and are out of this repo's scope |

**Key insight:** This phase adds exactly one line of logic (a header value) in two files. There is
no new business logic to hand-roll — the risk is entirely about *where* to add it (shared helper
vs. per-call) and *not* over-scoping into error-handling/graceful-degradation territory.

## Common Pitfalls

### Pitfall 1: Assuming `currencyHeader()` already covers catalog reads
**What goes wrong:** CONTEXT.md's D-07 phrasing ("клиентский путь... уже шлёт X-Currency") could
be misread as "catalog listing already sends the header, just verify it." It does not.
**Why it happens:** `currencyHeader()` exists and is correctly used on 4 endpoints
(cart/promo/shipping/orders), which makes it easy to assume all client fetchers use it.
**How to avoid:** Explicitly grep for `currencyHeader()` call sites in `api.ts` before writing the
plan — verified count is 4 (L184, L204, L232, L275), and `fetchProducts`/`fetchProduct`/
`fetchCategories` (L104-145) are not among them.
**Warning signs:** If the plan's verification step only checks `server-api.ts`, the actual
`/catalog` page (client-rendered) will still 500/mis-resolve independent of the SSR fix.

### Pitfall 2: Chasing the live 500 as if it were fixable by this phase's code
**What goes wrong:** Spending implementation time trying to make `/catalog` return 200 locally.
**Why it happens:** The success criterion in ROADMAP.md literally says "рендерится без 500," which
reads like an acceptance test the code should pass right now.
**How to avoid:** D-04/D-05 already resolve this ambiguity — the "no 500" criterion is checked by
the owner *after* they populate TR data (distributor/storefront/products/links), not by this
phase's automated tests. Verified empirically: `curl`-ing the BFF directly with a valid
`X-Storefront-Key`, both with and without `X-Currency: TRY`, returns HTTP 500 identically —
proving the header is not the blocker. The plan's verification must assert the *header is sent*,
not that the page returns 200.
**Warning signs:** A task that says "confirm `/catalog` no longer 500s" without a caveat that this
requires owner-populated data is scope creep against D-05.

### Pitfall 3: Pre-existing `server-api.test.ts` failures being mistaken for regressions
**What goes wrong:** Running the test suite after the change shows 3 failing tests in
`server-api.test.ts`, which could look like something the phase broke.
**Why it happens:** `armToProduct()` (`arm-adapter.ts:33`) reads `dp.product.name`, but 3 of the
existing test fixtures mock the BFF response as `{ id: 'p1', name: 'BASE GEL' }` (flat, no nested
`product` object) — a pre-existing fixture/adapter mismatch, confirmed present before touching any
phase-7 code (`npx vitest run src/lib/server-api.test.ts` → 3 failed / 7 passed, same failure
signature independent of this phase).
**How to avoid:** Baseline is 16/17 test files passing, 129/132 tests passing, **before** any
phase-7 change. The plan must record this baseline so the verification step compares against it
(no *new* failures) rather than expecting a fully green suite.
**Warning signs:** A verification task that asserts "all tests pass" will always fail regardless
of this phase's changes — scope the assertion to "no new failures beyond the pre-existing 3 in
`server-api.test.ts`."

### Pitfall 4: Stale test assertion in `server-api.test.ts` referencing the old OMS path
**What goes wrong:** `server-api.test.ts:33` asserts
`expect(url).toContain('/public/oms/storefront/products/198')`, but the actual code builds URLs
from `STOREFRONT_BASE = ${BFF_INTERNAL_URL}/public/arm/storefront` (already `arm`, not `oms`).
**Why it happens:** Leftover from before the OMS→ARM migration (same stale-comment class as
`server-api.ts:8`, D-06 secondary).
**How to avoid:** This assertion is currently unreachable (the test throws earlier on the
`armToProduct` fixture bug — Pitfall 3), so it does not currently fail on its own, but it would
immediately fail if fixture is repaired without also updating the URL string. If the plan touches
this test file anyway (recommended, to add an `X-Currency` header assertion), fix this stale
string in the same edit as a low-risk bundled cleanup — not a scope violation since it is in the
exact test file the plan must already edit for the new header assertion.
**Warning signs:** Repairing the `armToProduct` fixture without updating the URL string will
convert a currently-masked bug into a newly-visible test failure.

## Code Examples

### Existing pattern to extend — client currencyHeader() usage
```typescript
// Source: src/lib/api.ts:181-187 (verified, ARM contract: POST /promo/validate)
export async function validatePromo(
  code: string,
  subtotal: number,
): Promise<{ data: PromoValidationResult }> {
  const { data } = await api.post(
    '/promo/validate',
    { code, subtotal },
    { headers: currencyHeader() },
  );
  return { data: armToPromoResult(data.data) };
}
```
Apply the identical `{ headers: currencyHeader() }` (merged with any existing `params`) to
`fetchProducts` and `fetchCategories`.

### Existing pattern to extend — proxy passthrough (no change needed, verify only)
```typescript
// Source: src/app/api/storefront/[...path]/route.ts:48-51 (verified, already correct)
const headers: Record<string, string> = { 'X-Tenant-ID': TENANT_ID };
if (STOREFRONT_KEY) headers['X-Storefront-Key'] = STOREFRONT_KEY;
const currency = req.headers.get('x-currency');
if (currency) headers['X-Currency'] = currency;
```
Once `fetchProducts`/`fetchCategories` send `X-Currency` from the browser, this proxy code (no
change required) will forward it correctly — verified via `proxy.test.ts`'s existing test harness
pattern (that file currently tests `?lang` injection only; the plan should add an analogous
`X-Currency` forwarding assertion using the same `makeReq`/`mockFetch` harness).

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Cart/checkout only sent `X-Currency` | All storefront reads (catalog, product, categories) should send it per ARM contract | ARM contract documents `X-Currency` as accepted on `/config`, `/products`, `/products/{id}`, `/categories` (not just checkout) | Catalog-read requests currently under-use the contract; adding the header everywhere makes ACTR forward-compatible with a future multi-currency ARM storefront even though this project is single-currency (TRY-only) by design |

**Deprecated/outdated:**
- The `/public/oms/storefront/*` comment in `server-api.ts:8` — stale reference to the pre-ARM-
  migration OMS proxy path; the actual `STOREFRONT_BASE` constant already targets
  `/public/arm/storefront` (verified, line 32). Comment-only fix (D-06 secondary).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The BFF's exact query that fails downstream of distributor resolution (causing the observed 500) is the legacy `arm_storefronts.distributor` field being unset/invalid for the local `demo` tenant's storefront, or that distributor lacking products/categories — inferred from code reading (`storefront-api.ts` middleware + `distributor-resolver.ts`) plus the empirical observation that a valid `X-Storefront-Key` gets past the 401 gate but still 500s, both with and without `X-Currency`. The BFF container logs did not surface a distinguishing ERROR-level stack trace for this exact call within the session (log buffering/level) — so the *exact* failing line is [ASSUMED], though the "it's a data problem, not a header problem" conclusion is [VERIFIED] by direct `curl` reproduction. | Summary, Common Pitfalls #2 | If wrong, the owner's data population steps (D-01) might not fully resolve the 500 and a genuine ACTR/BFF bug could remain — but this does not change this phase's code scope, since D-05 already places 500-diagnosis-after-population on the owner, not this phase |

**If this table is empty:** N/A — see A1 above; it is the only unverified-but-load-bearing claim,
and it does not affect the code changes recommended by this research (which are independent of
the exact downstream failure point).

## Open Questions

1. **Should the plan bundle the `server-api.test.ts` stale-fixture repair (Pitfall 3/4) into this
   phase, or leave it as backlog?**
   - What we know: The fixture bug pre-dates this phase (confirmed present on `main` before any
     phase-7 edit) and is unrelated to currency plumbing.
   - What's unclear: Whether fixing it is "free" enough to bundle (the plan must touch this same
     file anyway to add an `X-Currency` assertion) or whether it risks scope creep.
   - Recommendation: Leave the `armToProduct`/`dp.product` fixture repair as an *optional* stretch
     task explicitly flagged as pre-existing debt (STATE.md already tracks it in Pending Todos);
     the mandatory work is only the new `X-Currency` header assertion, added without touching the
     3 currently-broken tests. If the planner does touch them anyway, also fix the stale
     `/public/oms/storefront/products/198` URL string (Pitfall 4) in the same edit.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Local ARM BFF (`autocrm-bff`, docker) | Live verification of header behavior | ✓ | running, healthy (2h uptime at research time) | — |
| Directus `demo` tenant | Backend data resolution | ✓ (healthy) | — | — |
| ACTR dev server (`npm run dev`, :3003) | End-to-end manual check | not running at research time | — | `npm run dev` before manual UAT; not required for the automated verification (unit tests + `curl` direct-to-BFF suffice) |
| `ARM_STOREFRONT_KEY` (`.env.local`) | Authenticating BFF calls during verification | ✓ | present, valid (confirmed: passes the 401 gate) | — |

**Missing dependencies with no fallback:** none — this phase requires no new external tools.

**Missing dependencies with fallback:** ACTR dev server was not running during research; not
required for the code change or its automated verification, only for optional manual browser UAT.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.8 (`vitest.config.ts`, already configured) |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run src/lib/server-api.test.ts src/lib/api.test.ts src/app/api/storefront/__tests__/proxy.test.ts` (create `api.test.ts` if it does not exist — see Wave 0 gap) |
| Full suite command | `npm test` (= `vitest run`) |

**Baseline recorded this session (before any phase-7 edit):** `npm test` → 16/17 test files pass,
129/132 tests pass. The 3 failures are all in `src/lib/server-api.test.ts`
(`armToProduct`/fixture mismatch, pre-existing, unrelated to currency — see Pitfall 3).
`npx tsc --noEmit` → exits 0 (clean) at baseline.

### Phase Requirements → Test Map

Because the acceptance criterion ("no 500 on `/catalog`") depends on owner-populated data that
does not exist locally (D-05), verification for DATA-01's code slice must assert the *mechanism*
(the header is sent on every relevant path) rather than the *end-to-end outcome* (200 response).
This is a legitimate, complete verification strategy for this phase: the code's job is to emit
`X-Currency` correctly; whether the BFF then resolves to a populated TRY catalog is explicitly
out of scope (D-01/D-05).

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DATA-01 | SSR `bffGet()` sends `X-Currency: TRY` (or env override) on every call (product detail, sitemap, categories, all-products) | unit | `npx vitest run src/lib/server-api.test.ts -t "X-Currency"` | ❌ Wave 0 — extend existing `server-api.test.ts` fetch-mock assertions to check `init.headers['X-Currency']` |
| DATA-01 | Client `fetchProducts()`/`fetchCategories()` (the actual `/catalog` page path) send `X-Currency` header via axios | unit | `npx vitest run src/lib/api.test.ts` | ❌ Wave 0 — `src/lib/api.ts` currently has no dedicated test file; create one mocking axios and asserting header on `/products` and `/categories` calls |
| DATA-01 | Proxy (`route.ts`) forwards inbound `X-Currency` unchanged (regression-guard; already correct, verify it stays correct) | unit | `npx vitest run src/app/api/storefront/__tests__/proxy.test.ts -t "X-Currency"` | ❌ Wave 0 — extend existing `proxy.test.ts` (currently only tests `?lang` injection) with an analogous `X-Currency` forwarding case |
| DATA-01 | Stale `/public/oms/storefront/*` comment removed | manual/grep | `grep -n "oms/storefront" src/lib/server-api.ts` (expect no output) | n/a — comment-only, no test needed |
| DATA-01 | No regression vs. baseline (16/17 files, 129/132 tests, `tsc` clean) | full suite | `npm test && npx tsc --noEmit` | n/a |

### Sampling Rate
- **Per task commit:** targeted `npx vitest run <changed test file>`
- **Per wave merge:** `npm test` (full suite) + `npx tsc --noEmit`
- **Phase gate:** Full suite must show no *new* failures beyond the pre-existing 3 in
  `server-api.test.ts`, before `/gsd-verify-work`. Do not require 132/132 — that baseline was never
  green and fixing it is optional stretch work (see Open Questions #1).

### Wave 0 Gaps
- [ ] `src/lib/api.test.ts` — new file; covers `fetchProducts`/`fetchCategories` header assertion
      (no existing test file for `api.ts` at all — confirmed via `find`)
- [ ] Extend `src/lib/server-api.test.ts` fetch-mock assertions to check for `X-Currency` in
      `init.headers` (existing fixtures can be reused; only new `expect()` lines needed)
- [ ] Extend `src/app/api/storefront/__tests__/proxy.test.ts` with an `X-Currency` forwarding
      case, mirroring the existing `?lang` injection test pattern (`makeReq`/`mockFetch` harness
      already present)
- [ ] No new framework/config install needed — Vitest is already fully configured

## Security Domain

`security_enforcement: true`, `security_asvs_level: 1` (`.planning/config.json`).

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Unrelated — no auth surface touched by this phase |
| V3 Session Management | no | Unrelated |
| V4 Access Control | no | Unrelated |
| V5 Input Validation | marginal | `X-Currency` value originates from a build-time env var (`NEXT_PUBLIC_STOREFRONT_CURRENCY`) or a fixed `'TRY'` literal fallback — not user input. No new untrusted-input surface is introduced. The proxy (`route.ts:50-51`) already forwards a client-supplied `X-Currency` value verbatim to the BFF; this pre-dates the phase and the BFF is documented to validate/normalize it (`(requestedCurrency || '').trim().toUpperCase()`, `distributor-resolver.ts:33`) — no ACTR-side change to this passthrough is proposed |
| V6 Cryptography | no | Unrelated — `X-Storefront-Key` handling (server-side secret) is unchanged by this phase |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Client-controlled `X-Currency` header reaching the BFF unchecked | Tampering (low severity — single-currency storefront) | Already mitigated upstream: the BFF trims/uppercases and falls back safely on unknown values (`distributor-resolver.ts`); ACTR's own default is a fixed env-driven constant, not reflected user input. No new mitigation needed in this phase — do not add client-side currency validation, that would be scope creep into BFF-owned logic (hard isolation, D-01) |

No new threat surface is introduced by this phase — it only adds an outbound header with a
build-time-controlled value to existing, already-authenticated requests.

## Sources

### Primary (HIGH confidence)
- `/home/lexun/work/puz/ACTR/src/lib/server-api.ts` (read, verified: no `X-Currency` in `bffGet`,
  stale comment at line 8, `STOREFRONT_BASE` already uses `/public/arm/storefront`)
- `/home/lexun/work/puz/ACTR/src/lib/api.ts` (read, verified: `currencyHeader()` at L149-153 used
  only at L184/204/232/275; `fetchProducts`/`fetchProduct`/`fetchCategories` do not use it)
- `/home/lexun/work/puz/ACTR/src/app/api/storefront/[...path]/route.ts` (read, verified: forwards
  inbound `X-Currency` correctly at L50-51)
- `/home/lexun/work/puz/ACTR/src/components/ProductCard.tsx`, `Header.tsx`, `src/lib/money.ts`
  (read, verified: all default to/render `'TRY'`)
- `/home/lexun/work/puz/ACTR/src/lib/arm-adapter.ts`, `arm-types.ts` (read, verified: no per-product
  currency field — single-currency-storefront assumption is correct)
- `/home/lexun/work/puz/ACTR/src/components/CatalogView.tsx` (read, verified: `/catalog` listing
  is a client component using `api.ts` fetchers, not `server-api.ts`)
- `/home/lexun/work/autoCRM/packs/arm/bff/docs/openapi.yaml` (read-only reference, verified:
  `X-Currency` documented as optional on `/config`, `/products`, `/products/{id}`, `/categories`
  with graceful fallback semantics)
- `/home/lexun/work/autoCRM/packs/arm/bff/services/distributor-resolver.ts` (read-only reference,
  verified: resolution never throws, always has a legacy fallback path)
- `/home/lexun/work/autoCRM/packs/arm/bff/routes/storefront-api.ts` (read-only reference, verified:
  401 on missing/invalid key happens before distributor resolution — so a 500 implies the key is
  valid and the failure is downstream)
- Live `curl` reproduction against `autocrm-bff` (docker, port 4000) with valid
  `X-Storefront-Key`: 500 with and without `X-Currency: TRY` — empirical confirmation the header
  is not the blocker
- `docker logs autocrm-bff` (session-scoped, read-only) — confirms request reaches
  "Getting Directus client" for tenant `demo` before failing
- `npx vitest run` (full suite, this session) — baseline 16/17 files / 129/132 tests passing,
  3 pre-existing failures isolated to `server-api.test.ts`
- `npx tsc --noEmit` (this session) — clean, exit 0

### Secondary (MEDIUM confidence)
- None used — all claims traced to direct code/log/test reads or live reproduction this session.

### Tertiary (LOW confidence)
- A1 in Assumptions Log — the precise downstream BFF failure line, inferred rather than directly
  observed via an ERROR-level stack trace.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies; all recommended changes point at existing,
  already-verified code seams
- Architecture: HIGH — both SSR and client catalog code paths traced end-to-end with file:line
  evidence
- Pitfalls: HIGH — all four pitfalls confirmed by direct grep/test-run/live-curl reproduction in
  this session, not inferred from training data

**Research date:** 2026-07-01
**Valid until:** 30 days (stable, narrow code-only phase; re-verify if `arm-adapter.ts`,
`api.ts`, or the ARM openapi contract change before planning)
