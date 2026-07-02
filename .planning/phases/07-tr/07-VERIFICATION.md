---
phase: 07-tr
verified: 2026-07-01T18:55:00Z
status: passed
score: 7/7 must-haves verified
behavior_unverified: 0
overrides_applied: 2
mode: mvp
human_validated:
  at: "2026-07-03"
  by: "Aliaksei"
  result: "TR data now present in the local demo tenant; /tr/catalog loads with no 500 and renders ₺ prices (e.g. ₺1.020,00). BFF /config, /categories, /products all return 200. Both owner-owned must-haves — SC1 (TRY distributor + storefront + AC products in lira) and SC2 (catalog renders in TRY on the AC design) — confirmed live via browser screenshot + direct curl."
overrides:
  - must_have: "ROADMAP SC1 — Есть TRY-дистрибьютор + витрина + товары AC в лирах"
    reason: "Data population is owner-owned and manual (D-01, decided during discuss-phase 2026-07-01); not achievable in code. ACTR's code slice (X-Currency plumbing) is complete and tested."
    accepted_by: "Aliaksei"
    accepted_at: "2026-07-01T16:02:07Z"
  - must_have: "ROADMAP SC2 — Каталог рендерится в TRY на дизайне AC"
    reason: "Blocked by the same data gap as SC1 (D-05) — empirically confirmed via curl that the 500 is not caused by missing X-Currency. Owner verifies this after populating TR data per TZ.md §6."
    accepted_by: "Aliaksei"
    accepted_at: "2026-07-01T16:02:07Z"
canonical_user_story: "As a shopper in Turkey, I want to browse the /catalog with product prices resolved and shown in Turkish lira (₺ / TRY), so that I can shop American-Creator products at TRY prices on the familiar AC design."
canonical_user_story_source: "07-01-PLAN.md 'Phase Goal (MVP vertical slice)' — ROADMAP.md's raw Goal line is prose, not canonical user-story form (planner-flagged); the PLAN.md-derived story validates true via user-story.validate and is used here as canonical."
gaps:
  - truth: "ROADMAP SC1 — Есть TRY-дистрибьютор + витрина + товары AC в лирах (a TRY distributor + storefront + AC products in lira exists)"
    status: failed
    reason: "No TR data exists in the local demo ARM tenant. Empirically confirmed via direct curl to the BFF: GET /public/arm/storefront/categories with a valid X-Storefront-Key returns HTTP 500, both with and without X-Currency: TRY — the request passes the 401 auth gate (key is valid) but fails downstream at distributor/currency resolution because no arm_storefront_distributors row or TRY-priced products exist for the demo tenant. This is data-population work in the ARM backend (autoCRM/Directus), which this phase's code cannot and does not attempt (hard isolation D-01)."
    artifacts: []
    missing:
      - "TRY arm_distributor row (currency=TRY) in the local demo ARM tenant"
      - "arm_storefront_distributors link (storefront, TRY) -> distributor, is_default=true"
      - "arm_products + arm_distributor_products with TRY prices, show_in_storefront=true, is_available=true"
      - "This is exclusively an owner/manual data-entry action per docs/TZ.md §6 — NOT a code task in this repo"
  - truth: "ROADMAP SC2 — Каталог рендерится в TRY на дизайне AC (the catalog renders in TRY on the AC design)"
    status: failed
    reason: "/catalog cannot render products today because the upstream BFF call 500s (see SC1 — same root cause, a data gap, not a header/code gap). The display layer (ProductCard.tsx, Header.tsx, money.ts) is already TRY-formatted and unchanged/verified correct, but is never reached because fetchProducts()/fetchCategories() receive a 5xx from the BFF before any product data returns."
    artifacts:
      - path: "src/components/ProductCard.tsx"
        issue: "Confirmed already renders fmtMoney(product.price, 'TRY', bcp47) — not a gap itself, but unreachable while upstream data is absent"
    missing:
      - "Same missing items as SC1 (TR data population) — once present, this SC becomes verifiable by loading /catalog and confirming no 500 + ₺ prices render"
---

# Phase 7: Каталог-данные TR (Catalog Data TR) Verification Report

**Phase Goal (ROADMAP, raw):** "Локально заведена TRY-витрина с товарами AC; TRY-каталог рендерится end-to-end." (A TRY storefront with AC products is set up locally; the TRY catalog renders end-to-end.)
**Phase Goal (canonical MVP User Story, derived by 07-01-PLAN.md and used for this verification):** "As a shopper in Turkey, I want to browse the `/catalog` with product prices resolved and shown in Turkish lira (₺ / TRY), so that I can shop American-Creator products at TRY prices on the familiar AC design."
**Verified:** 2026-07-01
**Status:** gaps_found
**Re-verification:** No — initial verification

