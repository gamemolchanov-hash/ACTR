# Roadmap: ACTR — American Creator TR storefront

## Overview

Существующий фронт american-creator.ru (Next.js 14 + MUI), скопированный в standalone-репо
`~/work/puz/ACTR`, переключается с OMS API на ARM API и адаптируется под турецкий рынок (TRY,
EN+TR). Каждая фаза — самостоятельный пользовательский срез: сначала каталог оживает на ARM
(1), затем корзина/оплата (2), аккаунт (3), локализация (4), комплаенс (5), чистка и бренд (6),
и наконец реальные TR-данные каталога (7). Foundation (scaffold + локальное окружение) уже
выполнена. OMS/autoCRM не затрагиваются.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [x] **Phase 1: Каталог на ARM** - переключить data-layer на ARM, адаптер каталога, рендер из ARM ✅
- [x] **Phase 2: Корзина и чекаут** - distributorProductId, доставка TR, Stripe (test mode) (completed 2026-06-29)
- [x] **Phase 3: Авторизация и личный кабинет** - register/login/ЛК на ARM, GDPR/KVKK (completed 2026-06-30 — UAT 4/5 PASS; GDPR-delete final step blocked by demo-tenant schema, not ACTR code)
- [ ] **Phase 4: i18n EN/TR** - вынос строк, переключатель, локализация контента, SEO
- [ ] **Phase 5: Комплаенс-UI** - KDV, согласия KVKK/«mesafeli satış», юр-страницы
- [ ] **Phase 6: Чистка OMS-специфики + бренд TR** - удалить BOGO/отзывы/CDEK/PayKeeper, свопы бренда
- [ ] **Phase 7: Каталог-данные TR** - TRY-витрина+дистрибьютор с товарами AC

## Phase Details

### Phase 1: Каталог на ARM

**Goal**: Витрина ходит в ARM API и рендерит каталог/категории/карточку товара из ARM (demo-сид).
**Mode:** mvp
**Depends on**: Nothing (foundation готова)
**Requirements**: CAT-01, CAT-02, CAT-03, CAT-04, CAT-05
**Success Criteria** (what must be TRUE):

  1. Запросы витрины уходят в `/public/arm/storefront/*`, `X-Storefront-Key` не виден в клиентском бандле
  2. Листинг каталога и категории отображают товары из ARM
  3. Карточка товара открывается и рендерится из ARM
  4. Картинки товаров грузятся из ARM
  5. Add-to-cart кладёт `distributorProductId`

**Plans**: TBD

Plans:

- [x] 01-01: ARM proxy + adapter + image URLs + SSR (commits 8e37169, 4cc6402)

### Phase 2: Корзина и чекаут

**Goal**: Полный заказ оформляется и оплачивается через ARM (Stripe test mode), с доставкой под TR.
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: CART-01, CART-02, CART-03, CART-04, CART-05, CART-06
**Success Criteria** (what must be TRUE):

  1. Корзина валидирует сток/цену против ARM
  2. Доставка по TR рассчитывается (FedEx или упрощённый/самовывоз)
  3. Заказ создаётся в ARM и оплачивается в Stripe test mode
  4. Страница подтверждения показывает заказ
  5. Промокод применяется через ARM

**Decisions (discuss 2026-06-29)**: Stripe **embedded** (порт FBG-компонента под Next 14+MUI) ·
доставка — потреблять `/shipping/rates` как есть · скоуп — **гость-чекаут** (auth → Phase 3,
KDV/KVKK/mesafeli юр-UI → Phase 5).
**Plans**: 2 (planned 2026-06-29)

Plans:

- [x] 02-01: Checkout data-layer на ARM (cart/promo/shipping/order/payment/order-detail) — wave 1
- [x] 02-02: Checkout/basket/success UI + Stripe Embedded Checkout — wave 2 (depends 02-01)

### Phase 3: Авторизация и личный кабинет

**Goal**: Покупатель регистрируется/логинится и управляет аккаунтом против ARM.
**Mode:** mvp
**Depends on**: Phase 2
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-07
**Success Criteria** (what must be TRUE):

  1. Регистрация с согласием и логин работают (`arm_token`)
  2. Сброс пароля по email работает
  3. ЛК показывает заказы, адреса, профиль; смена пароля работает
  4. Экспорт и удаление аккаунта (GDPR/KVKK) работают

**Plans**: 3 (planned 2026-06-30)

Plans:

