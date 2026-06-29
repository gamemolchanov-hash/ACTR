/**
 * Глушение ошибок ИНЪЕЦИРОВАННОГО нативного моста (WebKit `messageHandlers`) в
 * Sentry/GlitchTip (FBG-175).
 *
 * Продовая ошибка GlitchTip #100 (project ac-vitrina):
 *   TypeError: undefined is not an object (evaluating 'window.webkit.messageHandlers')
 *     app:///:1 in ?
 *     app:///:1 in sendPageShowMessage
 *     app:///:1 in sendDataToNative
 *   1 событие; стек целиком из `app:///:1` (инлайновый скрипт, не наши `_next/static/chunks`).
 *
 * `window.webkit.messageHandlers` — это WebKit JS-bridge API, по которому страница внутри
 * нативного WKWebView шлёт сообщения в обёртку iOS-приложения. Скрипт-мост (`sendDataToNative`/
 * `sendPageShowMessage`) ИНЪЕЦИРУЕТСЯ снаружи: in-app браузеры (внутри клиентов соцсетей/мессенджеров,
 * банков и т.п.), нативные обёртки, расширения. Когда такой скрипт исполняется НЕ в WKWebView
 * (обычный Chrome/Android, где `window.webkit` отсутствует), обращение к `.messageHandlers`
 * валится с `TypeError`. В нашем коде этих символов нет (grep по витрине — ноль вхождений),
 * `sendDataToNative`/`sendPageShowMessage` мы не определяем и `window.webkit` не трогаем — это
 * сбой ЧУЖОГО кода в окружении пользователя, а не баг репозитория.
 *
 * Поэтому в Sentry `beforeSend` такие события глушим как шум (оставляя breadcrumb — если следом
 * прилетит ДРУГАЯ, настоящая ошибка, в ней будет видна предшествующая попытка нативного моста).
 *
 * ⚠️ Компромисс (как и в [[hydrationNoise]] / [[chunkReload]]): фильтр узкий по построению —
 * матчит исключительно WebKit-bridge сигнатуры (`messageHandlers` / `window.webkit` в сообщении
 * либо `sendDataToNative`/`sendPageShowMessage` среди фреймов стека), которых в коде витрины нет.
 * Настоящие ошибки приложения этих токенов не содержат и сквозь фильтр проходят.
 */

/**
 * Сообщение обращения к WebKit-мосту. Safari/iOS-движок: `undefined is not an object
 * (evaluating 'window.webkit.messageHandlers')`; Chromium-движок: `Cannot read properties of
 * undefined (reading 'messageHandlers')`. Ключевой токен — `messageHandlers` (только WebKit
 * JS-bridge); `window.webkit` ловит и другие обращения того же инъецированного моста.
 */
const NATIVE_BRIDGE_MESSAGE_RE = /window\.webkit\b|webkit\.messageHandlers\b|\bmessageHandlers\b/i;

/**
 * Имена функций инъецированного нативного моста из стека — характерная подпись обёрток
 * in-app WebView (видны в `error.stack` и в сериализованных `stacktrace.frames[].function`).
 */
const NATIVE_BRIDGE_FUNCTION_RE = /\b(?:sendDataToNative|sendPageShowMessage)\b/;

/** Текст (сообщение или стек) несёт сигнатуру инъецированного WebKit-моста. */
function matchesNativeBridge(text: string): boolean {
  return NATIVE_BRIDGE_MESSAGE_RE.test(text) || NATIVE_BRIDGE_FUNCTION_RE.test(text);
}

/**
 * Ошибка инъецированного нативного моста: распознаём по `message` И по `stack` (там лежат
 * имена функций `sendDataToNative`/`sendPageShowMessage`). Имя/тип не используем — в проде это
 * просто `TypeError`.
 */
export function isNativeBridgeError(error: unknown): boolean {
  if (error == null || typeof error !== 'object') return false;
  const { message, stack } = error as { message?: unknown; stack?: unknown };
  const parts = [message, stack].filter((s): s is string => typeof s === 'string');
  return parts.some(matchesNativeBridge);
}

/**
 * Распознаёт ошибку инъецированного нативного моста для Sentry `beforeSend`: и по «живому»
 * исключению (`hint.originalException` — есть `message`/`stack`), и по уже сериализованным
 * `event.exception.values` (сообщение в `value`, имена функций — в `stacktrace.frames[].function`).
 */
export function isNativeBridgeNoiseEvent(
  originalException: unknown,
  exceptionValues?: ReadonlyArray<{
    type?: string;
    value?: string;
    stacktrace?: { frames?: ReadonlyArray<{ function?: string }> };
  }>,
): boolean {
  if (isNativeBridgeError(originalException)) return true;
  return Boolean(
    exceptionValues?.some((v) => {
      if (typeof v.value === 'string' && matchesNativeBridge(v.value)) return true;
      return Boolean(
        v.stacktrace?.frames?.some(
          (f) => typeof f.function === 'string' && NATIVE_BRIDGE_FUNCTION_RE.test(f.function),
        ),
      );
    }),
  );
}
