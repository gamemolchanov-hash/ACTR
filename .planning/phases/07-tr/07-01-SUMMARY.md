---
phase: 07-tr
plan: 01
subsystem: api
tags: [nextjs, vitest, axios, arm-bff, currency, ssr]

# Dependency graph
requires:
  - phase: 06-oms-tr
    provides: TR brand swap + OMS-specific cleanup complete; ARM API baseline stable
provides:
  - X-Currency header emitted on every catalog code path (SSR fetchers, client fetchProducts/fetchCategories, proxy passthrough)
  - Single canonical currency source (NEXT_PUBLIC_STOREFRONT_CURRENCY || 'TRY') now shared across api.ts, money.ts, and server-api.ts
  - Stale pre-ARM OMS docstring reference removed from server-api.ts
affects: [07-tr, catalog, checkout]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Single shared header injection seam: bffGet()'s init.headers covers all SSR fetchers; currencyHeader() helper reused for client fetchers (no per-call literals)"
    - "axios-mock vitest scaffold (vi.mock('axios') factory) — first instance in this repo, for testing files whose transport is axios.create() rather than global fetch"

key-files:
  created:
    - src/lib/api.test.ts
  modified:
    - src/lib/server-api.ts
    - src/lib/api.ts
    - src/lib/server-api.test.ts
    - src/app/api/storefront/__tests__/proxy.test.ts

key-decisions:
  - "RED/GREEN task split (Task 1 tests-only, Task 2 implementation-only) enforced strictly — no production code touched until Task 1's RED baseline was captured and committed separately"
  - "For SSR tests where the flat mock fixture makes armToProduct throw (pre-existing, unrelated bug), wrapped the call in try/catch and asserted on the captured fetchMock init — fetch fires before the adapter runs, so the header assertion is valid regardless of the downstream throw"
  - "Did not repair the 3 pre-existing armToProduct/fixture-mismatch test failures — explicitly out of scope per 07-RESEARCH.md Open Question #1 and the plan's prohibitions"

patterns-established:
  - "Currency source-of-truth invariant: any new currency-header call site must reuse process.env.NEXT_PUBLIC_STOREFRONT_CURRENCY || 'TRY' verbatim — enforced by currency-default.test.ts's source-invariant grep gate"

requirements-completed: [DATA-01]

coverage:
  - id: D1
    description: "SSR bffGet() sends X-Currency (NEXT_PUBLIC_STOREFRONT_CURRENCY || 'TRY') on every call — product detail, categories, and the paginated all-products/sitemap walk"
    requirement: "DATA-01"
    verification:
      - kind: unit
        ref: "src/lib/server-api.test.ts#fetchProductServer > sends X-Currency: TRY on the product-detail fetch (D-06)"
        status: pass
      - kind: unit
        ref: "src/lib/server-api.test.ts#fetchCategoriesServer > returns the categories array (X-Currency assertion)"
        status: pass
      - kind: unit
        ref: "src/lib/server-api.test.ts#fetchAllProductsServer > sends X-Currency: TRY on the all-products walk (D-06)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Client fetchProducts()/fetchCategories() (the actual /catalog listing path) send X-Currency via the existing currencyHeader() helper"
    requirement: "DATA-01"
    verification:
      - kind: unit
        ref: "src/lib/api.test.ts#fetchProducts — X-Currency header > sends X-Currency: TRY on /products"
        status: pass
      - kind: unit
        ref: "src/lib/api.test.ts#fetchCategories — X-Currency header > sends X-Currency: TRY on /categories"
        status: pass
    human_judgment: false
  - id: D3
    description: "Proxy route.ts continues to forward an inbound X-Currency header unchanged to the BFF (regression guard)"
    requirement: "DATA-01"
    verification:
      - kind: unit
        ref: "src/app/api/storefront/__tests__/proxy.test.ts#X-Currency forwarding (D-07 regression guard) > forwards inbound X-Currency header to the BFF unchanged"
        status: pass
      - kind: unit
        ref: "src/app/api/storefront/__tests__/proxy.test.ts#X-Currency forwarding (D-07 regression guard) > does not add an X-Currency header when the inbound request has none"
        status: pass
    human_judgment: false
  - id: D4
    description: "Stale pre-ARM OMS proxy-path reference removed from server-api.ts docstring"
    requirement: "DATA-01"
    verification:
      - kind: other
        ref: "grep -n \"oms/storefront\" src/lib/server-api.ts (no output)"
        status: pass
    human_judgment: false
  - id: D5
    description: "/catalog opens with no 500 in console and renders TRY prices — owner-verified AFTER TR data population (D-04/D-05, deferred, not gated by this plan)"
    verification: []
    human_judgment: true
    rationale: "Depends on owner-populated TR data (distributor/storefront/products/links) that does not exist locally; the current local 500 is an expected pre-population state per D-05, not something this plan's automated tests can or should assert against."

# Metrics
duration: 12min
completed: 2026-07-01
status: complete
---

# Phase 07 Plan 01: Storefront Currency Plumbing (X-Currency) Summary

**Wired `X-Currency: TRY` into every catalog fetch path (SSR `bffGet()`, client `fetchProducts`/`fetchCategories`) via existing helpers, closing the D-06/D-07 gap the client catalog listing had — it previously sent no currency at all.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-07-01T18:36:00Z (approx, first baseline test run)
- **Completed:** 2026-07-01T18:38:45Z
- **Tasks:** 2 (RED test authoring, GREEN implementation)
- **Files modified:** 5 (1 new, 4 modified)

