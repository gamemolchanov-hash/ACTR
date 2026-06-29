# Phase 3: Авторизация и личный кабинет - Context

**Gathered:** 2026-06-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Перепровести существующий auth/account-слой витрины (скопированный от american-creator.ru,
сейчас на OMS-контракте) на **ARM storefront API**, чтобы покупатель регистрировался/логинился и
управлял аккаунтом против ARM. Скоуп: регистрация с terms-согласием, логин/сессия (`arm_token`),
сброс пароля по email, личный кабинет (история заказов, адресная книга, профиль + смена пароля),
GDPR/KVKK экспорт и удаление аккаунта.

**Приём тот же, что в Phase 1/2:** UI-скелет уже существует — меняем data-layer и проводку, дизайн
сохраняется 1:1. **Эталон реализации — FBG** (`~/work/puz/FBG`, ветка `prod`), который уже работает
с этим же ARM-контрактом.

**Out of scope (границы):**
- OAuth Google/Apple (AUTH-08) — бэкенд ARM поддерживает, UI отложен (v2).
- UI лояльности (LOYL-01) — `getMe` возвращает `loyalty`, но в Phase 3 НЕ рендерим (отложено v2);
  тип держим опциональным, поле игнорируем в UI.
- Полные KVKK/mesafeli/«mesafeli satış» юр-тексты и KDV-отображение — Phase 5 (комплаенс-UI).
  Здесь только минимальный обязательный terms-чекбокс при регистрации.

</domain>

<decisions>
## Implementation Decisions

### Сессия / хранение токена
- **D-01:** Делаем как в FBG — токен в `localStorage['arm_token']`, шлём `Authorization: Bearer <token>`
  на ARM-запросы (прокси `/api/storefront/[...path]` уже прокидывает `Authorization`). Сессия
  клиентская (CSR ЛК), httpOnly-cookie/SSR — отвергнуто для MVP (можно как hardening-follow-up).
- **D-02:** **Переименовать ключ токена `sf_token` → `arm_token`** (стандартизация с FBG и с
  constraint-доком ARM). Обновить `src/lib/auth.ts` (`TOKEN_KEY`).
- **D-03:** Паттерн `AuthContext` как в FBG: `customer/token/loading/setAuth/signOut/refreshProfile`,
  `getMe()` на маунте если есть токен.
- **D-04 (FBG-50, обязательно сохранить):** Сессию роняет **только реальный auth-fail (401/403)**.
  Сетевые ошибки и 5xx НЕ разлогинивают — иначе транзиентная ошибка (например при `refreshProfile`
  во время чекаута) затрёт токен и сохранённые адреса. Реализовать `isAuthFailure(e)`-гард.

### Связь гость-чекаут ↔ аккаунт
- **D-05:** Делаем как в FBG (вариант «префилл + привязка по токену»):
  - Логиненный юзер: checkout **префиллит** имя/email/phone из `customer` и грузит **сохранённые
    адреса** (`getMyAddresses` / `/me/addresses`); `createOrder` уходит с `Authorization` → ARM сам
    привязывает заказ к аккаунту.
  - ЛК показывает **только authenticated-заказы** (`getMyOrders` → `/me/orders`). Привязка гостевых
    заказов по email-матчу — НЕ делаем.
  - Гость-чекаут продолжает работать (нет токена → нет префилла/привязки).
- **D-06:** Это малое **обратно-совместимое** дополнение к чекауту Phase 2 (`src/app/checkout/page.tsx`):
  добавить префилл-из-`customer` и выбор сохранённого адреса при наличии сессии. OMS/autoCRM не трогаем.

### Согласия при регистрации (AUTH-01)
- **D-07:** Минимальный обязательный **terms-чекбокс** гейтит регистрацию (как FBG-97): `register`
  шлёт `terms_accepted: true` + `terms_version: TERMS_VERSION` (константа в коде, бампается при смене
  юр-копии — GDPR Art.7 accountability). Ссылки чекбокса ведут на юр-заглушки (контент — Phase 5).
- **D-08:** Полные KVKK-согласия (разделённые чекбоксы обработки ПДн/маркетинг) — **НЕ здесь**, Phase 5.

### GDPR/KVKK экспорт + удаление (AUTH-07) — Claude's Discretion, дефолт по FBG
- **D-09:** Не выносилось на отдельное обсуждение — реализуем **как FBG**:
  - **Экспорт** (`GET /me/export`, GDPR Art.20): полный дамп аккаунта (профиль+адреса+заказы) →
    **скачивание JSON-файла** на клиенте (`<a download>`), имя вида `american-creator-account-data.json`.
  - **Удаление** (`POST /me/delete-account`, GDPR Art.17): **анонимизация** аккаунта + удаление
    сохранённых адресов, **с подтверждением паролем** (не hard-delete). Поведение — по факту ответа ARM.
  - ⚠️ researcher: подтвердить наличие/форму этих эндпоинтов в ARM openapi (FBG их использует, но
    демо-тенант ACTR мог не поднять — сверить, как в Phase 2 со Stripe).

### Claude's Discretion
- Точные пути/формы запросов брать из ARM openapi и **верифицировать против живого demo-BFF**
  (`http://localhost:4000`, `make up`) — как делали исполнители Phase 1/2 (Rule-1 авто-фиксы типов).