- [x] 03-01-PLAN.md — Фундамент сессии: auth.ts(ARM)+FBG AuthContext, register(consent)/login/reset+шим — wave 1 (AUTH-01,02,03)
- [x] 03-02-PLAN.md — ЛК: дашборд + история заказов (TRY/fmtMoney) + адресная книга — wave 2, depends 03-01 (AUTH-04,05)
- [x] 03-03-PLAN.md — Settings (профиль/смена пароля) + GDPR export/delete + checkout-linking (D-06) — wave 2, depends 03-01 (AUTH-06,07)
- [ ] 03-03-PLAN.md — ЛК: профиль+смена пароля + GDPR export/delete + привязка чекаута (D-06) — wave 2, depends 03-01 (AUTH-06,07)

### Phase 4: i18n EN/TR

**Goal**: Витрина полностью на EN+TR, без хардкод-русского, с локализацией контента и SEO.
**Mode:** mvp
**Depends on**: Phase 3
**Requirements**: I18N-01, I18N-02, I18N-03, I18N-04
**Success Criteria** (what must be TRUE):

  1. Все UI-строки вынесены в ключи; русского хардкода нет
  2. Переключатель EN↔TR работает и сохраняет выбор
  3. Контент товара локализуется через ARM `?lang`
  4. SEO/OG/sitemap отдаются на EN и TR

**Plans**: 5 (planned 2026-06-30)

Plans:

- [x] 04-01-PLAN.md — Каркас i18n: next-intl scaffold + миграция [locale] + переключатель/гео + оболочка + fmtMoney(WR-01/05) — wave 1 (I18N-01, I18N-02)
- [x] 04-02-PLAN.md — Каталог/товар: ARM ?lang passthrough + строки каталога + ProductReviews(WR-02) — wave 2, depends 04-01 (I18N-01, I18N-03)
- [ ] 04-03-PLAN.md — Auth/account: login×4 + account×5 строки (checkout/basket подтвердить) — wave 3, depends 04-02 (I18N-01)
- [ ] 04-04-PLAN.md — Статика: studios/delivery/contacts/faq + partners×4 + error-страницы — wave 4, depends 04-03 (I18N-01)
- [ ] 04-05-PLAN.md — SEO: hreflang/OG/sitemap + seo.ts(TRY) + серверный ?lang + Tolgee finalize + фазовый gate — wave 5, depends 04-04 (I18N-01, I18N-04)

### Phase 5: Комплаенс-UI

**Goal**: Витрина соответствует базовым требованиям TR на уровне UI (цены, согласия, юр-страницы).
**Mode:** mvp
**Depends on**: Phase 4
**Requirements**: COMP-01, COMP-02
**Success Criteria** (what must be TRUE):

  1. Цены отображаются с KDV (НДС)
  2. Чекбоксы согласий KVKK/«mesafeli satış» присутствуют в чекауте
  3. Юр-страницы (право возврата и пр.) существуют (заглушки под контент)

**Plans**: TBD

Plans:

- [ ] 05-01: TBD

### Phase 6: Чистка OMS-специфики + бренд TR

**Goal**: Удалён мёртвый OMS-код, бренд/контент адаптированы под TR.
**Mode:** mvp
**Depends on**: Phase 5
**Requirements**: CLEAN-01, CLEAN-02
**Success Criteria** (what must be TRUE):

  1. Удалены BOGO, отзывы, остатки CDEK/PayKeeper, Bitrix-редиректы, RU-страницы
  2. Телефон, соцсети и иконки оплаты заменены на TR-эквиваленты

**Plans**: TBD

Plans:

- [ ] 06-01: TBD

### Phase 7: Каталог-данные TR

**Goal**: Локально заведена TRY-витрина с товарами AC; TRY-каталог рендерится end-to-end.
**Mode:** mvp
**Depends on**: Phase 6
**Requirements**: DATA-01
**Success Criteria** (what must be TRUE):

  1. Есть TRY-дистрибьютор + витрина + товары AC в лирах
  2. Каталог рендерится в TRY на дизайне AC

**Plans**: TBD

Plans:

- [ ] 07-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Каталог на ARM | 1/1 | Complete | 2026-06-29 |
| 2. Корзина и чекаут | 2/2 | Complete   | 2026-06-29 |
| 3. Авторизация и ЛК | 3/3 | Complete | 2026-06-30 |
| 4. i18n EN/TR | 2/5 | In Progress|  |
| 5. Комплаенс-UI | 0/TBD | Not started | - |
| 6. Чистка + бренд TR | 0/TBD | Not started | - |
| 7. Каталог-данные TR | 0/TBD | Not started | - |