## Accomplishments
- SSR `bffGet()` in `src/lib/server-api.ts` now emits `X-Currency` (via a new `STOREFRONT_CURRENCY` module constant) on all three SSR fetchers (`fetchProductServer`, `fetchCategoriesServer`, `fetchAllProductsServer`) through the single shared `init.headers` seam
- Client `fetchProducts()`/`fetchCategories()` in `src/lib/api.ts` — the actual `/catalog` listing path — now send `X-Currency` via the existing `currencyHeader()` helper, closing a gap where catalog listing sent no currency at all (only checkout/cart/promo/shipping did)
- Stale pre-ARM OMS docstring reference (`server-api.ts` line 8, `/public/oms/storefront/*`) fixed to the current `/public/arm/storefront/*` path
- New unit tests prove the mechanism on every path: `src/lib/api.test.ts` (new, axios-mock scaffold), extended `server-api.test.ts` and `proxy.test.ts`
- Full suite verified: only the 3 pre-existing `server-api.test.ts` failures remain (baseline unchanged); `tsc --noEmit` clean

## Task Commits

Each task was committed atomically:

1. **Task 1: X-Currency assertions across all three catalog paths (RED)** - `9791865` (test)
2. **Task 2: emit X-Currency on SSR + client catalog fetchers; fix stale docstring (GREEN)** - `f9b35d3` (feat)

_TDD gate sequence: `test(07-01)` commit precedes `feat(07-01)` commit — RED then GREEN, as required by the plan's Wave 0/RED → GREEN structure._

## Files Created/Modified
- `src/lib/api.test.ts` - NEW; axios-mock unit tests asserting `X-Currency: TRY` on `fetchProducts()` (`/products`) and `fetchCategories()` (`/categories`)
- `src/lib/server-api.ts` - added `STOREFRONT_CURRENCY` constant + `X-Currency` in `bffGet()`'s shared `init.headers`; fixed stale OMS docstring reference
- `src/lib/api.ts` - applied existing `currencyHeader()` helper to `fetchProducts` and `fetchCategories` GET calls
- `src/lib/server-api.test.ts` - extended with 3 new `X-Currency` assertions (product-detail, categories happy path, all-products walk)
- `src/app/api/storefront/__tests__/proxy.test.ts` - extended with an `X-Currency` forwarding regression-guard describe block (2 new tests)

## Decisions Made
- Reused the single canonical currency fallback expression (`process.env.NEXT_PUBLIC_STOREFRONT_CURRENCY || 'TRY'`) verbatim in the new `server-api.ts` constant — no second currency literal or env var introduced, per D-01/D-02 hard isolation and the `currency-default.test.ts` source-invariant grep gate.
- For the two SSR header assertions that hit the pre-existing `armToProduct`/fixture-mismatch bug (Pitfall 3 from 07-RESEARCH.md), wrapped the call in try/catch and asserted on the fetch-mock's captured `init` object rather than repairing the fixtures — fetch is invoked before the adapter runs, so the header assertion is valid and independent of the downstream throw. This keeps the fixture repair genuinely out of scope (per the plan's explicit prohibition) while still proving the header-injection mechanism on all three SSR fetchers.
- Left the 3 pre-existing `server-api.test.ts` failures and the stale `/public/oms/storefront/products/198` URL assertion (line ~33) completely untouched, per the plan's explicit instruction not to repair them in this plan.

## Deviations from Plan

None - plan executed exactly as written. Both tasks followed the RED→GREEN structure precisely: Task 1 authored tests only (no production code touched, verified via `git diff` before commit), Task 2 implemented exactly the two files and edits specified (module constant + `init.headers` addition in `server-api.ts`; `currencyHeader()` application to the two catalog GETs in `api.ts`), with no changes to the 404/5xx error-handling logic, the 4 existing checkout call sites, `USE_MOCKS` branches, or `bearerHeader()` merge logic.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required. This plan only wires an existing header value into existing helpers; no new dependencies, env vars, or infrastructure.

## Next Phase Readiness

- Code slice of DATA-01 is complete: `X-Currency` is now emitted on every catalog code path (SSR + client + proxy passthrough), matching the ARM contract.
- **Deferred to the owner (D-01/D-04/D-05, not a blocker for this plan):** populate the local `demo` ARM tenant with a TRY distributor + storefront + products + `arm_storefront_distributors` links per `autoCRM/docs/modules/arm/ACTR/TZ.md` §6. After population, load `/catalog` on the ACTR dev server (`:3003`) and confirm no 500 in the browser console and ₺ prices render — this is the manual acceptance check (D-04), owner-verified, not gated by this plan's automated tests.
- Pre-existing backlog item unchanged and not addressed here (by design, per 07-RESEARCH.md Open Question #1): the 3 `armToProduct`/fixture-mismatch failures in `server-api.test.ts` remain open as optional stretch work, tracked in STATE.md Pending Todos.

---
*Phase: 07-tr*
*Completed: 2026-07-01*

## Self-Check: PASSED

- FOUND: src/lib/api.test.ts
- FOUND: src/lib/server-api.ts
- FOUND: src/lib/api.ts
- FOUND: .planning/phases/07-tr/07-01-SUMMARY.md
- FOUND commit: 9791865
- FOUND commit: f9b35d3
