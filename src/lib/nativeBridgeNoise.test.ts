/**
 * FBG-175 — глушение ошибок инъецированного нативного моста (`window.webkit.messageHandlers`).
 *
 * Продовая ошибка GlitchTip #100 (project ac-vitrina):
 *   TypeError: undefined is not an object (evaluating 'window.webkit.messageHandlers')
 *     app:///:1 in sendPageShowMessage / sendDataToNative
 *   (стек целиком из `app:///:1` — инлайновый чужой скрипт, ни одного фрейма приложения).
 */
import { describe, it, expect, vi } from 'vitest';
import type { ErrorEvent, EventHint } from '@sentry/nextjs';
import { isNativeBridgeError, isNativeBridgeNoiseEvent } from './nativeBridgeNoise';
import { makeStorefrontBeforeSend } from './sentryBeforeSend';

/** Точное сообщение прод-события GlitchTip #100 (WebKit-движок). */
const PROD_MESSAGE = "undefined is not an object (evaluating 'window.webkit.messageHandlers')";

/** Хвост стека прод-события: имена функций инъецированного моста. */
const PROD_STACK = [
  `TypeError: ${PROD_MESSAGE}`,
  '    at app:///:1',
  '    at sendPageShowMessage (app:///:1)',
  '    at sendDataToNative (app:///:1)',
].join('\n');

describe('isNativeBridgeError', () => {
  it('распознаёт ровно продовую ошибку #100 (по message)', () => {
    expect(isNativeBridgeError({ name: 'TypeError', message: PROD_MESSAGE })).toBe(true);
  });

  it('распознаёт по stack (когда message обрезан/иной, но в стеке есть функции моста)', () => {
    expect(isNativeBridgeError({ name: 'TypeError', message: 'boom', stack: PROD_STACK })).toBe(
      true,
    );
  });

  it('распознаёт Chromium-формулировку того же сбоя (reading messageHandlers)', () => {
    expect(
      isNativeBridgeError({
        name: 'TypeError',
        message: "Cannot read properties of undefined (reading 'messageHandlers')",
      }),
    ).toBe(true);
  });

  it('НЕ глушит настоящие ошибки приложения / мусор (негатив)', () => {
    expect(
      isNativeBridgeError({ name: 'TypeError', message: "Cannot read 'id' of undefined" }),
    ).toBe(false);
    expect(isNativeBridgeError({ message: 'Minified React error #423;' })).toBe(false);
    expect(isNativeBridgeError(null)).toBe(false);
    expect(isNativeBridgeError(undefined)).toBe(false);
    expect(isNativeBridgeError({})).toBe(false);
    expect(isNativeBridgeError(PROD_MESSAGE)).toBe(false); // строка, не объект-ошибка
  });
});

describe('isNativeBridgeNoiseEvent (Sentry beforeSend)', () => {
  it('ловит по originalException', () => {
    expect(isNativeBridgeNoiseEvent({ name: 'TypeError', message: PROD_MESSAGE })).toBe(true);
  });

  it('ловит по сериализованным exception.values (сообщение в value)', () => {
    expect(isNativeBridgeNoiseEvent(undefined, [{ type: 'TypeError', value: PROD_MESSAGE }])).toBe(
      true,
    );
  });

  it('ловит по именам функций в stacktrace.frames (даже если value неинформативно)', () => {
    expect(
      isNativeBridgeNoiseEvent(undefined, [
        {
          type: 'TypeError',
          value: 'undefined is not an object',
          stacktrace: {
            frames: [{ function: 'sendDataToNative' }, { function: 'sendPageShowMessage' }],
          },
        },
      ]),
    ).toBe(true);
  });

  it('обычная ошибка → false (событие не трогаем)', () => {
    expect(
      isNativeBridgeNoiseEvent(new TypeError('boom'), [
        {
          type: 'TypeError',
          value: 'boom',
          stacktrace: { frames: [{ function: 'handleClick' }] },
        },
      ]),
    ).toBe(false);
    expect(isNativeBridgeNoiseEvent(undefined, undefined)).toBe(false);
  });
});

/**
 * End-to-end через НАСТОЯЩИЙ хук (FBG-175, правило проверки результата): точный payload
 * GlitchTip #100 должен быть приглушён (`null`) с native-bridge breadcrumb, а посторонняя
 * ошибка — пройти как есть. Путь native-bridge не трогает `window`, поэтому тест идёт в node-env.
 */
describe('makeStorefrontBeforeSend × native bridge (#100)', () => {
  function eventWith(values?: Array<{ type?: string; value?: string }>): ErrorEvent {
    return (values ? { exception: { values } } : {}) as unknown as ErrorEvent;
  }

  it('глушит #100 по hint.originalException + native-bridge breadcrumb', () => {
    const addBreadcrumb = vi.fn();
    const beforeSend = makeStorefrontBeforeSend(addBreadcrumb);

    const result = beforeSend(eventWith(), {
      originalException: { name: 'TypeError', message: PROD_MESSAGE, stack: PROD_STACK },
    } as EventHint);

    expect(result).toBeNull();
    expect(addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'native-bridge' }),
    );
  });

  it('глушит #100 по одним сериализованным exception.values (без originalException)', () => {
    const addBreadcrumb = vi.fn();
    const beforeSend = makeStorefrontBeforeSend(addBreadcrumb);

    const result = beforeSend(
      eventWith([{ type: 'TypeError', value: PROD_MESSAGE }]),
      {} as EventHint,
    );

    expect(result).toBeNull();
    expect(addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'native-bridge' }),
    );
  });

  it('настоящую ошибку пропускает как есть, без breadcrumb', () => {
    const addBreadcrumb = vi.fn();
    const beforeSend = makeStorefrontBeforeSend(addBreadcrumb);

    const event = eventWith([{ type: 'TypeError', value: "Cannot read 'id' of undefined" }]);
    const result = beforeSend(event, { originalException: new TypeError('boom') } as EventHint);

    expect(result).toBe(event);
    expect(addBreadcrumb).not.toHaveBeenCalled();
  });
});
