# ACTR — American Creator TR storefront

## What This Is

Витрина интернет-магазина для **турецкого рынка** с дизайном и кодом фронта как у
**american-creator.ru** (`services/storefront`, Next.js 14 + MUI), но работающая по **ARM Portal
API** (`/public/arm/storefront/*`, как forza-brava.com). Отдельный standalone-репозиторий
`~/work/puz/ACTR`. Рынок — Турция, валюта — TRY, языки — EN + TR.

## Core Value

Покупатель в Турции проходит весь путь покупки (каталог → корзина → checkout → оплата → личный
кабинет) на привычном дизайне american-creator.ru, работающем на ARM-инфраструктуре.

## Requirements

### Validated

<!-- Shipped/confirmed. Foundation выполнена до GSD-формализации. -->

- ✓ Standalone-репо `~/work/puz/ACTR` из копии `services/storefront`, baseline на GitHub — Phase 0
- ✓ Локальное окружение: ARM BFF (demo-tenant) достижим на :4000, dev-сервер поднимается — Phase 0b
- ✓ Чистка OMS-специфики + брендовые свопы под TR — Phase 6 (validated 2026-07-01; gap-closure 06-06 закрыл RU-остатки: юр-блок контактов + копирайт футера)

### Active

<!-- Текущий скоуп разработки (фазы 1–7). -->

- [ ] Каталог рендерится из ARM (листинг, категории, карточка, картинки) — Phase 1
- [ ] Корзина и чекаут на ARM (distributorProductId, доставка TR, Stripe) — Phase 2
- [ ] Авторизация и личный кабинет на ARM (consent, заказы, адреса, GDPR/KVKK) — Phase 3
- [ ] i18n EN/TR (вынос строк, переключатель, локализация контента, SEO) — Phase 4
- [ ] Комплаенс-UI (KDV, KVKK/«mesafeli satış», юр-страницы) — Phase 5
- [ ] Каталог-данные TR (TRY-витрина с товарами AC) — Phase 7

### Out of Scope

- **Деплой / go-live** (прод-тенант, домен `.tr`, Stripe-TR эквайер, реальный перевозчик,
  e-fatura, CSP/GlitchTip прод) — отложено владельцем до готовности витрины.
- **Любые изменения OMS / autoCRM (`packs/*`, общий BFF-код)** — жёсткая изоляция; используем
  только существующие ARM-эндпоинты; OMS работает по старой схеме.
- **Мультивалюта (>1)** — только TRY. **Доп. языки (кроме EN/TR)** — нет.
- **Выпуск e-fatura/фискальных документов** — вне платформы (внешняя бухгалтерия/сервис).
- **Локальный эквайер (iyzico/PayTR)** — деплой-трек (потенциальная бэкенд-доработка ARM).
- **OAuth (Google/Apple), UI лояльности** — отложены (v2), бэкенд-логику не трогаем.

## Context

- **База:** `services/storefront` из autoCRM (american-creator.ru) — Next.js 14 App Router +
  MUI/Emotion + TanStack Query + axios. Самодостаточен, без workspace-зависимостей от монорепо.
- **Целевой бэкенд:** ARM storefront API `/public/arm/storefront/*` (OpenAPI:
  `autoCRM/packs/arm/bff/docs/openapi.yaml`; та же интеграция, что у боевой FBG-витрины).
- **Разработка локально** на ARM-стеке autoCRM (`make up`, тенант `demo-tenant`, demo
  storefront-key). Прод forza-brava не нужен.
- **Ключевое отличие данных:** ARM отдаёт вложенную форму `arm_distributor_products` ⋈
  `arm_products` (товар в корзине = `distributorProductId`), не плоский `oms_products` — нужен
  адаптер к типам компонентов AC.
- **Турция:** KDV (НДС), KVKK (защита данных), «mesafeli satış» (дистанц. продажа), локальные
  перевозчики, ограниченная доступность Stripe — детали в
  `autoCRM/docs/modules/arm/ACTR/{TZ,open-questions}.md`.

## Constraints

- **Tech stack**: Next.js 14 + MUI (наследуется как есть) — дизайн сохраняется 1:1.
- **API contract**: ARM `/public/arm/storefront/*` — заголовки `X-Tenant-ID`, `X-Storefront-Key`
  (server-side), `X-Currency`.
- **Isolation**: OMS/autoCRM не трогать; общий BFF-код — только обратносовместимо.
- **Security**: `X-Storefront-Key` держать server-side (Next route-handler), не в клиентском бандле.
- **Market/compliance**: TR — KDV, KVKK, mesafeli satış.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Переключить копию AC-фронта на ARM API (НЕ форк FBG) | сохраняет дизайн AC 1:1; ARM-интеграция — целевая | — Pending |
| Отдельный standalone-репо `~/work/puz/ACTR` | физическая изоляция от OMS/autoCRM | ✓ Good |
| Рынок Турция · TRY · EN+TR | требование владельца | — Pending |
| Деплой отложен | сначала разработать витрину, прод-вопросы (Stripe-TR, перевозчик) позже | — Pending |
| `X-Storefront-Key` — server-side route-handler | не светить секрет в клиентском бандле | — Pending |
| Разработка на demo-tenant локально | развязка с прод-бэкендом; Stripe test mode глобален | ✓ Good |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-07-01 after Phase 6 completion (OMS cleanup + TR brand swap)*