- Сброс пароля (`forgot-password`/`reset-password`) — механическая перепроводка существующих страниц
  на ARM-пути; токен из URL.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Эталон реализации (ГЛАВНОЕ — пользователь явно указал «как в FBG»)
- `~/work/puz/FBG/src/contexts/AuthContext.tsx` — паттерн сессии: `arm_token` в localStorage,
  `getMe` на маунте, `refreshProfile`, гард FBG-50 (только 401/403 роняет сессию).
- `~/work/puz/FBG/src/lib/api.ts` §§580-710 — **точные ARM auth/account функции и пути**:
  `register` (`POST /auth/register`, body `{name,email,phone?,password,terms_accepted,terms_version}`),
  `login` (`POST /auth/login` → `{token,customer,loyalty?}`), `forgotPassword` (`/auth/forgot-password`),
  `resetPassword` (`/auth/reset-password`), `getMe` (`GET /me`), `getMyOrders` (`GET /me/orders?page`),
  `getOrder` (`GET /orders/:id`), `getMyAddresses` (`GET /me/addresses`), профиль (`PUT /me/profile`),
  `changePassword` (`POST /me/change-password`), `exportAccount` (`GET /me/export`),
  `deleteAccount` (`POST /me/delete-account`). `authHeaders()` §§168-169 — `Authorization: Bearer arm_token`.
- `~/work/puz/FBG/src/pages/AuthPage.tsx` §§64-104, 305-311 — consent-чекбокс (FBG-97), `terms_accepted`+`TERMS_VERSION`.
- `~/work/puz/FBG/src/pages/AccountPage.tsx`, `AccountSettingsPage.tsx` (§§194,231-240), `AccountLayout.tsx` —
  структура ЛК: заказы (query `my-orders`), профиль/смена пароля, export-download + delete-account UI.
- `~/work/puz/FBG/src/pages/CheckoutPage.tsx` §§79,106,149-155,399 — префилл из `customer` + сохранённые адреса.

### ACTR — что перепроводим (текущее OMS-состояние)
- `src/lib/auth.ts` — OMS-контракт: пути `/auth/me*`, ключ `sf_token`. → ARM: `/me*` + `arm_token`.
- `src/lib/auth-context.tsx` — текущий AuthContext (привести к FBG-паттерну).
- `src/app/login/page.tsx`, `login/register`, `login/forgot-password`, `login/reset-password` — страницы входа.
- `src/app/account/page.tsx`, `account/orders`, `account/orders/[id]`, `account/settings` — ЛК.
- `src/app/api/storefront/[...path]/route.ts` — прокси (уже прокидывает `Authorization`, менять не нужно).
- `src/lib/api.ts` — checkout-функции Phase 2 (`createOrder` и т.д.) — точка интеграции для D-06 префилла/привязки.

### Проектные
- `.planning/ROADMAP.md` §«Phase 3» — goal + 4 success criteria.
- `.planning/REQUIREMENTS.md` — AUTH-01..07 (+ отложенные AUTH-08, LOYL-01).
- `.planning/phases/02-checkout/02-02-SUMMARY.md` — как устроен текущий чекаут (для D-06).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Полный UI-скелет auth/account уже существует (страницы login/* и account/*) — дизайн AC сохраняем,
  меняем только data-layer и проводку (как Phase 1/2).
- `src/lib/money.ts` (`fmtMoney`) из Phase 2 — переиспользовать для сумм заказов в ЛК.
- ARM-прокси `/api/storefront/[...path]` уже форвардит `Authorization` — серверная часть готова.

### Established Patterns
- Phase 1/2 паттерн: `src/lib/arm-types.ts` (ARM-типы) + `src/lib/arm-adapter.ts` (ARM→типы витрины) +
  функции в `src/lib/api.ts`. Auth/account-типы и адаптеры добавлять туда же.
- Исполнители верифицируют контракт против живого demo-BFF и делают Rule-1 авто-фиксы типов под факт.

### Integration Points
- Checkout Phase 2 (`src/app/checkout/page.tsx`) — D-06: префилл + сохранённые адреса при сессии,
  `createOrder` с `Authorization`. Строго обратно-совместимо (гость не ломается).

</code_context>

<specifics>
## Specific Ideas

- Пользователь дважды явно сказал «**сделай так же, как в FBG**» по сессии и по связи чекаут↔аккаунт —
  FBG (`~/work/puz/FBG`, ветка `prod`) является авторитетным эталоном для Phase 3. Расхождения с FBG
  допустимы только из-за Next-14-App-Router (FBG — Vite/react-router SPA): переносим логику, не структуру роутера.

</specifics>

<deferred>
## Deferred Ideas

- **OAuth Google/Apple (AUTH-08)** — бэкенд ARM есть (`oauthGoogle`/`oauthApple` в FBG), UI → v2.
- **UI лояльности (LOYL-01)** — `getMe` отдаёт `loyalty`, рендер тиров/баллов → v2.
- **httpOnly-cookie/SSR-сессия** — рассмотреть как security-hardening после MVP (вместо localStorage).
- **Полный KVKK/mesafeli/KDV юр-UI** — Phase 5.

</deferred>

---

*Phase: 3-account*
*Context gathered: 2026-06-30*
