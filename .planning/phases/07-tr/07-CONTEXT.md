# Phase 7: Каталог-данные TR - Context

**Gathered:** 2026-07-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Фаза сужена по решению владельца (discuss 2026-07-01). Требование `DATA-01` разделено на две
части:

- **Данные (владелец, вручную, позже):** заведение TRY-дистрибьютора + витрины (storefront) +
  товаров + связки `arm_storefront_distributors` + **цены** в TRY. Владелец делает это сам в
  локальном ARM-тенанте. **Вне код-скоупа фазы.**
- **Код ACTR (эта фаза):** довести валютную проводку витрины так, чтобы против корректно
  наполненных TR-данных **раздел `/catalog` открывался без 500-ошибок в консоли и рендерил цены
  в ₺ (TRY)** end-to-end на дизайне AC.

**Тенант:** локальный `demo` (тот, где установлен модуль ARM). **Источник товаров:** товары, уже
заведённые в этом локальном ARM-тенанте (не BetaPro, не forza prod).

**In scope (DATA-01, код-часть):**
- Валютная проводка `X-Currency: TRY` на всех путях каталога (в первую очередь SSR
  `src/lib/server-api.ts`, где заголовка валюты сейчас нет), чтобы каталог резолвил TRY и не
  давал 500 против наполненных данных.
- Рендер каталога/карточки в ₺ (display-слой уже на TRY — верифицировать).

**Out of scope (владелец / позже / деплой-трек):**
- Заведение самих данных в ARM (дистрибьютор/витрина/товары/связки) — владелец, вручную.
- Назначение TRY-цен (конвертация или ручные) — «цены не трогай, потом разберёмся».
- Реальный TR-фулфилмент/перевозчик — деплой-трек (локально `manual`).
- Любые изменения OMS/autoCRM/packs/BFF — жёсткая изоляция; правки только в репо ACTR.
</domain>

<decisions>
## Implementation Decisions

### Скоуп и владение данными
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

### Граница «готово» / приёмка
- **D-04:** Acceptance criterion фазы = **`/catalog` открывается без 500-ошибок в консоли** и
  рендерит цены в ₺.
- **D-05:** **Приёмка после наполнения** — «нет 500» проверяет владелец уже на своих TR-данных.
  Текущий 500 (нет данных / нет связки currency→distributor) — ожидаемое состояние ДО наполнения,
  **не** провал фазы. Следствие: graceful-degradation (error-boundary/empty-state на случай
  ошибки витрины) НЕ является целью фазы.

### Код-деливери ACTR
- **D-06:** Главная правка — **валюта на SSR-пути**. `src/lib/server-api.ts` (`sfFetch`, ~L72-74)
  сейчас шлёт только `X-Tenant-ID` + `X-Storefront-Key`, **без `X-Currency`**. Добавить
  `X-Currency` (значение `NEXT_PUBLIC_STOREFRONT_CURRENCY || 'TRY'`), чтобы SSR-каталог/деталь/
  категории/sitemap/metadata резолвили TRY так же, как клиентский путь. Заодно поправить
  стале-комментарий `/public/oms/storefront/*` (server-api.ts:8) → arm.
- **D-07:** Выровнять клиентский путь: `api.ts:currencyHeader()` (L149-153) уже шлёт
  `X-Currency: TRY`, а прокси `route.ts:51` форвардит его. Research/planner подтверждает, что
  каталог-листинг (client) тоже несёт валюту (не только cart/checkout).

### Claude's Discretion
- Точный набор мест инъекции `X-Currency` (все SSR-фетчеры + при необходимости client каталог),
  способ (env-driven константа vs helper) — планировщик/research уточняет.
- НЕ добавлять graceful-degradation/error-boundary как основную цель (D-05). Если всплывёт как
  дешёвый побочный эффект — ок, но не расширять скоуп.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Скоуп / требования
- `.planning/ROADMAP.md` §"Phase 7: Каталог-данные TR" — цель + Success Criteria (2 критерия).
  ⚠️ Критерий №1 («TRY-дистрибьютор+витрина+товары») теперь **владелец-owned** (D-01), не код.
- `.planning/REQUIREMENTS.md` — `DATA-01` (разделён на данные-владельца + код-часть, см. domain).
- `.planning/PROJECT.md` §"Constraints" / §"Out of Scope" — изоляция OMS/autoCRM (только данные,
  код не трогаем); TR/TRY/EN+TR; деплой отложен.

### ARM data model / provisioning (для владельца — как заводить; для research — контракт; read-only)
- `../../autoCRM/docs/modules/arm/ACTR/TZ.md` §6 «Бэкенд-предпосылки» (абс.
  `/home/lexun/work/autoCRM/docs/modules/arm/ACTR/TZ.md`) — **точный рецепт** заведения:
  `arm_distributors(currency='TRY')`, `arm_storefronts(currency,'TRY',locale,payment_config)`,
  `POST /api/arm/storefronts/:id/generate-key`, `arm_storefront_distributors((storefront,'TRY')→
  distributor, is_default=true)`, `arm_products` + `arm_distributor_products(price TRY,
  show_in_storefront, is_available, fulfillment_product_id)` + `arm_product_translations(tr-TR)`.
- `../../autoCRM/packs/arm/bff/docs/openapi.yaml` — контракт `/public/arm/storefront/*`
  (валютные заголовки, форма каталога). Только read-only, НЕ править.
- `../../autoCRM/packs/arm/schema/collections.json` — схема `arm_*` (валюта per-distributor;
  `arm_storefront_distributors` для роутинга валюты).
- `../../autoCRM/packs/arm/bff/routes/storefronts.ts:297` — эндпоинт generate-key (владельцу при
  заведении витрины).
