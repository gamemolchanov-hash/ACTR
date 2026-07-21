/**
 * FBG-406 — гейт SENTRY_DISABLED в фабрике опций `Sentry.init()`.
 *
 * Регрессия: собранный прод-артефакт, запущенный вне прод-докера (ручной
 * `node .next/standalone/server.js` в песочнице), слал события в прод-проект GlitchTip ACTR
 * и заводил ложные urgent-задачи (FBG-403/FBG-404). Рантайм-гейт `SENTRY_DISABLED=1` должен
 * выключать телеметрию для такого прогона, НЕ трогая обычный прод (регресс-guard ниже).
 */
import { describe, it, expect } from 'vitest';
import { makeSentryInitOptions, type SentryEnv } from './sentryInitOptions';

const DSN = 'https://key@glitchtip.example/11';

/** Прод-базлайн: NODE_ENV=production + валидный DSN, гейт снят. */
const prod: SentryEnv = { NODE_ENV: 'production', NEXT_PUBLIC_STOREFRONT_SENTRY_DSN: DSN };

describe('makeSentryInitOptions', () => {
  it('SENTRY_DISABLED=1 (прод + DSN) → enabled=false (гейт песочницы)', () => {
    expect(makeSentryInitOptions({ ...prod, SENTRY_DISABLED: '1' }).enabled).toBe(false);
  });

  it('без SENTRY_DISABLED (прод + DSN) → enabled=true (регресс-guard прод-телеметрии)', () => {
    expect(makeSentryInitOptions(prod).enabled).toBe(true);
  });

  it('SENTRY_DISABLED !== "1" (например "0"/"true") гейт не снимает → enabled=true', () => {
    expect(makeSentryInitOptions({ ...prod, SENTRY_DISABLED: '0' }).enabled).toBe(true);
    expect(makeSentryInitOptions({ ...prod, SENTRY_DISABLED: 'true' }).enabled).toBe(true);
  });

  it('NODE_ENV !== production → enabled=false даже с DSN', () => {
    expect(
      makeSentryInitOptions({ NODE_ENV: 'development', NEXT_PUBLIC_STOREFRONT_SENTRY_DSN: DSN })
        .enabled,
    ).toBe(false);
  });

  it('пустой/отсутствующий DSN → enabled=false даже в проде', () => {
    expect(makeSentryInitOptions({ NODE_ENV: 'production' }).enabled).toBe(false);
    expect(
      makeSentryInitOptions({ NODE_ENV: 'production', NEXT_PUBLIC_STOREFRONT_SENTRY_DSN: '' })
        .enabled,
    ).toBe(false);
  });

  it('dsn пробрасывается как есть в опции', () => {
    expect(makeSentryInitOptions(prod).dsn).toBe(DSN);
    expect(makeSentryInitOptions({ NODE_ENV: 'production' }).dsn).toBeUndefined();
  });

  it('environment: default "production", если SENTRY_ENVIRONMENT не задан', () => {
    expect(makeSentryInitOptions(prod).environment).toBe('production');
  });

  it('environment: берётся из SENTRY_ENVIRONMENT, если задан (отделяет отладку от прода)', () => {
    expect(makeSentryInitOptions({ ...prod, SENTRY_ENVIRONMENT: 'sandbox' }).environment).toBe(
      'sandbox',
    );
  });
});
