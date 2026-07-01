# Phase 06-oms-tr — Deferred Items (out of scope for executed plans)

Discovered during 06-05 execution's final phase-close grep gate. Not fixed — out of scope per
task boundary (not caused by 06-05's changes; no D-0x decision in 06-CONTEXT.md/06-RESEARCH.md
names these sites).

| Item | Location | Why deferred |
|------|----------|---------------|
| Footer copyright line still reads "2026 © american-creator.ru" | `src/components/Footer.tsx:214` | Not named by D-03 (phone), D-04 (socials), D-05 (payment), or D-10 (email) — no decision in this phase covers the copyright/brand-name text itself, only contact/social/payment data. RESEARCH.md's A3 assumption addresses only code-comment/test-fixture `american-creator.ru` references as out-of-scope; this is a live UI string, but still untouched by any locked decision for this plan. Flag for a future brand-swap slice or explicit CONTEXT.md decision before go-live. |
| Code comment `// no BOGO auto_promo` in `src/lib/api.ts:192` | `src/lib/api.ts:192` | Residual comment referencing the already-removed BOGO feature (06-01). Harmless (comment only, `git grep -n "bogo"` case-insensitive match), not a functional leftover. Not in scope for 06-05's D-03/04/05/10 tasks. |
| `american-creator.ru` in `src/lib/{chunkReload,hydrationNoise}.test.ts` and `src/lib/seo.ts` comments | `src/lib/chunkReload.test.ts:4,58`, `src/lib/hydrationNoise.test.ts:4`, `src/lib/hydrationNoise.ts:4`, `src/lib/seo.ts:22` | Confirmed out-of-scope per RESEARCH.md Assumption A3 — historical GlitchTip incident IDs / test fixture URLs / explanatory comments, not user-facing brand identity. |
