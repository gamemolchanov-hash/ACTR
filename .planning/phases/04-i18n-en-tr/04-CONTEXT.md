# Phase 4: i18n EN/TR - Context

**Gathered:** 2026-06-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Витрина ACTR полностью двуязычна: **EN + TR**, без хардкод-русского текста. UI-строки вынесены
в ключи и переводятся через Tolgee; контент товара локализуется через ARM `?lang`; язык
переключается и запоминается; SEO (hreflang/OG/sitemap) отдаётся на оба языка.

Покрывает: I18N-01 (локали EN+TR, нет RU-хардкода), I18N-02 (переключатель + сохранение),
I18N-03 (контент через ARM `?lang`), I18N-04 (SEO/OG/sitemap EN+TR).

**Не входит** (другие фазы): KDV/KVKK/«mesafeli» юр-UI и согласия (Phase 5), удаление
OMS-специфики и бренд-свопы TR (Phase 6), реальные TR-данные каталога (Phase 7).
</domain>

<decisions>
## Implementation Decisions

### Подход и маршрутизация
- **D-01:** i18n через **`next-intl` + `[lang]`-сегмент** (пути `/en`, `/tr`) в Next.js 14 App
  Router, с middleware для определения/маршрутизации локали. SSR-локализация (строки рендерятся
  на сервере) — это и закрывает SEO-требование I18N-04. Сознательный отход от FBG (Vite SPA с
  client-Context): паттерн FBG берём как референс концепций (`t()`, словари, BCP47, persistence),
  а не как 1:1 порт.
- **D-07 (SEO, следствие D-01):** на каждый язык — свой URL (`/en/...`, `/tr/...`); `hreflang`
  alternates, локализованный `<html lang>`, OG-locale, и sitemap с записями для EN и TR (I18N-04).

### Локали
- **D-02:** Поддерживаемые UI-языки — **EN и TR**. RU убирается полностью (хардкод-строки
  извлекаются, русского контента в витрине не остаётся).

### Язык по умолчанию и автоопределение
- **D-03:** **Гео-детект**: посетитель из Турции (`geo_country=TR`, BFF уже отдаёт его в
  `/storefront/config`) → **TR**; все остальные → **EN**. Выбор пользователя запоминается
  (cookie, чтобы middleware читал его на сервере). Фолбэк автодетекта — заголовок
  `Accept-Language`. Ручной переключатель EN↔TR (I18N-02).

### Переводы (источник и потребление)
- **D-04:** **Tolgee** (self-hosted `https://loco.devloc.su`, проект **34** — для ACTR) —
  единственный источник правды для UI-переводов. Tolgee MCP подключён (`mcp__tolgee__*`) для
  программного доступа.
- **D-05:** Потребление — **экспорт ключей в статический JSON на этапе билда** (через Tolgee
  CLI/MCP), `next-intl` читает эти JSON-каталоги. В проде нет runtime-зависимости от Tolgee
  (in-context live-редактирование — отложено, см. Deferred).
- **D-06:** **Извлечение строк** — ~50 файлов `.ts/.tsx` с хардкод-кириллицей переводятся в
  EN-ключи; **EN — базовый/фолбэк-язык**, TR приходит из Tolgee. (Сюда же сворачиваются находки
  code-review Phase 3 — см. Folded findings.)

