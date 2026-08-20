/**
 * Storefront Sentry `beforeSend` hook — извлечён из `sentry.client.config.ts` в
 * тестируемую фабрику (FBG-138).
 *
 * Порядок проверок и побочки (инлайновая версия FBG-126/FBG-127 + шумовые фильтры FBG-609):
 *   1. шум моста Outlook SafeLinks/расширений (`Object Not Found Matching Id…`,
 *      FBG-609) → drop + breadcrumb;
 *   2. `ChunkLoadError` от краулера (FBG-609) → drop + breadcrumb; проверяется ДО п.3, иначе
 *      бот со старым HTML получил бы тег `persistent` и уехал в GlitchTip;
 *   3. транзиентный `ChunkLoadError` до перезагрузки → drop + breadcrumb;
 *      персистентный (после перезагрузки) → tag `chunk_load_failure=persistent`, пропускаем;
 *   4. восстановимая ошибка гидратации React (#418/#419/#422/#423/#425) → drop + breadcrumb;
 *   5. ошибка инъецированного нативного моста (`window.webkit.messageHandlers`,
 *      FBG-175) → drop + breadcrumb;
 *   6. всё остальное → событие как есть.
 *
 * `addBreadcrumb` инжектится параметром (а не берётся из `Sentry`-синглтона), чтобы wiring
 * хука — порядок проверок, возврат `null`/event, вызовы breadcrumb — покрывался юнит-тестом
 * без инициализации Sentry. См. `sentryBeforeSend.test.ts`.
 */
import type { Breadcrumb, ErrorEvent, EventHint } from '@sentry/nextjs';
import { isBotChunkLoadEvent } from './botChunkNoise';
import { classifyChunkEvent } from './chunkReload';
import { isRecoverableHydrationEvent } from './hydrationNoise';
import { isNativeBridgeNoiseEvent } from './nativeBridgeNoise';
import { isSafeLinksBridgeNoiseEvent } from './safeLinksNoise';

type AddBreadcrumb = (breadcrumb: Breadcrumb) => void;

export function makeStorefrontBeforeSend(addBreadcrumb: AddBreadcrumb) {
  return (event: ErrorEvent, hint: EventHint): ErrorEvent | null => {
    // Сломанный postMessage-мост Outlook SafeLinks / расширения браузера — не-Error rejection
    // с сигнатурой `Object Not Found Matching Id:N, MethodName:X, ParamCount:N`; таких строк в
    // коде витрины нет (см. lib/safeLinksNoise, FBG-609). Глушим как шум, оставляя breadcrumb.
    if (isSafeLinksBridgeNoiseEvent(hint?.originalException, event.exception?.values)) {
      addBreadcrumb({
        category: 'third-party',
        level: 'warning',
        message: 'Outlook SafeLinks / extension RPC bridge noise (dropped)',
      });
      return null;
    }

    // ChunkLoadError краулера: бот держит старый HTML и нашу recovery-перезагрузку не делает,
    // поэтому под classifyChunkEvent он попал бы в `persist` (см. lib/botChunkNoise, FBG-609).
    // Проверяем СТРОГО раньше — так бот не получает тег `persistent` и не шумит в GlitchTip.
    const headers = event.request?.headers;
    if (isBotChunkLoadEvent(hint?.originalException, event.exception?.values, headers)) {
      addBreadcrumb({
        category: 'bot',
        level: 'warning',
        message: 'ChunkLoadError from a crawler (stale HTML, no reload) — dropped as noise',
      });
      return null;
    }

    // ChunkLoadError после редеплоя — транзиентная гонка stale-chunk (см. lib/chunkReload).
    const decision = classifyChunkEvent(hint?.originalException, event.exception?.values);
    if (decision === 'drop') {
      // Перезагрузки ещё не было → клиент сейчас сам перезагрузится (error.tsx).
      // Не шумим, но оставляем хлебную крошку: если следом прилетит другая ошибка,
      // в ней будет виден предшествующий chunk-load сбой.
      addBreadcrumb({
        category: 'chunk-load',
        level: 'warning',
        message: 'Transient ChunkLoadError — auto-reloading (stale chunk after deploy)',
      });
      return null;
    }
    if (decision === 'persist') {
      // Перезагрузка уже была, а чанк всё равно 404 → это реальный аутаж (битый деплой):
      // НЕ прячем событие, помечаем тегом для триажа.
      event.tags = { ...event.tags, chunk_load_failure: 'persistent' };
    }

    // Восстановимая ошибка гидратации React (#418/#419/#422/#423/#425) — React уже сам
    // перерисовал на клиенте, пользователь не пострадал; на проде это почти всегда
    // расширение/антивирус/бот, а не баг репо (см. lib/hydrationNoise, FBG-126). Глушим
    // как шум, оставляя breadcrumb — если следом прилетит настоящая ошибка, в ней будет
    // виден предшествующий сбой гидратации.
    if (isRecoverableHydrationEvent(hint?.originalException, event.exception?.values)) {
      addBreadcrumb({
        category: 'hydration',
        level: 'warning',
        message:
          'Recoverable React hydration error — root switched to client render (dropped as noise)',
      });
      return null;
    }

    // Ошибка ЧУЖОГО инъецированного нативного моста (`window.webkit.messageHandlers` через
    // `sendDataToNative`/`sendPageShowMessage`) — скрипт in-app WebView/обёртки, исполнившийся
    // вне WKWebView; этих символов в коде витрины нет (см. lib/nativeBridgeNoise, FBG-175).
    // Глушим как шум, оставляя breadcrumb.
    if (isNativeBridgeNoiseEvent(hint?.originalException, event.exception?.values)) {
      addBreadcrumb({
        category: 'native-bridge',
        level: 'warning',
        message:
          'Injected native WebView bridge error (window.webkit.messageHandlers) — dropped as noise',
      });
      return null;
    }

    return event;
  };
}
