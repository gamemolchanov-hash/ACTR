# Phase 3: Авторизация и личный кабинет - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-30
**Phase:** 3-account
**Areas discussed:** Сессия/хранение arm_token, Связь гость-чекаут ↔ аккаунт, Согласия при регистрации
(GDPR/KVKK экспорт+удаление — не выбрано на обсуждение, оставлено на дефолт-по-FBG)

---

## Сессия / хранение arm_token

| Option | Description | Selected |
|--------|-------------|----------|
| localStorage + Authorization (текущий) | 'arm_token' в localStorage, Bearer-заголовок, CSR ЛК — как FBG | ✓ |
| httpOnly-cookie через route-handler | Серверная сессия, защита от XSS, SSR ЛК — больше работы | |

**User's choice:** «сделай так же как сделано в FBG» → localStorage + Authorization (Option 1).
**Notes:** FBG-эталон подтверждён чтением `FBG/src/contexts/AuthContext.tsx`: ключ `arm_token`,
`getMe` на маунте, гард FBG-50 (только 401/403 роняет сессию). ACTR мигрирует `sf_token`→`arm_token`.

---

## Связь гость-чекаут ↔ аккаунт

| Option | Description | Selected |
|--------|-------------|----------|
| Префилл + привязка по токену | Логиненный: префилл + сохр. адреса, createOrder с Authorization; ЛК = authenticated-заказы | ✓ |
| + привязка гостевых по email | Плюс показ гостевых заказов по email-матчу | |
| Полностью раздельно | Без префилла/привязки | |

**User's choice:** «Сделай так же как сделано в FBG» → префилл + привязка по токену (Option 1).
**Notes:** Подтверждено `FBG/src/pages/CheckoutPage.tsx` (префилл из customer + getMyAddresses) и
`authHeaders()` в `FBG/src/lib/api.ts` (Bearer на createOrder). ЛК тянет `/me/orders`. Email-матч гостевых — нет.

---

## Согласия при регистрации (AUTH-01)

| Option | Description | Selected |
|--------|-------------|----------|
| Минимальный terms-чекбокс | Один обязательный чекбокс, terms_accepted+terms_version; KVKK/KDV → Phase 5 | ✓ |
| Полные KVKK-согласия сейчас | Разделённые чекбоксы ПДн/маркетинг уже в Phase 3 | |

**User's choice:** Минимальный terms-чекбокс (Option 1).
**Notes:** Совпадает с FBG-97 (`AuthPage.tsx`): `terms_accepted` + `TERMS_VERSION`. Граница с Phase 5 чистая.

---

## Claude's Discretion

- **GDPR/KVKK экспорт+удаление (AUTH-07):** не выносилось на обсуждение → дефолт по FBG: export =
  JSON-download (`/me/export`), delete = анонимизация с подтверждением паролем (`/me/delete-account`).
  researcher должен сверить эндпоинты против ARM openapi + живого demo-BFF.
- Точные пути/формы запросов — из ARM openapi, верифицировать против `http://localhost:4000`.
- Сброс пароля — механическая перепроводка существующих страниц на ARM-пути.

## Deferred Ideas

- OAuth Google/Apple (AUTH-08) → v2.
- UI лояльности (LOYL-01) → v2.
- httpOnly-cookie/SSR-сессия → security-hardening после MVP.
- Полный KVKK/mesafeli/KDV юр-UI → Phase 5.
