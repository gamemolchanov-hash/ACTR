---
phase: 05
slug: ui
status: verified
threats_open: 0
asvs_level: 1
created: 2026-06-30
---

# Phase 05 — Security (Комплаенс-UI)

> Per-phase security contract: threat register, accepted risks, and audit trail.
> Verified by `gsd-security-auditor` (adversarial stance) — State B audit from PLAN/SUMMARY artifacts + implementation. **Result: SECURED — 10/10 threats CLOSED.**

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| user → legal route | `params.slug` is untrusted URL input rendered into a next-intl namespace lookup | URL path segment (low sensitivity) |
| client display (KDV) | KDV amount derived client-side from already-trusted cart totals; no new input crosses a boundary | numeric total (no sensitivity) |
| client → ARM order | consent enforced client-side before `createOrder`; the BFF does NOT enforce consent (MVP) | order payload (PII: name/address/email) |
| consent link → external tab | `target="_blank"` opens a new browsing context | none |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-05-01 | Tampering | `legal/[slug]/page.tsx` slug param | mitigate | `LEGAL_SLUGS.includes(params.slug)` else `notFound()`; slug only feeds a static namespace key lookup (`.replace(/-/g,'_')`) — no eval/innerHTML/dynamic import | closed |
| T-05-02 | Information Disclosure | legal stub content | accept | Public static placeholder text, no auth, no user data (D-07) | closed |
| T-05-03 | Tampering | npm installs (05-01) | accept | Zero new deps | closed |
| T-05-04 | Information Disclosure | KDV display accuracy | accept | Fixed 20% rate (`kdv.ts:9`); ARM has no tax field | closed |
| T-05-05 | Tampering | checkout total integrity (KDV double-count) | mitigate | `kdvAmount` is display-only; excluded from `finalTotal` and `totalWithShipping` | closed |
| T-05-06 | Tampering | npm installs (05-02) | accept | Zero new deps | closed |
| T-05-07 | Repudiation | consent enforcement (BFF) | accept | Client gate only; BFF unenforced (MVP) — pre-go-live add `kvkk_accepted` to payload | closed |
| T-05-08 | Elevation of Privilege / Tampering | consent bypass via keyboard/programmatic submit | mitigate | Guard at top of `handleSubmit` body (before `setSubmitting`/`createOrder`) — not bypassable via Enter | closed |
| T-05-09 | Tampering | reverse-tabnabbing on consent links | mitigate | `rel="noopener noreferrer"` on both `target="_blank"` legal links | closed |
| T-05-10 | Tampering | npm installs (05-03) | accept | Zero new deps | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

### Mitigation Evidence (file:line)

- **T-05-01** — `src/app/[locale]/legal/legal-config.ts:7-13` (LEGAL_SLUGS const); `src/app/[locale]/legal/[slug]/page.tsx:18-20` (`if (!LEGAL_SLUGS.includes(params.slug as LegalSlug)) notFound()`); slug→namespace at `page.tsx:23`.
- **T-05-05** — `src/app/[locale]/checkout/page.tsx:207` (`kdvAmount = kdvFromBrutto(subtotal)`) displayed only at line 997; TOTAL (line 1033) reads `finalTotal` (line 205) / `totalWithShipping` (line 352) — both exclude `kdvAmount`; informational comment at line 991.
- **T-05-08** — `src/app/[locale]/checkout/page.tsx:357-360` (`if (!agreedKvkk || !agreedMesafeli) { setError(...); return; }`) executes before `setSubmitting(true)` (362) and `createOrder` (373); duplicate-submit guard (355) is not a bypass path.
- **T-05-09** — `src/app/[locale]/checkout/page.tsx:849` (`/legal/kvkk`) and `:868` (`/legal/mesafeli-satis`), both `target="_blank" rel="noopener noreferrer"`.

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-05-01 | T-05-02 | Legal page bodies are `[Placeholder]` text (D-07) — real legal copy is a client/lawyer responsibility | Phase 5 plan (D-07) | 2026-06-30 |
| AR-05-02 | T-05-04 | KDV rate hardcoded 20%; ARM API has no tax field | Phase 5 plan (D-03) | 2026-06-30 |
| AR-05-03 | T-05-07 | Consent enforced client-side only; BFF does not reject consent-less orders (MVP) | Phase 5 plan (RESEARCH security note) | 2026-06-30 |

### ⚠ Pre-Go-Live Actions (from accepted risks)

| Threat | Required action before go-live |
|--------|--------------------------------|
| T-05-02 | Replace all `[Placeholder — legal text pending]` legal bodies with lawyer-reviewed copy |
| T-05-07 | Add `kvkk_accepted: true` to the `createOrder` payload and validate server-side in the BFF (audit trail) |

---

## Unregistered Threat Flags

None. All three SUMMARY `## Threat Flags` sections confirm no new attack surface beyond the plan's threat register.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-06-30 | 10 | 10 | 0 | gsd-security-auditor (sonnet) |

---

## Scope

Files audited: `src/app/[locale]/legal/[slug]/page.tsx`, `src/app/[locale]/legal/legal-config.ts`, `src/app/[locale]/checkout/page.tsx`, `src/lib/kdv.ts`, and Phase-5 PLAN/SUMMARY artifacts (05-01/02/03).

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-06-30
