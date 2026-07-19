<!-- GSD:project-start source:PROJECT.md -->

## Project

**ACTR — American Creator TR storefront**

Витрина интернет-магазина для **турецкого рынка** с дизайном и кодом фронта как у
**american-creator.ru** (`services/storefront`, Next.js 14 + MUI), но работающая по **ARM Portal
API** (`/public/arm/storefront/*`, как forza-brava.com). Отдельный standalone-репозиторий
`~/work/puz/ACTR`. Рынок — Турция, валюта — TRY, языки — EN + TR.

**Core Value:** Покупатель в Турции проходит весь путь покупки (каталог → корзина → checkout → оплата → личный
кабинет) на привычном дизайне american-creator.ru, работающем на ARM-инфраструктуре.

### Constraints

- **Tech stack**: Next.js 14 + MUI (наследуется как есть) — дизайн сохраняется 1:1.
- **API contract**: ARM `/public/arm/storefront/*` — заголовки `X-Tenant-ID`, `X-Storefront-Key`
  (server-side), `X-Currency`.

- **Isolation**: OMS/autoCRM не трогать; общий BFF-код — только обратносовместимо.
- **Security**: `X-Storefront-Key` держать server-side (Next route-handler), не в клиентском бандле.
- **Market/compliance**: TR — KDV, KVKK, mesafeli satış.

<!-- GSD:project-end -->

<!-- GSD:stack-start source:STACK.md -->

## Technology Stack

Technology stack not yet documented. Will populate after codebase mapping or first phase.
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->

## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->

## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->

## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:

- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->

## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->

## Documentation

> `docs/` — симлинк в Obsidian vault (`W/AutoCRM/ACTR`), в git НЕ входит. Если диск W: не смонтирован — docs/ нечитаем.

- [docs/TZ.md](docs/TZ.md) — полное ТЗ (включая §6 «Бэкенд-предпосылки»: рецепт заведения TRY-дистрибьютора/витрины в ARM)
- [docs/open-questions.md](docs/open-questions.md) — деплой-трек открытых вопросов (Stripe в TR, перевозчик, e-fatura)
- [docs/roadmap.md](docs/roadmap.md) — roadmap
- [docs/GlitchTip.md](docs/GlitchTip.md) — error tracking

Серверная сторона ARM (API, shipping, translations, multi-currency) — в autoCRM: `~/work/autoCRM/docs/modules/arm/`.