- `https://forza-brava.com/api/docs` — **пример** того же ARM Storefront API (референс контракта,
  идентичен local openapi.yaml). **НЕ источник данных.**

### Prior phase context (совместимость)
- `.planning/phases/04-i18n-en-tr/04-CONTEXT.md` — `fmtMoney`/TRY, X-Currency-хвосты (WR-01/WR-05);
  money.ts дефолт TRY.
- `.planning/phases/05-ui/05-CONTEXT.md` — KDV `kdvFromBrutto` (цена трактуется как brutto /
  KDV-inclusive — важно для владельца при назначении цен позже, D-02).
- `.planning/STATE.md` §"Pending Todos" — todo «каталог рендерит ₽» **вероятно устарел** (см.
  code_context: ProductCard/Header/money.ts уже на TRY) — research подтверждает.
</canonical_refs>

<code_context>
## Existing Code Insights

### Точки правки / Reusable (конкретные пути)
- **`src/lib/server-api.ts`** — SSR-фетчеры каталога (`sfFetch` L72-74: `X-Tenant-ID` +
  `X-Storefront-Key`, **X-Currency ОТСУТСТВУЕТ**). Главная точка D-06. Стале-комментарий L8
  `/public/oms/storefront/*` → arm. Базовые константы: `BFF_INTERNAL_URL` (:4000), `TENANT_ID`
  (`demo-tenant`), `STOREFRONT_KEY` (env), `STOREFRONT_BASE=.../public/arm/storefront`.
- **`src/lib/api.ts`** — client axios; `currencyHeader()` L149-153 → `X-Currency: TRY`
  (`NEXT_PUBLIC_STOREFRONT_CURRENCY || 'TRY'`); используется на cart/checkout (L184/204/232/275).
  Проверить каталог-листинг (D-07).
- **`src/app/api/storefront/[...path]/route.ts`** — прокси: L48-51 инжектит `X-Tenant-ID`/
  `X-Storefront-Key` server-side (ключ не в бандле) и **форвардит `X-Currency`** из входящего
  запроса.
- **`src/lib/money.ts`** — `fmtMoney(amount, currency?, locale?)`; дефолт валюты
  `NEXT_PUBLIC_STOREFRONT_CURRENCY || 'TRY'` (money.ts:10).
- **`src/components/ProductCard.tsx:138`** — `fmtMoney(product.price, 'TRY', bcp47)` — **уже ₺**,
  не ₽. `Header.tsx:273/604` — тоже `'TRY'`. ⇒ display-слой каталога уже TRY (todo «₽» устарел).
- **`src/lib/arm-adapter.ts`** (+ `arm-types.ts`) — адаптер `arm_distributor_product` → `Product`
  (Phase 1); каталог-рендер использует его. Проверить, читается ли валюта товара (для мультивалюты
  не нужно — витрина одновалютная TRY).

### Established Patterns / Constraints
- **Одна валюта TRY** (мультивалюта out of scope) → хардкод `'TRY'` в display-местах — by-design.
- **SSR различает 404 vs 5xx**: genuine 404 → `null` → `notFound()`; transient/5xx →
  `throw BffUnavailableError`. ⇒ при живом BFF-500 (нет данных) каталог-страница получит 5xx —
  **ожидаемо до наполнения** (D-05).
- **Изоляция**: autoCRM/packs/BFF код НЕ править (D-01) — правки только в репо ACTR.
- **env**: `NEXT_PUBLIC_TENANT_ID=demo-tenant`, `ARM_STOREFRONT_KEY` (server-side, не в бандле),
  `BFF_INTERNAL_URL=http://localhost:4000`; ACTR dev на **:3003** (не :3000).

### Integration Points / текущее состояние окружения
- Локальный стек поднят: BFF **:4000**, Directus **:8062**, ACTR **:3003**.
- Сейчас `GET /public/arm/storefront/config` и `/products` → **HTTP 500** (и напрямую, и через
  ACTR-прокси) — резолв валюты/дистрибьютора падает (вероятно нет `arm_storefront_distributors`
  связки в demo). Это и есть пробел, который закрывает наполнение владельца (D-01); после него
  500 должен уйти. Research-фаза добивает точный рут-косс (backend-данные vs возможный баг ACTR).
</code_context>

<specifics>
## Specific Ideas

- `forza-brava.com/api/docs` = **референс контракта** ARM Storefront API (тот же, что local
  `openapi.yaml`); показывает, «как работать с бэком». **НЕ источник данных.**
- Источник товаров — **только тот локальный тенант, где установлен модуль ARM** (`demo`).
  Не BetaPro (в Турции будет другой фулфилмент), не forza prod.
- Владелец сам заведёт данные и цены и сам примет фазу по критерию «нет 500 в консоли на
  `/catalog`» на своих TR-данных.
</specifics>

<deferred>
## Deferred Ideas

- **Назначение TRY-цен** (фикс-курс-конвертация или ручные; brutto/KDV-inclusive) — владелец,
  позже (D-02).
- **Фактическое заведение TR-данных в ARM** (дистрибьютор/витрина/товары/связки) — владелец,
  вручную, позже (D-01). Вне код-скоупа, но обязательно для приёмки (D-05).
- **Реальный TR-фулфилмент/перевозчик** — деплой-трек.
- **Graceful degradation каталога** при ошибке витрины (error-boundary/empty-state) — не в скоупе
  (D-05); при желании — отдельным слайсом.
- **Реальные TR-переводы контента товаров** (`arm_product_translations` tr-TR) — параллельная
  контент-задача (владелец/контент).

</deferred>

---

*Phase: 7-tr*
*Context gathered: 2026-07-01*