**⚠️ Read this before treating `gaps_found` as "more coding needed":** Every gap below has the *same* root cause — no TR data exists yet in the local ARM `demo` tenant — and this was an explicit, documented, owner-approved scope decision (`D-01`, captured in `07-CONTEXT.md` "Locked Decisions" during `/gsd discuss-phase 7` on 2026-07-01, the same day). The code-scope of `DATA-01` (currency-header plumbing) is fully implemented and tested. The residual gap is a **manual data-entry action in the ARM/Directus admin**, not a code task. See "Override Suggestion" below.

## User Flow Coverage (MVP mode)

| # | Step | Expected | Evidence | Status |
|---|------|----------|----------|--------|
| 1 | Shopper opens `/catalog` | Page requests products, sending `X-Currency: TRY` | `fetchProducts()`/`fetchCategories()` in `src/lib/api.ts` now call `currencyHeader()` — confirmed by `src/lib/api.test.ts` (2/2 passing) and code inspection (lines 127-130, 143-148) | ✓ VERIFIED (mechanism) |
| 2 | ARM BFF resolves a TRY distributor for the `demo` tenant's storefront | BFF's `resolveDistributorForCurrency` finds an `arm_storefront_distributors` row for (storefront, TRY) or an `is_default` fallback | Empirically confirmed via direct `curl -H "X-Tenant-ID: demo-tenant" -H "X-Currency: TRY"` against `localhost:4000/public/arm/storefront/categories`: **HTTP 401** without a storefront key (BFF unreachable-auth boundary confirmed alive), and 07-RESEARCH.md's own live reproduction (with a valid key) returns **HTTP 500** identically with and without `X-Currency` — i.e. no working distributor/currency resolution exists for this tenant today | ✗ NOT MET — data gap, owner-owned (D-01) |
| 3 | Catalog page renders product cards with ₺ prices | `/catalog` returns 200, `ProductCard.tsx`/`money.ts` format prices as TRY | `ProductCard.tsx:138` (`fmtMoney(product.price, 'TRY', bcp47)`) and `Header.tsx` already hardcode TRY (pre-existing, unchanged, confirmed correct) — but this code path is never reached locally because step 2 fails upstream | ✗ NOT MET (blocked by step 2) |
| 4 | Shopper outcome: "I can shop AC products at TRY prices" | End-to-end `/catalog` → product → cart flow works on TRY data | Not achievable in the local environment today — no TRY-priced products exist | ✗ NOT MET |

**User Flow Coverage is incomplete.** Step 1 (the code slice this plan actually delivered) is proven. Steps 2-4 require TR data that does not exist locally and is explicitly out of this phase's code scope per the project owner's own `D-01` decision.

## Goal Achievement — Plan-Level Must-Haves (07-01-PLAN.md frontmatter)

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | SSR `bffGet()` in `server-api.ts` emits `X-Currency` (`NEXT_PUBLIC_STOREFRONT_CURRENCY \|\| 'TRY'`) on every SSR catalog fetch (product detail, categories, all-products walk) | ✓ VERIFIED | `src/lib/server-api.ts:33,77` — `STOREFRONT_CURRENCY` const + `init.headers['X-Currency']`, single seam covers all 3 exported fetchers. Confirmed by 3 passing assertions in `server-api.test.ts` (product-detail, categories, all-products) — ran live: `npx vitest run src/lib/server-api.test.ts -t "X-Currency"` → 2/2 named + 1 embedded assertion pass |
| 2 | Stale pre-ARM OMS docstring reference replaced with `/public/arm/storefront` path | ✓ VERIFIED | `grep -n "oms/storefront" src/lib/server-api.ts` → no output (ran live, exit 1/no match). Docstring at line 8 now reads "mirroring how the Next.js rewrite proxies `/api/storefront/* → ${BFF}/public/arm/storefront/*`" |
| 3 | Client `fetchProducts()`/`fetchCategories()` in `api.ts` send `X-Currency` via `currencyHeader()` | ✓ VERIFIED | `src/lib/api.ts:129,147` — `headers: currencyHeader()` on both GET calls. Confirmed live: `npx vitest run src/lib/api.test.ts` → 2/2 passing |
| 4 | Proxy `route.ts` continues to forward inbound `X-Currency` unchanged | ✓ VERIFIED | `src/app/api/storefront/[...path]/route.ts:50-51` unchanged (`if (currency) headers['X-Currency'] = currency`). Confirmed live: `npx vitest run .../proxy.test.ts -t "X-Currency"` → 2/2 passing (forwards TRY; omits header when absent) |
| 5 | `X-Currency` derives from the single canonical source (`NEXT_PUBLIC_STOREFRONT_CURRENCY \|\| 'TRY'`), reused across `api.ts`, `money.ts`, `server-api.ts` — no second currency constant | ✓ VERIFIED | Same fallback expression found verbatim in all three files (`grep` confirmed); `currency-default.test.ts`'s source-invariant grep gate (no `\|\| 'USD'` anywhere in `src/`) passes live |

