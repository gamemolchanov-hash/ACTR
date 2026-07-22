# ACTR — American Creator TR storefront

Витрина для турецкого рынка (TR · TRY · EN+TR) с дизайном **american-creator.ru**,
работающая по **ARM Portal API** (как forza-brava.com).

## Pipeline

Задачи витрины ведутся в Multica (проект ACTR) и выполняются автономным
конвейером на SRV199: скаут → dev → гейты (tsc/vitest/build + gitleaks/semgrep)
→ кросс-вендорное ревью → QA → деплой на SRVACTR01. Оркестровка событийная:
этап задачи хранится меткой в Multica (toSCOUT → … → toDEPLOY), состояние
между тиками — в `state/<ident>.json` (FBG-432).

## Что это

- **База:** копия фронта `services/storefront` из autoCRM (Next.js 14 App Router + MUI).
  Дизайн сохраняется 1:1.
- **Бэкенд:** ARM storefront API `/public/arm/storefront/*` (см. `https://forza-brava.com/api/docs`).
  Слой данных переключается с OMS API на ARM API (отдельными коммитами после baseline).
- **Изоляция:** отдельный репозиторий, рядом с FBG. OMS / american-creator.ru / autoCRM-монорепо
  **не затрагиваются**.

## Локальная разработка

ARM-бэкенд поднимается из autoCRM-монорепо:

```bash
cd ~/work/autoCRM && make up        # ARM BFF на http://localhost:4000, tenant demo-tenant
cd ~/work/puz/ACTR && npm install && npm run dev   # витрина на :3003
```

`cp .env.example .env.local` и заполнить (см. комментарии в `.env.example`).

## Запуск standalone-сборки локально (SENTRY_DISABLED=1)

Собранный прод-артефакт (`npm run build` → `.next/standalone/server.js`) содержит
забейканный GlitchTip DSN и включает Sentry по `NODE_ENV === 'production'`. Поэтому
**любой ручной прогон артефакта вне прод-докера** (отладка в песочнице конвейера на SRV199)
без гейта шлёт события в прод-проект GlitchTip `ACTR` с `environment=production` — заводятся
ложные urgent-задачи (инцидент FBG-403/FBG-404). Запускай артефакт **только** с рантайм-гейтом
(FBG-406):

```bash
SENTRY_DISABLED=1 PORT=3103 node .next/standalone/server.js
```

`SENTRY_DISABLED` / `SENTRY_ENVIRONMENT` — **не** `NEXT_PUBLIC_*`: server/edge конфиги
грузятся в рантайме через `src/instrumentation.ts`, поэтому гейт снимается без пересборки.
Для осознанной отладки **с** телеметрией задай `SENTRY_ENVIRONMENT=sandbox` — так события
отделимы от прод-трафика.

## Документация

`docs/` — симлинк в Obsidian vault (`W/AutoCRM/ACTR`), в git не входит:
[docs/TZ.md](docs/TZ.md) (полное ТЗ), [docs/open-questions.md](docs/open-questions.md),
[docs/roadmap.md](docs/roadmap.md), [docs/GlitchTip.md](docs/GlitchTip.md).
