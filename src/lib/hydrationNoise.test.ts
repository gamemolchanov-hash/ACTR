/**
 * FBG-126 — глушение восстановимых ошибок гидратации React в Sentry/GlitchTip.
 *
 * Продовая ошибка GlitchTip #13 (project ac-vitrina, american-creator.ru):
 *   Error: Minified React error #423; visit https://react.dev/errors/423 …
 *   (стек целиком в react-dom hydration + scheduler, ни одного фрейма приложения).
 */
import { describe, it, expect } from 'vitest';
import {
  isRecoverableHydrationError,
  isRecoverableHydrationEvent,
  RECOVERABLE_HYDRATION_CODES,
} from './hydrationNoise';

const PROD_ERROR = {
  name: 'Error',
  message:
    'Minified React error #423; visit https://react.dev/errors/423 for the full message or use the non-minified dev environment for full errors and additional helpful warnings.',
};

describe('isRecoverableHydrationError', () => {
  it('распознаёт ровно продовую ошибку #13 (минифицированный #423)', () => {
    expect(isRecoverableHydrationError(PROD_ERROR)).toBe(true);
  });

  it('распознаёт все восстановимые минифицированные коды', () => {
    for (const code of RECOVERABLE_HYDRATION_CODES) {
      expect(isRecoverableHydrationError({ message: `Minified React error #${code};` })).toBe(true);
    }
  });

  it('распознаёт человекочитаемые (dev) формулировки гидратации', () => {
    expect(
      isRecoverableHydrationError({
        message:
          'Hydration failed because the initial UI does not match what was rendered on the server.',
      }),
    ).toBe(true); // #418
    expect(
      isRecoverableHydrationError({
        message:
          'There was an error while hydrating. Because the error happened outside of a Suspense boundary, the entire root will switch to client rendering.',
      }),
    ).toBe(true); // #423
    expect(
      isRecoverableHydrationError({ message: 'Text content does not match server-rendered HTML.' }),
    ).toBe(true); // #425
    expect(
      isRecoverableHydrationError({
        message:
          'The server could not finish this Suspense boundary, likely due to an error during server rendering.',
      }),
    ).toBe(true); // #419
  });

  it('НЕ глушит НЕвосстановимые / посторонние React-ошибки (негатив)', () => {
    // #310 (Rendered fewer hooks) — настоящий баг кода, НЕ гидратация
    expect(isRecoverableHydrationError({ message: 'Minified React error #310;' })).toBe(false);
    expect(
      isRecoverableHydrationError({ name: 'TypeError', message: "Cannot read 'id' of undefined" }),
    ).toBe(false);
    expect(isRecoverableHydrationError(null)).toBe(false);
    expect(isRecoverableHydrationError(undefined)).toBe(false);
    expect(isRecoverableHydrationError({})).toBe(false);
    expect(isRecoverableHydrationError(PROD_ERROR.message)).toBe(false); // строка, не Error
  });
});

describe('isRecoverableHydrationEvent (Sentry beforeSend)', () => {
  it('ловит по originalException и по сериализованным exception.values', () => {
    expect(isRecoverableHydrationEvent(PROD_ERROR)).toBe(true);
    expect(
      isRecoverableHydrationEvent(undefined, [
        { type: 'Error', value: 'Minified React error #423; visit https://react.dev/errors/423 …' },
      ]),
    ).toBe(true);
  });

  it('обычная ошибка → false (событие не трогаем)', () => {
    expect(
      isRecoverableHydrationEvent(new TypeError('boom'), [{ type: 'TypeError', value: 'boom' }]),
    ).toBe(false);
    expect(isRecoverableHydrationEvent(undefined, undefined)).toBe(false);
  });
});
