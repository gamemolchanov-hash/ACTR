---
phase: 3
slug: account
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-06-30
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Source: 03-RESEARCH.md §Validation Architecture (verified against BFF + FBG source).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None formal — TypeScript compiler is the primary gating tool (Phase 1/2 precedent) + grep acceptance checks |
| **Config file** | `tsconfig.json` |
| **Quick run command** | `npx tsc --noEmit` |
| **Full suite command** | `npx tsc --noEmit && npm run build` |
| **Estimated runtime** | ~30–60 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx tsc --noEmit` (zero errors)
- **After every plan wave:** Run `npx tsc --noEmit && npm run build`
- **Before `/gsd-verify-work`:** Full suite green + manual smoke tests pass
- **Max feedback latency:** ~60 seconds

---

## Per-Requirement Verification Map

> Plans not yet split — mapped at requirement granularity; planner refines to task IDs.

| Requirement | Behavior | Test Type | Automated Command | Status |
|-------------|----------|-----------|-------------------|--------|
| AUTH-01 | Register sends `terms_accepted`+`terms_version`; unchecked terms blocks submit | tsc + manual-smoke | `npx tsc --noEmit` | ⬜ pending |
| AUTH-02 | Login stores `arm_token`; AuthContext loads `customer` via `getMe` | tsc + manual-smoke | `npx tsc --noEmit` | ⬜ pending |
| AUTH-03 | Forgot-password returns success; reset link reaches `/login/reset-password` | tsc + manual-smoke | `npx tsc --noEmit` | ⬜ pending |
| AUTH-04 | Orders page renders ARM orders (no CDEK/₽) | grep check | `grep -rn 'delivery_service\|CDEK\|₽' src/app/account/orders/` → empty | ⬜ pending |
| AUTH-05 | Address book: list + add + delete against ARM | tsc + manual-smoke | `npx tsc --noEmit` | ⬜ pending |
| AUTH-06 | Profile save + password change return success | tsc + manual-smoke | `npx tsc --noEmit` | ⬜ pending |
| AUTH-07 | Export downloads JSON; delete (password-confirmed) signs out | tsc + manual-smoke | `npx tsc --noEmit` | ⬜ pending |
| (cross) | FBG-50: only 401/403 drops session; 5xx/network keeps it | code-review | review `isAuthFailure` usage in AuthContext | ⬜ pending |
| (cleanup) | No stale OMS artifacts | grep check | `grep -rn 'sf_token' src/` → empty; `grep -rn 'isLogged' src/` → empty | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] No formal test files exist — `tsc --noEmit` + grep checks serve as automated verification (Phase 1/2 precedent).
- [ ] Grep acceptance checks (verifier runs these): `grep -rn 'sf_token' src/` → empty · `grep -rn '₽' src/app/account/` → empty · `grep -rn 'delivery_service\|CDEK' src/app/account/` → empty · `grep -rn 'isLogged' src/` → empty (use `customer` instead).

*No framework install required — TS compiler already present.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Register → terms-required error → auto-login → redirect | AUTH-01/02 | UI flow + live BFF | Fill form, leave terms unchecked → expect block; check → register → `arm_token` set → redirect `/` |
| Auth-guard redirect | AUTH-02 | Browser nav | Visit `/account` без токена → redirect `/login` |
| FBG-50 session resilience | cross | Hard to trigger 5xx | Code-review `isAuthFailure(e)` — only 401/403 calls `signOut()` |
| Forgot-password email | AUTH-03 | SMTP optional in demo | Submit email → success message; token from BFF logs if email absent |
| Orders / addresses / settings / export / delete | AUTH-04..07 | Live BFF + JWT | Walk ЛК: orders render TRY via `fmtMoney`; add/delete address; save profile; change password; export downloads `.json`; delete (password) → signOut |

---

## Validation Sign-Off

- [ ] All tasks have `tsc`/grep verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 grep checks cover OMS-cleanup references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
