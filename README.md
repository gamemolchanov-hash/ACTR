# ACTR — American Creator TR storefront

Витрина для турецкого рынка (TR · TRY · EN+TR) с дизайном **american-creator.ru**,
работающая по **ARM Portal API** (как forza-brava.com).

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

## Документация

Полное ТЗ и трекер открытых вопросов — в autoCRM vault:
`docs/modules/arm/ACTR/TZ.md` и `docs/modules/arm/ACTR/open-questions.md`.
