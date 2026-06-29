/**
 * Storefront Sentry `beforeSend` hook — извлечён из `sentry.client.config.ts` в
 * тестируемую фабрику (FBG-138).
 *
 * Логика (порядок и побочки) идентична инлайновой версии из FBG-126/FBG-127:
 *   1. транзиентный `ChunkLoadError` до перезагрузки → drop + breadcrumb;
 *      персистентный (после перезагрузки) → tag `chunk_load_failure=persistent`, пропускаем;
 *   2. восстановимая ошибка гидратации React (#418/#419/#422/#423/#425) → drop + breadcrumb;
 *   3. ошибка инъецированного нативного моста (`window.webkit.messageHandlers`, FBG-175) → drop + breadcrumb;
 *   4. всё остальное → событие как есть.
 *
 * `addBreadcrumb` инжектится параметром (а не берётся из `Sentry`-синглтона), чтобы wiring
 * хука — порядок проверок, возврат `null`/event, вызовы breadcrumb — покрывался юнит-тестом
 * без инициализации Sentry. См. `sentryBeforeSend.test.ts`.
 */
import type { Breadcrumb, ErrorEvent, EventHint } from '@sentry/nextjs';
import { classifyChunkEvent } from './chunkReload';
import { isRecoverableHydrationEvent } from './hydrationNoise';
import { isNativeBridgeNoiseEvent } from './nativeBridgeNoise';

type AddBreadcrumb = (breadcrumb: Breadcrumb) => void;

export function makeStorefrontBeforeSend(addBreadcrumb: AddBreadcrumb) {
  return (event: ErrorEvent, hint: EventHint): ErrorEvent | null => {
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