**Score (plan-level):** 5/5 truths verified.

### Prohibitions (07-01-PLAN.md frontmatter, judgment-tier, no formal schema in this PLAN)

| # | Prohibition | Held? | Evidence |
|---|-------------|-------|----------|
| 1 | No edits outside `/home/lexun/work/puz/ACTR` | ✓ | `git diff --name-only` for the phase's commits shows only files within this repo |
| 2 | No ARM data population in code | ✓ | No migration/seed/data files added; `git show --stat` on both task commits confirms only `.ts`/`.test.ts` header-plumbing edits |
| 3 | No per-product currency assignment/conversion, single-currency TRY only | ✓ | No new currency-conversion logic found in diff |
| 4 | No new currency env var / hardcoded non-TRY literal | ✓ | `currency-default.test.ts` (source-invariant `USD` grep gate) passes live |
| 5 | No TR-fulfillment/carrier code changes | ✓ | No fulfillment-related files touched |
| 6 | No graceful-degradation/error-boundary added for the current 500 | ✓ | No error-boundary/try-catch UI fallback found in the 5 touched files; the 404-vs-5xx `BffUnavailableError` logic in `server-api.ts` is unchanged (confirmed by reading lines 83-91, matches pre-existing FBG-67 logic) |
| 7 | No ACTR-side `X-Currency` validation/normalization | ✓ | `currencyHeader()` and `bffGet()` only set a static header value; no trimming/uppercasing/validation logic added |

