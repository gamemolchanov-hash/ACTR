# Phase 4: i18n EN/TR - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-30
**Phase:** 4-i18n EN/TR
**Areas discussed:** Подход + маршрутизация, Язык по умолчанию + детект, Tolgee-интеграция, Контент через ARM ?lang

---

## Подход и маршрутизация

| Option | Description | Selected |
|--------|-------------|----------|
| next-intl + [lang] | Пути /en, /tr через [lang]-сегмент + middleware; SSR, hreflang, sitemap — закрывает I18N-04 | ✓ |
| Порт FBG client-Context | React Context + JSON + cookie, URL не меняется; проще, но SEO слабее | |

**User's choice:** next-intl + [lang] (Recommended)
**Notes:** SEO-требование I18N-04 (sitemap/hreflang на оба языка) делает path-based роутинг правильным; FBG (Vite SPA) — референс концепций, не 1:1 порт.

---

## Язык по умолчанию и автоопределение

| Option | Description | Selected |
|--------|-------------|----------|
| Гео: TR→TR, иначе EN | Гео-детект (BFF geo_country), выбор в cookie, фолбэк Accept-Language | ✓ |
| EN всегда | EN по умолчанию, переключатель на TR | |
| TR всегда | TR по умолчанию, переключатель на EN | |

**User's choice:** Гео: TR→TR, иначе EN (Recommended)

---

## Tolgee-интеграция (потребление переводов)

| Option | Description | Selected |
|--------|-------------|----------|
| Экспорт в JSON на билде | Tolgee = источник правды; экспорт ключей в статический JSON, next-intl читает статику; нет runtime-зависимости | ✓ |
| Tolgee runtime SDK | @tolgee/react + in-context редактирование; runtime-зависимость, сложнее с SSR | |
| Ручной JSON, Tolgee позже | Сначала ручные словари; дубль работы | |

**User's choice:** Экспорт в JSON на билде (Recommended)
**Notes:** Пользователь указал инфраструктуру — Tolgee self-hosted на loco.devloc.su, проект 34 для ACTR; doc `autoCRM/docs/Localize.md`; MCP подключён.

---

## Локализация контента ARM ?lang

| Option | Description | Selected |
|--------|-------------|----------|
| EN→en, TR→tr; фолбэк на default | Короткие коды; нет перевода у ARM → язык по умолчанию (не пусто) | ✓ |
| Полные BCP47 (en-US, tr-TR) | Точнее, если ARM различает регионы; иначе избыточно | |
| Сначала уточнить у ARM | Research проверяет по BFF-контракту | |

**User's choice:** EN→en, TR→tr; фолбэк на default (Recommended)

---

## Claude's Discretion

- Раскладка конфигурации next-intl (middleware matcher, структура каталогов, i18n/request.ts).
- Date/number/currency через Intl с активной локалью (TRY для цен).
- Механизм билд-экспорта Tolgee→JSON (CLI vs MCP) — выбрать в research.
- Lazy-load TR-каталога; namespacing ключей при извлечении.

## Deferred Ideas

- Tolgee runtime SDK + in-context live-редактирование — отложено (D-05 = статический экспорт).
- Полные BCP47 (en-US/tr-TR) — только если research подтвердит, что ARM различает регионы.
- Доп. локали сверх EN/TR — будущее.
- WR-04 (auth loading-redirect edge) — не i18n; остаётся Phase-3 follow-up.