### Контент товара через ARM `?lang`
- **D-08 (УТОЧНЕНО research'ем):** Прокси (`src/app/api/storefront/[...path]/route.ts`) прокидывает
  **полные BCP-47 коды**: UI `en` → `?lang=en-US`, `tr` → `?lang=tr-TR`. ⚠️ BFF принимает только
  формат `/^[a-z]{2}-[A-Z]{2}$/` (`storefront-api.ts:389`) — короткие `en`/`tr` **молча
  игнорируются**, поэтому исходное «короткие коды» отменено. `?lang=` поддерживается **только на
  product-detail** (`/products/:idOrSlug`), НЕ на списке `/products`. Если у товара нет перевода в
  ARM — показывается **контент на языке по умолчанию** (никогда не пусто). (I18N-03)
  - TR-тенант должен хранить `arm_product_translations.locale = tr-TR` (open question — см. RESEARCH).

### Folded findings (из code-review Phase 3 — чистятся здесь)
- **WR-01:** `Header.tsx` — `₽` + `ru-RU` в подсказках поиска → локализованный формат + валюта **TRY**.
- **WR-02:** `ProductReviews.tsx` — `ru-RU` даты + русско-специфичная плюрализация → `Intl` по активной локали.
- **WR-05:** валютный фолбэк `USD` (везде кроме order-detail) → **TRY** для TR-рынка через `Intl.NumberFormat`.
  Все три — часть I18N-01 («нет RU-хардкода») + корректное форматирование по локали.

### Claude's Discretion
- Точная раскладка конфигурации `next-intl` (middleware matcher, структура каталогов сообщений,
  `i18n/request.ts` и т.п.).
- Дата/число/валюта — через `Intl` с активной локалью (TRY для цен).
- Механизм билд-экспорта Tolgee→JSON (CLI vs MCP-скрипт) — выбрать в research.
- Lazy-load TR-каталога ради перфоманса — на усмотрение.
- Маппинг ключей при извлечении (namespacing) — на усмотрение, но консистентно.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Translation infrastructure (Tolgee)
- `/home/lexun/work/autoCRM/docs/Localize.md` — настройка Tolgee-сервера (loco.devloc.su,
  all-in-one образ, Cloudflare-туннель, admin-gated; регистрация выключена). Содержит
  admin-доступ — не коммитить креды в репозиторий.
- `https://loco.devloc.su/projects/34` — **проект ACTR** в Tolgee (источник правды переводов).
- Tolgee MCP: инструменты `mcp__tolgee__*` (list/create keys, get/set translations,
  machine_translate, export) — для извлечения/синхронизации.

### Reference implementation (концепции, не 1:1 порт)
- `~/work/puz/FBG/src/contexts/LocaleContext.tsx` — паттерн `t()` с интерполяцией+фолбэком,
  code-split словари, BCP47-маппинг, persistence (адаптировать под App Router/next-intl).
- `~/work/puz/FBG/src/locales/*.json` — форма JSON-каталога сообщений.

### Project requirements & contracts
- `.planning/REQUIREMENTS.md` — I18N-01..04.
- `.planning/ROADMAP.md` — Phase 4 goal + success criteria.
- `.planning/STATE.md` → Pending Todos — отложенные i18n-находки code-review (WR-01/02/05),
  WR-04 (auth loading-redirect edge — не i18n, но всплыло).

### ACTR integration points
- `src/app/api/storefront/[...path]/route.ts` — прокси, куда вставляется `?lang` passthrough.
- `src/lib/money.ts` (`fmtMoney`) — форматирование валюты, привести к TRY/локали.
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **FBG locale pattern** — `t()`/словари/BCP47/persistence как концептуальный референс.
- **`src/lib/money.ts` `fmtMoney(amount, currency)`** — уже централизованное форматирование валюты;
  точка приведения к TRY + локали.
- **BFF `/storefront/config`** — отдаёт `geo_country` (+ `recommended_currency`) — основа гео-детекта (D-03).

### Established Patterns
- **Next.js 14 App Router** (`src/app/...`) + **MUI** — i18n должен работать с SSR (RSC), отсюда
  выбор `next-intl` + `[lang]`, а не client-only Context.
- **Storefront proxy** (`[...path]/route.ts`) уже прокидывает заголовки/квери — добавить `?lang`.

### Integration Points
- Корневой layout → `[lang]`-сегмент + провайдер `next-intl`; middleware на детект/редирект локали.
- Все ~50 файлов с кириллицей → замена на `t('key')`; источник ключей — Tolgee export.
- `sitemap.xml`/SEO-метаданные → пер-локальные записи + hreflang.
</code_context>

<specifics>
## Specific Ideas

- Tolgee проект **34** на `loco.devloc.su` — именно он для ACTR.
- `LANGUAGES = ["EN", "TR"]` (RU удалить из любых списков локалей, как в FBG-паттерне правки массива).
- EN — базовый каталог/фолбэк; TR — основной целевой рынок, но не обязательно язык по умолчанию
  для не-TR гео.
</specifics>

<deferred>
## Deferred Ideas

- **Tolgee runtime SDK + in-context live-редактирование** (`@tolgee/react`, Alt+клик) — удобно
  редакторам, но runtime-зависимость и сложнее с SSR. Не сейчас; D-05 = статический экспорт.
- **Полные BCP47-коды (en-US/tr-TR) для ARM `?lang`** — только если research подтвердит, что ARM
  различает регионы. По умолчанию короткие коды (D-08).
- **Дополнительные локали сверх EN/TR** — будущее.
- **WR-04 (auth loading-redirect edge)** — не i18n; остаётся Phase-3 follow-up в STATE Pending Todos.

None beyond the above — discussion stayed within phase scope.
</deferred>

---

*Phase: 4-i18n EN/TR*
*Context gathered: 2026-06-30*
