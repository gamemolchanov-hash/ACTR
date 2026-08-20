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
import { CHUNK_RELOAD_FLAG } from './chunkReload';

/** Точный payload прод-события GlitchTip issue #25 (минифицированный React #423). */
const HYDRATION_423 =
  'Minified React error #423; visit https://react.dev/errors/423 for the full message or use the non-minified dev environment for full errors and additional helpful warnings.';

function eventWith(values?: Array<{ type?: string; value?: string }>): ErrorEvent {
  return (values ? { exception: { values } } : {}) as unknown as ErrorEvent;
}

/** Событие с UA в `request.headers` — так его кладёт HttpContext-интеграция SDK (FBG-609). */
function eventWithUa(
  values: Array<{ type?: string; value?: string }>,
  userAgent: string,
): ErrorEvent {
  return {
    exception: { values },
    request: { headers: { 'User-Agent': userAgent } },
  } as unknown as ErrorEvent;
}

/** Прод-сигнатура GlitchTip #367: сломанный postMessage-мост Outlook SafeLinks / расширения. */
const SAFE_LINKS_VALUE =
  'Non-Error promise rejection captured with value: Object Not Found Matching Id:1, MethodName:update, ParamCount:4';

const GOOGLEBOT_UA = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';
const CHROME_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';

/** Отметка «recovery-перезагрузка была только что» → classifyChunkEvent даст `persist`. */
function markReloaded(): void {
  window.sessionStorage.setItem(CHUNK_RELOAD_FLAG, String(Date.now()));
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

/**
 * FBG-609 — шумовые фильтры по продовым тикетам GlitchTip #367 (SafeLinks) и #201
 * (ChunkLoadError от Googlebot 2.1: бот держит старый HTML и не перезагружается,
 * поэтому существующий transient-фильтр его не глушит).
 */
describe('makeStorefrontBeforeSend — шум SafeLinks и ботов (FBG-609)', () => {
  beforeEach(() => window.sessionStorage.clear());

  it('глушит сигнатуру SafeLinks (Object Not Found Matching Id…) + third-party breadcrumb', () => {
    const addBreadcrumb = vi.fn();
    const beforeSend = makeStorefrontBeforeSend(addBreadcrumb);

    const result = beforeSend(
      eventWith([{ type: 'UnhandledRejection', value: SAFE_LINKS_VALUE }]),
      {} as EventHint,
    );

    expect(result).toBeNull();
    expect(addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'third-party' }),
    );
  });

  it('глушит ту же сигнатуру, когда originalException — сырое значение rejection (строка)', () => {
    const beforeSend = makeStorefrontBeforeSend(vi.fn());

    const result = beforeSend(eventWith(), {
      originalException: 'Object Not Found Matching Id:4, MethodName:getReadyState, ParamCount:1',
    } as EventHint);

    expect(result).toBeNull();
  });

  it('глушит ChunkLoadError бота (UA из request.headers) БЕЗ тега persistent', () => {
    markReloaded(); // без бот-фильтра classifyChunkEvent пометил бы событие persistent
    const addBreadcrumb = vi.fn();
    const beforeSend = makeStorefrontBeforeSend(addBreadcrumb);

    const event = eventWithUa(
      [{ type: 'ChunkLoadError', value: 'Loading chunk 4521 failed.' }],
      GOOGLEBOT_UA,
    );
    const result = beforeSend(event, {} as EventHint);

    expect(result).toBeNull();
    expect(event.tags?.chunk_load_failure).toBeUndefined();
    expect(addBreadcrumb).toHaveBeenCalledWith(expect.objectContaining({ category: 'bot' }));
  });

  it('глушит ChunkLoadError бота, когда UA доступен только через navigator (клиент)', () => {
    markReloaded();
    Object.defineProperty(window.navigator, 'userAgent', {
      value: GOOGLEBOT_UA,
      configurable: true,
    });
    try {
      const beforeSend = makeStorefrontBeforeSend(vi.fn());
      const result = beforeSend(
        eventWith([{ type: 'ChunkLoadError', value: 'Loading chunk 4521 failed.' }]),
        {} as EventHint,
      );
      expect(result).toBeNull();
    } finally {
      delete (window.navigator as { userAgent?: string }).userAgent;
    }
  });

  it('персистентный ChunkLoadError реального пользователя — как раньше: тег + событие', () => {
    markReloaded();
    const addBreadcrumb = vi.fn();
    const beforeSend = makeStorefrontBeforeSend(addBreadcrumb);

    const event = eventWithUa(
      [{ type: 'ChunkLoadError', value: 'Loading chunk 4521 failed.' }],
      CHROME_UA,
    );
    const result = beforeSend(event, {} as EventHint);

    expect(result).toBe(event);
    expect(event.tags?.chunk_load_failure).toBe('persistent');
    expect(addBreadcrumb).not.toHaveBeenCalled();
  });

  it('ловит бот-UA и когда заголовок пришёл в нижнем регистре', () => {
    const beforeSend = makeStorefrontBeforeSend(vi.fn());

    const event = {
      exception: { values: [{ type: 'ChunkLoadError', value: 'Loading chunk 4521 failed.' }] },
      request: { headers: { 'user-agent': GOOGLEBOT_UA } },
    } as unknown as ErrorEvent;

    expect(beforeSend(event, {} as EventHint)).toBeNull();
  });

  it('не глушит ошибку приложения, похожую на SafeLinks лишь частично (негатив)', () => {
    const beforeSend = makeStorefrontBeforeSend(vi.fn());

    const event = eventWith([{ type: 'Error', value: 'Object Not Found: order 42' }]);

    expect(beforeSend(event, {} as EventHint)).toBe(event);
  });

  it('настоящую ошибку с бот-UA не трогает (фильтр только про ChunkLoadError)', () => {
    const beforeSend = makeStorefrontBeforeSend(vi.fn());

    const event = eventWithUa(
      [{ type: 'TypeError', value: "Cannot read 'id' of undefined" }],
      GOOGLEBOT_UA,
    );

    expect(beforeSend(event, {} as EventHint)).toBe(event);
  });
});
