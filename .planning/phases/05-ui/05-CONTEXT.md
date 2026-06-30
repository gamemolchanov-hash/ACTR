# Phase 5: Комплаенс-UI - Context

**Gathered:** 2026-06-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Витрина соответствует базовым требованиям TR на уровне UI: цены с KDV (НДС 20%),
согласия KVKK + «mesafeli satış» в чекауте (обязательные), и набор юр-страниц-заглушек.
Покрывает COMP-01 (цены с KDV) и COMP-02 (согласия + юр-страницы).

**Не входит** (другие фазы): удаление OMS-специфики/бренд TR (Phase 6), реальные TR-данные
каталога (Phase 7), реальный юридический текст страниц (пишется позже/юристом — здесь заглушки).
</domain>

<decisions>
## Implementation Decisions

### KDV (НДС 20%) — COMP-01
- **D-01:** ARM-цены считаем **KDV-inclusive** (стандарт TR B2C). У цен — ярлык **«KDV Dahil»**.
- **D-02:** В итогах корзины/чекаута — инфо-строка **«KDV (%20)»**, вычисляемая из brutto:
  `kdv = total - total / 1.20` (round). Это информативная разбивка, не добавляется к сумме.
- **D-03:** Ставка фикс **20%** (success-criteria явно «НДС 20%»; nail/косметика в TR = 20%).
  Если ARM позже вернёт налоговое поле/категорийные ставки — пересмотреть (Deferred).

### Согласия в чекауте — COMP-02
- **D-04:** **Два обязательных чекбокса** в чекауте: (1) **KVKK** (согласие на обработку
  перс. данных), (2) **«mesafeli satış sözleşmesi» + ön bilgilendirme** (договор дист. продажи +
  предварительное информирование/право возврата). Оба **обязательны** для оформления заказа
  (submit заблокирован, как terms-gate в register, Phase 3 — D-07).
- **D-05:** У каждого чекбокса — ссылка на соответствующую юр-страницу (новая вкладка).

### Юр-страницы — COMP-02
- **D-06:** **5 страниц** под `[locale]`: KVKK (aydınlatma metni), mesafeli satış sözleşmesi,
  iade/cayma hakkı (право возврата), gizlilik (privacy), kullanım koşulları (terms).
- **D-07:** **Заглушки** — скелет с заголовком/разделами и placeholder-текстом, строки через
  **next-intl (EN+TR)**, как остальная витрина. Реальный юр-текст — позже (Deferred).
- **D-08:** Ссылки на юр-страницы — из **футера** + из **чекаута** (рядом с чекбоксами D-05).

### Claude's Discretion
- Точная вёрстка KDV-ярлыка/строки (где именно у цены/в Order Summary).
- Маршруты юр-страниц (slug'и: `/legal/kvkk`, `/legal/mesafeli-satis`, `/legal/iade`, …) — на усмотрение, консистентно.
- Структура placeholder-разделов внутри каждой страницы.
- Namespacing i18n-ключей (`legal.*`, `checkout.consent.*`, `price.kdv*`).
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project requirements & market
- `.planning/REQUIREMENTS.md` — COMP-01, COMP-02.
- `.planning/ROADMAP.md` — Phase 5 goal + success criteria.
- `CLAUDE.md` (project) — TR/KDV/KVKK/mesafeli satış market constraints; Next.js 14 + MUI App Router; ARM proxy; i18n EN+TR.

### i18n + integration points (from Phase 4)
- `src/i18n/routing.ts`, `src/i18n/navigation.ts` — next-intl routing/Link (jur-pages live under `[locale]`).
- `messages/en.json` + `messages/tr.json` — append `legal.*`, `checkout.consent.*`, `price.kdv*` keys (EN base, real TR).
- `src/lib/money.ts` `fmtMoney(amount, currency, bcp47)` — для KDV-строки/итогов.
- `src/app/[locale]/checkout/` — место для consent-чекбоксов (паттерн terms-gate из Phase 3 register, FBG-style `if(!agreed) return`).
- `src/app/[locale]/delivery/` — существующая инфо-страница как аналог структуры юр-страницы.
- Footer component (Phase 4 shell) — добавить ссылки на 5 юр-страниц.

### Reference (concepts)
- `~/work/puz/FBG` — если есть аналог legal/consent (проверить в research).
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **terms-gate паттерн** (Phase 3 register): обязательный чекбокс блокирует submit (`isValid` включает `agreed`) — переиспользовать для KVKK+mesafeli.
- **fmtMoney(amount,currency,bcp47)** — для «KDV (%20)» строки и итогов.
- **delivery page** (`[locale]/delivery`) — аналог структуры для юр-страниц-заглушек.
- **next-intl** — все строки через `useTranslations`/`getTranslations`; юр-страницы локализуются как обычные.

### Established Patterns
- Next.js 14 App Router + MUI; всё под `[locale]`; SSR-friendly.
- Order Summary в чекауте/корзине — точка вставки KDV-строки.

### Integration Points
- Checkout submit-gate ← два обязательных consent-чекбокса.
- Footer ← ссылки на 5 юр-страниц.
- Price display (ProductCard/ProductDetail/Order Summary) ← ярлык «KDV Dahil» + KDV-строка.
</code_context>

<specifics>
## Specific Ideas
- Ставка KDV = 20% фикс.
- 5 юр-страниц: KVKK aydınlatma, mesafeli satış sözleşmesi, iade/cayma hakkı, gizlilik, kullanım koşulları.
- Заголовки/лейблы на TR-терминологии (KDV Dahil, KVKK, mesafeli satış) + EN-эквиваленты.
</specifics>

<deferred>
## Deferred Ideas
- **Реальный юридический текст** юр-страниц (от юриста) — здесь только заглушки (success-criteria).
- **Категорийные/переменные ставки KDV** (10%/1% для отдельных групп) — если ARM начнёт возвращать налоговое поле; сейчас фикс 20%.
- **e-fatura / счёт-фактура** и прочие go-live комплаенс-вопросы — деплой-трек (см. open-questions).

None beyond the above — discussion stayed within phase scope.
</deferred>

---

*Phase: 5-Комплаенс-UI*
*Context gathered: 2026-06-30*