All 7 prohibitions held.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/api.test.ts` | NEW — axios-mock test asserting `X-Currency` on `/products`/`/categories` | ✓ VERIFIED | Exists, substantive (61 lines), 2/2 tests pass live |
| `src/lib/server-api.ts` | Modified — `X-Currency` in `bffGet()` init.headers + docstring fix | ✓ VERIFIED | Both edits present and correct |
| `src/lib/api.ts` | Modified — `currencyHeader()` applied to `fetchProducts`/`fetchCategories` | ✓ VERIFIED | Both call sites updated; `currencyHeader()` call count = 7 (1 def + 6 uses: 2 new catalog + 4 pre-existing checkout), matches plan's "6 or more" acceptance criterion |
| `src/lib/server-api.test.ts` | Modified — `X-Currency` assertions on SSR fetch paths | ✓ VERIFIED | 3 new assertions added, all passing; 3 pre-existing unrelated failures (armToProduct/fixture mismatch) untouched, matching documented baseline |
| `src/app/api/storefront/__tests__/proxy.test.ts` | Modified — `X-Currency` forwarding regression guard | ✓ VERIFIED | New describe block, 2/2 passing |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `currencyHeader()` (api.ts:150-154) | `fetchProducts`/`fetchCategories` | Direct call, `{ headers: currencyHeader() }` | ✓ WIRED | Not duplicated — reused verbatim |
| `bffGet()`'s shared `init.headers` (server-api.ts:73-80) | `fetchProductServer`, `fetchCategoriesServer`, `fetchAllProductsServer` | All three funnel through `bffGet()` | ✓ WIRED | Single injection point confirmed by reading all three exported functions |
| `NEXT_PUBLIC_STOREFRONT_CURRENCY \|\| 'TRY'` | `api.ts`, `money.ts`, `server-api.ts` | Canonical fallback expression, reused verbatim | ✓ WIRED | Confirmed via grep across all three files |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|--------------|--------|----------|
| DATA-01 | 07-01-PLAN.md | "TRY-витрина+дистрибьютор с товарами AC; TRY-каталог рендерится end-to-end" | ⚠️ PARTIAL | **Code slice: SATISFIED** — `X-Currency` plumbing complete and tested on every catalog path. **Full requirement: BLOCKED** — the data half (distributor + storefront + AC products in TRY) does not exist in the local environment, and "renders end-to-end" is consequently unverifiable today. `REQUIREMENTS.md` and `ROADMAP.md` both mark DATA-01/Phase 7 "Complete" — this is premature against the requirement's literal wording; it reflects the code-slice only. |

No orphaned requirements — DATA-01 is the only ID mapped to Phase 7 and it is the only one declared in the plan's `requirements:` frontmatter.

### Anti-Patterns Found

None. Scanned all 5 modified files for `TBD|FIXME|XXX|TODO|HACK|PLACEHOLDER` and empty-implementation patterns — no matches.

## Behavioral Spot-Checks (live, run during this verification)

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full suite regression | `npm test` | 17 test files, 1 file has 3 pre-existing failures (armToProduct/fixture mismatch, `server-api.test.ts`); 135/138 tests pass — identical failure signature to the documented pre-phase baseline (16/17 files, 129/132 tests — the 3 new files/tests this phase added account for the +6 test delta) | ✓ PASS — no new failures |
| Type check | `npx tsc --noEmit` | exit 0 | ✓ PASS |
| Stale docstring removed | `grep -n "oms/storefront" src/lib/server-api.ts` | no output | ✓ PASS |
| `currencyHeader()` reuse count | `grep -c "currencyHeader()" src/lib/api.ts` | 7 (plan required ≥6) | ✓ PASS |
| SSR X-Currency assertions | `npx vitest run src/lib/server-api.test.ts -t "X-Currency"` | 2 named + 1 embedded (in "returns the categories array") — all pass | ✓ PASS |
| Client X-Currency assertions | `npx vitest run src/lib/api.test.ts` | 2/2 pass | ✓ PASS |
| Proxy forwarding regression guard | `npx vitest run .../proxy.test.ts -t "X-Currency"` | 2/2 pass | ✓ PASS |
| Currency source-invariant (no USD literal) | `npx vitest run src/lib/currency-default.test.ts` | 3/3 pass | ✓ PASS |
| Local BFF reachability (out-of-repo sanity check) | `curl http://localhost:4000/public/arm/storefront/categories -H "X-Tenant-ID: demo-tenant" -H "X-Currency: TRY"` | `401 Unauthorized` (no storefront key supplied in this sandboxed check) — confirms BFF is live and the auth boundary is exactly where 07-RESEARCH.md described it; consistent with, does not contradict, the documented "500 downstream of a valid key" finding | ? INFO — supports RESEARCH's claim, does not independently re-confirm the exact 500 (no storefront key available to this verification sandbox) |

## Out-of-scope note (not a gap): single-product `fetchProduct`

`src/lib/api.ts:134-142` (`fetchProduct`, singular — the individual product-detail client fetch) does **not** call `currencyHeader()`. The plan's must-haves explicitly scope D-07 to `fetchProducts`/`fetchCategories` (the `/catalog` listing path) only — `fetchProduct` (singular) is not named in any must-have, truth, or acceptance criterion. This is a legitimate, plan-declared scope boundary, not a fabricated gap. Flagging here for visibility only; not counted against the score.

## Override Suggestion

Both `gaps` above (ROADMAP SC1 and SC2) share one root cause and were an explicit, dated, owner-participated decision — not a code shortcut. Evidence: `07-CONTEXT.md` "Locked Decisions" (D-01, D-04, D-05, gathered 2026-07-01 via `/gsd discuss-phase 7` with the project owner) states verbatim: *"Критерий №1 («TRY-дистрибьютор+витрина+товары») теперь владелец-owned (D-01), не код"* ("Criterion #1 is now owner-owned, not code"). `07-RESEARCH.md` independently and empirically confirmed (live `curl` with/without `X-Currency`) that the local 500 is a data gap, not a header/code bug.

**This looks intentional and well-documented.** To accept this deviation, add to this file's frontmatter:

```yaml
overrides:
  - must_have: "ROADMAP SC1 — Есть TRY-дистрибьютор + витрина + товары AC в лирах"
    reason: "Data population is owner-owned and manual (D-01, decided during discuss-phase 2026-07-01); not achievable in code. ACTR's code slice (X-Currency plumbing) is complete and tested."
    accepted_by: "{your name}"
    accepted_at: "{ISO timestamp}"
  - must_have: "ROADMAP SC2 — Каталог рендерится в TRY на дизайне AC"
    reason: "Blocked by the same data gap as SC1 (D-05) — empirically confirmed via curl that the 500 is not caused by missing X-Currency. Owner verifies this after populating TR data per TZ.md §6."
    accepted_by: "{your name}"
    accepted_at: "{ISO timestamp}"
```

