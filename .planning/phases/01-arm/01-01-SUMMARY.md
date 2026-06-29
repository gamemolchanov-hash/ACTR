---
phase: 01-arm
plan: 01
subsystem: api
tags: [nextjs, route-handler, arm-api, adapter, axios, proxy]

requires:
  - phase: Phase 0 (foundation)
    provides: standalone ACTR repo + рабочее локальное ARM-окружение (demo-tenant)
provides:
  - ARM-прокси route-handler с server-side X-Storefront-Key
  - Адаптер ARM distributor-product → тип Product компонентов AC
  - Каталог/категории/деталь/картинки из ARM (data-layer)
affects: [Phase 2 cart/checkout, Phase 3 auth, Phase 7 TR catalog data]

tech-stack:
  added: []
  patterns:
    - "Next App-Router route-handler как server-side прокси с инъекцией секрета"
    - "Единая точка адаптации ARM→AC-типы (arm-adapter.ts), компоненты не трогаем"

key-files:
  created:
    - src/app/api/storefront/[...path]/route.ts
    - src/lib/arm-types.ts
    - src/lib/arm-adapter.ts
  modified:
    - next.config.js
    - src/lib/api.ts
    - src/lib/image-url.ts
    - src/lib/server-api.ts

key-decisions:
  - "X-Storefront-Key инъектится в route-handler из не-NEXT_PUBLIC env — не в клиентском бандле"
  - "Product.id = distributorProductId (ARM dp.id) — его ждут cart/order endpoints"
  - "Картинки через тот же прокси на ARM /images/:tenantId/*?w= (WebP по ширине)"

patterns-established:
  - "Прокси `/api/storefront/*` → `/public/arm/storefront/*` (server-side ключ)"
  - "armToProduct/armToCategory — изоляция различий формы ARM от компонентов"

requirements-completed: [CAT-01, CAT-02, CAT-03, CAT-04, CAT-05]

duration: ~25min
completed: 2026-06-29
---

# Phase 1: Каталог на ARM Summary

**Витрина AC переключена с OMS на ARM API: server-side прокси с X-Storefront-Key + адаптер distributor-product → тип Product; каталог, категории, карточка и картинки идут из ARM без изменения дизайна.**

## Performance

- **Duration:** ~25 мин
- **Tasks:** 4 (3 кодовых + верификация)
- **Files modified:** 7 (3 created, 4 modified)

## Accomplishments
- ARM-прокси `src/app/api/storefront/[...path]/route.ts` — форвардит на `/public/arm/storefront/*`, инъектит `X-Tenant-ID` + `X-Storefront-Key` server-side, прокидывает `X-Currency`/`Authorization`. OMS-rewrite убран.
- Адаптер `arm-adapter.ts` (+ типы `arm-types.ts`): ARM distributor-product → `Product` AC. `fetchProducts/fetchProduct/fetchCategories` и `server-api.ts` (SSR) переведены на ARM.
- Картинки на ARM-схему `/api/storefront/images/:tenantId/*?w=`.

## Task Commits

1. **Task 1: ARM proxy route-handler + server-side key** — `8e37169` (feat)
2. **Tasks 2-3: adapter + image URLs + SSR on ARM** — `4cc6402` (feat)

**Plan metadata:** `099fb63` (docs: phase-1 plan)

## Files Created/Modified
- `src/app/api/storefront/[...path]/route.ts` — ARM-прокси, server-side ключ
- `src/lib/arm-types.ts` — формы ответов ARM
- `src/lib/arm-adapter.ts` — armToProduct / armToCategory
- `next.config.js` — убран OMS-rewrite
- `src/lib/api.ts` — fetchProducts/Product/Categories на ARM через адаптер
- `src/lib/image-url.ts` — ARM image URLs (WebP по ширине)
- `src/lib/server-api.ts` — SSR на ARM + X-Storefront-Key; отзывы → null (у ARM нет)

## Decisions Made
- Прокси-секрет server-side (route-handler), не клиентский бандл — улучшение относительно эталонного FBG.
- `Product.id` = `distributorProductId` — корзина/заказы фаз 2+ будут оперировать им.

## Deviations from Plan
None — план исполнен как написан.

## Issues Encountered
- WSL2 zombie docker-proxy блокировал host-порт 4000 (разово, вне кода ACTR) — порт почищен, ARM ожил.
- `pkill -f "next dev"` самоматчился и убивал шелл — рестарт dev-сервера через port-kill (`fuser`).

## User Setup Required
None — внешних сервисов не добавляли (Stripe/FedEx/Ongoing — фазы 2+ / деплой).

## Next Phase Readiness
- Каталог на ARM готов — есть `distributorProductId` для корзины (Phase 2).
- Известный косметический момент: `ProductCard` формат цены пока `₽` (OMS-хардкод) — чинится в Phase 5 (валюта) / Phase 4 (i18n). На demo-данных EUR это видно, ожидаемо.

---
*Phase: 01-arm*
*Completed: 2026-06-29*
