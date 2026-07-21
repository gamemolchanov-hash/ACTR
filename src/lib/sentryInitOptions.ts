/**
 * FBG-406 — фабрика env-зависимых опций `Sentry.init()` (`dsn` / `enabled` / `environment`),
 * вынесенная из sentry.{server,client,edge}.config.ts в тестируемую чистую функцию (по
 * образцу `makeStorefrontBeforeSend`, FBG-138).
 *
 * Зачем гейт `SENTRY_DISABLED`: `NEXT_PUBLIC_STOREFRONT_SENTRY_DSN` и `NODE_ENV` бейкаются
 * в артефакт при сборке, поэтому ЛЮБОЙ запуск собранного прод-артефакта вне прод-докера
 * (ручной `node .next/standalone/server.js` в песочнице конвейера на SRV199) слал события в
 * прод-проект GlitchTip `ACTR` с `environment=production` — из-за чего заводились ложные
 * urgent-задачи (инцидент FBG-403/FBG-404: `Cannot find module './chunks/*.js'`,
 * `server_name=srv199`). Рантайм-гейт `SENTRY_DISABLED=1` глушит телеметрию для такого
 * отладочного прогона.
 *
 * Почему `SENTRY_DISABLED` / `SENTRY_ENVIRONMENT` — НЕ `NEXT_PUBLIC_*` (намеренно):
 *   - server/edge конфиги грузятся в рантайме через `src/instrumentation.ts#register()`
 *     (по `NEXT_RUNTIME`), поэтому `process.env.SENTRY_DISABLED` там читается реально в
 *     рантайме Node/edge — гейт переключается БЕЗ пересборки (ровно то, что нужно). Если бы
 *     переменную назвали `NEXT_PUBLIC_*`, Next забейкал бы её в артефакт при сборке и гейт
 *     стал бы неснимаемым — то есть тот же баг, что чиним.
 *   - client конфиг, наоборот, инлайнится Sentry-build-плагином при сборке, а в браузере
 *     не-`NEXT_PUBLIC_*` переменные недоступны и приходят как `undefined`. Значит клиентский
 *     гейт в рантайме снять нельзя — это известное ограничение Next, и фикс шума нацелен на
 *     server/edge (именно оттуда прилетал инцидент). См. docs/deployment.md / PR.
 *
 * `env` передаётся параметром (а не читается из `process.env` внутри), чтобы вся логика
 * гейта покрывалась юнит-тестом без запуска Next. Вызывающие конфиги обращаются к
 * `process.env.X` прямыми member-выражениями — так Next статически инлайнит `NODE_ENV`/DSN в
 * клиентский бандл ровно как раньше (регресс сборки не допускаем).
 */

export interface SentryEnv {
  NODE_ENV?: string;
  NEXT_PUBLIC_STOREFRONT_SENTRY_DSN?: string;
  SENTRY_DISABLED?: string;
  SENTRY_ENVIRONMENT?: string;
}

export interface SentryInitOptions {
  dsn: string | undefined;
  enabled: boolean;
  environment: string;
}

export function makeSentryInitOptions(env: SentryEnv): SentryInitOptions {
  const dsn = env.NEXT_PUBLIC_STOREFRONT_SENTRY_DSN;
  return {
    dsn,
    // Включаем Sentry только в проде, с валидным DSN и при снятом гейте SENTRY_DISABLED.
    enabled: env.NODE_ENV === 'production' && !!dsn && env.SENTRY_DISABLED !== '1',
    // Отделяет осознанную отладку с телеметрией от прод-трафика. Default сохраняет
    // прежнее поведение (события без явного environment трактовались как production).
    environment: env.SENTRY_ENVIRONMENT || 'production',
  };
}
