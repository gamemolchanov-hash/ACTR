/**
 * FBG-138 — wiring хука storefront Sentry `beforeSend`.
 *
 * Продовая ошибка GlitchTip #25 (project ac-vitrina) = повтор #423 (восстановимая гидратация).
 * Рантайм-фильтр добавлен в FBG-126, но раньше тестами были покрыты только ХЕЛПЕРЫ
 * (`hydrationNoise` / `chunkReload`), а сам хук — порядок проверок, возврат `null`/event,
 * вызовы breadcrumb — нет. Этот тест прогоняет точный payload issue #25 через настоящий хук.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ErrorEvent, EventHint } from '@sentry/nextjs';
import { makeStorefrontBeforeSend } from './sentryBeforeSend';

/** Точный payload прод-события GlitchTip issue #25 (минифицированный React #423). */
const HYDRATION_423 =
  'Minified React error #423; visit https://react.dev/errors/423 for the full message or use the non-minified dev environment for full errors and additional helpful warnings.';

function eventWith(values?: Array<{ type?: string; value?: string }>): ErrorEvent {
  return (values ? { exception: { values } } : {}) as unknown as ErrorEvent;
}

describe('makeStorefrontBeforeSend', () => {
  beforeEach(() => window.sessionStorage.clear());

  it('глушит точный #423 (issue #25) по hint.originalException + hydration-breadcrumb', () => {
    const addBreadcrumb = vi.fn();
    const beforeSend = makeStorefrontBeforeSend(addBreadcrumb);

    const result = beforeSend(eventWith(), {
      originalException: { name: 'Error', message: HYDRATION_423 },
    } as EventHint);

    expect(result).toBeNull();
    expect(addBreadcrumb).toHaveBeenCalledWith(expect.objectContaining({ category: 'hydration' }));
  });

  it('глушит #423 по одним сериализованным exception.values (без originalException)', () => {
    const addBreadcrumb = vi.fn();
    const beforeSend = makeStorefrontBeforeSend(addBreadcrumb);

    const result = beforeSend(
      eventWith([{ type: 'Error', value: HYDRATION_423 }]),
      {} as EventHint,
    );

    expect(result).toBeNull();
    expect(addBreadcrumb).toHaveBeenCalledWith(expect.objectContaining({ category: 'hydration' }));
  });

  it('настоящую ошибку пропускает как есть, без breadcrumb', () => {
    const addBreadcrumb = vi.fn();
    const beforeSend = makeStorefrontBeforeSend(addBreadcrumb);

    const event = eventWith([{ type: 'TypeError', value: "Cannot read 'id' of undefined" }]);
    const result = beforeSend(event, { originalException: new TypeError('boom') } as EventHint);

    expect(result).toBe(event);
    expect(addBreadcrumb).not.toHaveBeenCalled();
  });

  it('транзиентный ChunkLoadError (до перезагрузки) → null + chunk-load breadcrumb', () => {
    const addBreadcrumb = vi.fn();
    const beforeSend = makeStorefrontBeforeSend(addBreadcrumb);

    const result = beforeSend(
      eventWith([{ type: 'ChunkLoadError', value: 'Loading chunk 3081 failed.' }]),
      {} as EventHint,
    );

    expect(result).toBeNull();
    expect(addBreadcrumb).toHaveBeenCalledWith(expect.objectContaining({ category: 'chunk-load' }));
  });
});