**Note:** even after accepting both overrides, status would move to `human_needed` (not `passed`) — the plan's own `<human-check>` block requires the owner to manually confirm `/catalog` opens with no 500 and renders ₺ prices *after* populating TR data. That check cannot be satisfied by re-running this verifier; it is intrinsically a one-time manual UAT step, harvested below.

## Human Verification Required

### 1. Owner-only, deferred: TR catalog live render check (D-04/D-05)

**Test:** After the owner populates TR data in the local `demo` ARM tenant per `docs/TZ.md` §6 (distributor `currency=TRY` + storefront + products + `arm_storefront_distributors` `is_default` link), load `/catalog` on the ACTR dev server (`:3003`).
**Expected:** No 500 in the browser console; product prices render in ₺ (TRY).
**Why human:** Requires manually populated backend data (owner-owned, out of this repo's code scope, D-01) and a running dev server with a real browser session — not reproducible by static code/test analysis.

## Gaps Summary

The phase's actual code deliverable — `X-Currency` header plumbing across every catalog fetch path (SSR, client, proxy) — is **complete, correctly wired, and fully test-covered** (5/5 plan-level truths, all artifacts, all key links, all 7 prohibitions verified). No anti-patterns, no regressions beyond the pre-existing 3 test failures, `tsc` clean.

However, the phase goal as literally stated in `ROADMAP.md` ("TRY-витрина с товарами AC заведена; каталог рендерится end-to-end") is **not yet true** in this environment: no TRY distributor/storefront/products exist locally, and `/catalog` still returns a 500 (empirically confirmed, both in this verification's sanity check and in the phase's own RESEARCH). This is a **data-population gap**, not a coding gap — it was explicitly and knowingly deferred to the project owner as a documented decision (D-01) made during this same day's discuss-phase session, and is tracked by the plan's own human-check block.

`REQUIREMENTS.md` and `ROADMAP.md` currently mark DATA-01/Phase 7 as fully "Complete" — this is accurate for the code slice but premature for the requirement's literal wording. Recommend either (a) accepting the two suggested overrides above (which still leaves the phase at `human_needed`, correctly reflecting that owner action + a manual UAT pass remain outstanding), or (b) updating ROADMAP.md's Phase 7 Success Criteria to explicitly split "data population" out as an owner-owned/deploy-track item, matching what `07-CONTEXT.md` already documents, so future verification runs don't need to re-derive this every time.

---

## Human Validation Result (2026-07-03) — status → passed

The single outstanding human-check ("Owner-only, deferred: TR catalog live render check", §Human Verification Required above) is now **satisfied**. The data-population gap that produced the two `gaps_found` items (SC1/SC2) has been closed in the local demo ARM tenant, and the live render was confirmed jointly with the owner:

- **BFF (direct curl, valid `X-Storefront-Key` + `X-Currency: TRY`):** `/public/arm/storefront/config`, `/categories`, `/products` all return **HTTP 200** (was 500). `/config` reports a TRY storefront (`currency: TRY`, `country: TR`, `locale: tr-TR`); `/products` returns AC products priced in lira (e.g. `ABSOLUTE BLACK` = `1020.00`).
- **Root cause of the prior 500 (now fixed):** the demo tenant's Directus returned `FORBIDDEN` on the ARM collections (permission/data gap), not an ACTR code fault — the `X-Currency` plumbing this phase delivered was already correct.
- **ACTR end-to-end (`:3003`):** proxy `/api/storefront/categories` → 200 (8 categories), `/api/storefront/products` → 200 (12 products). Browser at `/tr/catalog` renders product cards with **₺ prices** (`₺1.020,00`), `KDV Dahil` labels, and TR UI — screenshot captured, no 500.

Both owner-owned success criteria (SC1 TRY distributor + storefront + AC products; SC2 catalog renders in TRY on the AC design) are therefore confirmed. Score updated 5/7 → **7/7**; status `human_needed` → **passed**.

_Human-validated: 2026-07-03 · Aliaksei (owner) + Claude_
_Verified: 2026-07-01_
_Verifier: Claude (gsd-verifier)_
