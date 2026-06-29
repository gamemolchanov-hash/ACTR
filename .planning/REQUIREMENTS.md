# Requirements: ACTR — American Creator TR storefront

**Defined:** 2026-06-29
**Core Value:** Покупатель в Турции проходит весь путь покупки на дизайне american-creator.ru, работающем на ARM-инфраструктуре.

## v1 Requirements

### Foundation

- [x] **BOOT-01**: Standalone-репо ACTR собран из копии `services/storefront`, baseline на GitHub
- [x] **BOOT-02**: Локальный ARM-бэкенд достижим (demo-tenant), dev-сервер ACTR поднимается

### Catalog

- [x] **CAT-01**: Витрина ходит в ARM API `/public/arm/storefront/*` с server-side `X-Storefront-Key`
- [x] **CAT-02**: Листинг каталога рендерит товары из ARM (адаптер `distributorProduct` → `Product`)
- [x] **CAT-03**: Карточка товара рендерится из ARM
- [x] **CAT-04**: Навигация по категориям из ARM
- [x] **CAT-05**: Картинки товаров грузятся из ARM (MinIO, схема `/images/:tenantId/*`)

### Cart & Checkout

- [x] **CART-01**: Добавление в корзину оперирует `distributorProductId`
- [x] **CART-02**: Корзина валидирует сток/цену против ARM (`/cart/validate`)
- [x] **CART-03**: Расчёт доставки для TR (FedEx `/shipping/rates` или упрощённый/самовывоз)
- [x] **CART-04**: Оформление заказа создаёт заказ в ARM (`POST /orders`)
- [x] **CART-05**: Оплата Stripe (test mode) + страница подтверждения заказа
- [x] **CART-06**: Применение промокода через ARM (`/promo/validate`)

### Auth & Account

- [ ] **AUTH-01**: Регистрация с согласием (terms consent)
- [ ] **AUTH-02**: Логин и сессия (`arm_token`)
- [ ] **AUTH-03**: Сброс пароля по email
- [ ] **AUTH-04**: Личный кабинет: история заказов
- [ ] **AUTH-05**: Личный кабинет: адресная книга
- [ ] **AUTH-06**: Личный кабинет: профиль и смена пароля
- [ ] **AUTH-07**: GDPR/KVKK: экспорт и удаление аккаунта

### i18n

- [ ] **I18N-01**: Локали EN + TR, хардкод-русского текста нет
- [ ] **I18N-02**: Переключатель языка с сохранением выбора
- [ ] **I18N-03**: Контент товара локализован через ARM `?lang=<bcp47>`
- [ ] **I18N-04**: SEO/OG/sitemap на EN и TR

### Compliance

- [ ] **COMP-01**: Цены отображаются с KDV (НДС 20%)
- [ ] **COMP-02**: Согласия KVKK + «mesafeli satış»/право возврата + юр-страницы-заглушки

### Cleanup & Brand

- [ ] **CLEAN-01**: Удалена OMS-специфика (BOGO, отзывы, CDEK/PayKeeper, Bitrix-редиректы, RU-страницы)
- [ ] **CLEAN-02**: Брендовые свопы под TR (телефон, соцсети, иконки оплаты)

### Catalog Data

- [ ] **DATA-01**: TRY-витрина+дистрибьютор с товарами AC; TRY-каталог рендерится end-to-end

## v2 Requirements

### Auth

- **AUTH-08**: OAuth-вход (Google/Apple) — бэкенд ARM поддерживает, UI отложен
- **LOYL-01**: UI программы лояльности (тиры/баллы) — бэкенд есть, UI отложен

## Out of Scope

| Feature | Reason |
|---------|--------|
| Деплой / go-live (тенант, домен `.tr`, CSP/GlitchTip прод, source maps) | отложено владельцем до готовности витрины |
| Изменения OMS / autoCRM (`packs/*`, общий BFF) | жёсткая изоляция; используем только существующие ARM-эндпоинты |
| Мультивалюта (>1 валюты) | v1 — только TRY |
| Доп. языки (кроме EN/TR) | v1 — только EN+TR |
| Выпуск e-fatura / фискальных документов | вне платформы (внешняя бухгалтерия/сервис) |
| Локальный эквайер (iyzico/PayTR) | деплой-трек; потенциальная бэкенд-доработка ARM |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| BOOT-01 | Phase 0 | Complete |
| BOOT-02 | Phase 0 | Complete |
| CAT-01 | Phase 1 | Complete |
| CAT-02 | Phase 1 | Complete |
| CAT-03 | Phase 1 | Complete |
| CAT-04 | Phase 1 | Complete |
| CAT-05 | Phase 1 | Complete |
| CART-01 | Phase 2 | Complete |
| CART-02 | Phase 2 | Complete |
| CART-03 | Phase 2 | Complete |
| CART-04 | Phase 2 | Complete |
| CART-05 | Phase 2 | Complete |
| CART-06 | Phase 2 | Complete |
| AUTH-01 | Phase 3 | Pending |
| AUTH-02 | Phase 3 | Pending |
| AUTH-03 | Phase 3 | Pending |
| AUTH-04 | Phase 3 | Pending |
| AUTH-05 | Phase 3 | Pending |
| AUTH-06 | Phase 3 | Pending |
| AUTH-07 | Phase 3 | Pending |
| I18N-01 | Phase 4 | Pending |
| I18N-02 | Phase 4 | Pending |
| I18N-03 | Phase 4 | Pending |
| I18N-04 | Phase 4 | Pending |
| COMP-01 | Phase 5 | Pending |
| COMP-02 | Phase 5 | Pending |
| CLEAN-01 | Phase 6 | Pending |
| CLEAN-02 | Phase 6 | Pending |
| DATA-01 | Phase 7 | Pending |

**Coverage:**

- v1 requirements: 29 total (2 Foundation complete + 27 active)
- Mapped to phases: 29
- Unmapped: 0 ✓

---
*Requirements defined: 2026-06-29*
*Last updated: 2026-06-29 after initialization*
