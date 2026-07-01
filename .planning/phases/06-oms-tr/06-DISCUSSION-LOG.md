# Phase 6: Чистка OMS-специфики + бренд TR - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-01
**Phase:** 6-oms-tr
**Areas discussed:** RU-бизнес-страницы, Бренд-контакты TR, Платёжные иконки, Legacy Bitrix-редиректы

---

## RU-бизнес-страницы

| Option | Description | Selected |
|--------|-------------|----------|
| Снести partners+studios, /delivery под TR | Удалить RU-рекрутинг (/partners/*, /studios) + ссылки; /delivery переписать под TR-доставку (убрать CDEK) | ✓ |
| Снести всё (partners+studios+delivery) | Минимальный TR-магазин: убрать и инфо-страницу доставки; тарифы только в чекауте | |
| Оставить всё как есть | Не трогать эти страницы в Phase 6, отложить | |

**User's choice:** Снести partners+studios, /delivery под TR (Recommended)
**Notes:** /delivery остаётся как инфо-страница, но переписывается под TR (без CDEK). Реальный перевозчик — деплой-трек.

---

## Бренд-контакты TR

| Option | Description | Selected |
|--------|-------------|----------|
| TR-плейсхолдеры | Убрать VK/WB, оставить Instagram/WhatsApp как TR-заготовки; телефон — TR-плейсхолдер | ✓ |
| Дам реальные значения | Ввести реальные TR-телефон и хендлы соцсетей | |
| Скрыть контакт-блок | Убрать телефон и соцсети из футера до появления данных | |

**User's choice:** TR-плейсхолдеры (Recommended)
**Notes:** Деплой отложён — реальные контакты вписываются перед go-live.

---

## Платёжные иконки

| Option | Description | Selected |
|--------|-------------|----------|
| Visa/Mastercard/Troy | Глобальные + TR-национальная Troy; убрать yandex/webmoney/qiwi; заменить payment-systems.png | ✓ |
| Только Visa/Mastercard | Ровно то, что реально проходит через Stripe test mode | |
| Скрыть иконки оплаты | Убрать блок иконок до финализации эквайера | |

**User's choice:** Visa/Mastercard/Troy (Recommended)
**Notes:** Troy требует нового ассета/подхода к рендеру (текущий — спрайт с bgPos).

---

## Legacy Bitrix-редиректы

| Option | Description | Selected |
|--------|-------------|----------|
| Снести RU-специфичные, оставить гигиену | Убрать .php/RU-slug/personal/auth/ankety/category-map; оставить trailing-slash нормализацию | ✓ |
| Снести весь блок redirects() | Полностью убрать redirects() — чистый next.config без legacy | |
| Оставить как есть | Не трогать редиректы в Phase 6 | |

**User's choice:** Снести RU-специфичные, оставить гигиену (Recommended)
**Notes:** После правки — проверить, что оставшиеся редиректы указывают на существующие TR-роуты.

---

## Claude's Discretion

- Способ рендера Troy-иконки (отдельные img vs новый спрайт vs inline SVG).
- Формат TR-плейсхолдер-телефона и точный набор оставляемых соцсетей (Instagram обязателен; WhatsApp опционально).
- Нейтрализация /delivery TR-контента без конкретного перевозчика.
- Порядок атомарных коммитов чистки.
- BOGO (D-08) — удаление без обсуждения (мёртвый OMS-промо).
- Отзывы (D-09) — дефолт «удалить»; research подтверждает контракт ARM.

## Deferred Ideas

- Реальные TR-контакты (телефон/хендлы/адрес) — перед go-live.
- Реальный TR-перевозчик и тарифы для /delivery — деплой-трек.
- Каталог показывает ₽ вместо ₺ — отдельный баг (не Phase 6).
- Локализация basket/checkout (EN на /tr) — хвост Phase 4.
