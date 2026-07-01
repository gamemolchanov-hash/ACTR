---
phase: 7
slug: tr
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-01
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Source: 07-RESEARCH.md § Validation Architecture (HIGH confidence, baseline recorded 2026-07-01).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.8 (already configured) |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run src/lib/server-api.test.ts src/lib/api.test.ts src/app/api/storefront/__tests__/proxy.test.ts` |
| **Full suite command** | `npm test` (= `vitest run`) |
| **Estimated runtime** | ~10 seconds (full suite: 17 files) |

**Baseline (before any Phase 7 edit):** `npm test` → 16/17 files, 129/132 tests pass. The 3 failures
are all pre-existing in `src/lib/server-api.test.ts` (`armToProduct`/fixture mismatch, unrelated to
currency). `npx tsc --noEmit` → exits 0 (clean).

---

## Sampling Rate

- **After every task commit:** Run the targeted `npx vitest run <changed test file>`
- **After every plan wave:** Run `npm test` (full suite) + `npx tsc --noEmit`
- **Before `/gsd-verify-work`:** Full suite must show **no new failures beyond the pre-existing 3**
  in `server-api.test.ts` (do NOT require 132/132 — that baseline was never green)
- **Max feedback latency:** ~10 seconds

---

## Per-Task Verification Map

Task IDs / Plan / Wave are aligned by the planner. Behaviors, test types, and commands below are
fixed by research and MUST be honored.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | DATA-01 | — | SSR `bffGet()` sends `X-Currency` (`NEXT_PUBLIC_STOREFRONT_CURRENCY \|\| 'TRY'`) on every call (product detail, sitemap, categories, all-products) | unit | `npx vitest run src/lib/server-api.test.ts -t "X-Currency"` | ❌ W0 (extend) | ⬜ pending |
| TBD | TBD | TBD | DATA-01 | — | Client `fetchProducts()`/`fetchCategories()` (the actual `/catalog` path) send `X-Currency` via axios | unit | `npx vitest run src/lib/api.test.ts` | ❌ W0 (new file) | ⬜ pending |
| TBD | TBD | TBD | DATA-01 | T (low) | Proxy `route.ts` forwards inbound `X-Currency` unchanged (regression guard) | unit | `npx vitest run src/app/api/storefront/__tests__/proxy.test.ts -t "X-Currency"` | ❌ W0 (extend) | ⬜ pending |
| TBD | TBD | TBD | DATA-01 | — | Stale `/public/oms/storefront/*` comment removed from `server-api.ts` | grep | `grep -n "oms/storefront" src/lib/server-api.ts` (expect no output) | n/a | ⬜ pending |
| TBD | TBD | TBD | DATA-01 | — | No regression vs baseline (≤3 pre-existing failures, `tsc` clean) | full suite | `npm test && npx tsc --noEmit` | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/api.test.ts` — **new file**; mocks axios and asserts `X-Currency` header on
      `fetchProducts` (`/products`) and `fetchCategories` (`/categories`) calls (no test file exists
      for `api.ts` today — confirmed via `find`)
- [ ] Extend `src/lib/server-api.test.ts` fetch-mock assertions to check `init.headers['X-Currency']`
      (existing fixtures reusable; only new `expect()` lines needed)
- [ ] Extend `src/app/api/storefront/__tests__/proxy.test.ts` with an `X-Currency` forwarding case,
      mirroring the existing `?lang` injection test (`makeReq`/`mockFetch` harness already present)
- [ ] No framework/config install needed — Vitest is fully configured

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `/catalog` opens with **no 500 in console** and renders prices in ₺ end-to-end | DATA-01 | Depends on owner-populated TRY data (distributor/storefront/links/products) that does not exist locally yet (D-01/D-05); the live 500 is an expected pre-population state, not a code failure | Owner populates TR data per TZ.md §6, then loads `/catalog` on the ACTR dev server (`:3003`) and confirms no 500 in the browser console and ₺ prices render |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
