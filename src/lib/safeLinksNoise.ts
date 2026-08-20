/**
 * Глушение шума сломанного postMessage-моста Outlook SafeLinks / расширений браузера
 * в Sentry/GlitchTip (FBG-609).
 *
 * Продовая ошибка GlitchTip #367:
 *   UnhandledRejection: Non-Error promise rejection captured with value:
 *     Object Not Found Matching Id:1, MethodName:update, ParamCount:4
 *
 * Сигнатура `Object Not Found Matching Id:<N>, MethodName:<X>, ParamCount:<N>` — известная
 * подпись RPC-моста Microsoft Outlook SafeLinks (и родственных расширений Edge/Office): страницу
 * открывают через обёртку SafeLinks, её скрипт шлёт в исчезнувший фрейм `postMessage` и получает
 * отказ, который всплывает как `unhandledrejection` с НЕ-Error значением. Ни этих строк, ни
 * такого моста в коде витрины нет — это сбой ЧУЖОГО кода в окружении пользователя.
 *
 * Поэтому в Sentry `beforeSend` такие события глушим как шум (оставляя breadcrumb — если следом
 * прилетит ДРУГАЯ, настоящая ошибка, в ней будет видна предшествующая попытка моста).
 *
 * ⚠️ Компромисс (как и в [[hydrationNoise]] / [[nativeBridgeNoise]]): фильтр узкий по построению —
 * матчит ровно эту трёхчастную сигнатуру целиком; ошибки приложения её не содержат.
 */

/** Полная сигнатура моста; частичных совпадений («Object Not Found») недостаточно. */
const SAFE_LINKS_RE = /Object Not Found Matching Id:\d+, MethodName:\w+, ParamCount:\d+/;

/**
 * Ошибка моста SafeLinks. Значение rejection здесь НЕ-Error: `hint.originalException` приходит
 * сырой строкой, поэтому строку разбираем наравне с объектом-ошибкой (`message`).
 */
function isSafeLinksBridgeError(error: unknown): boolean {
  if (typeof error === 'string') return SAFE_LINKS_RE.test(error);
  if (error == null || typeof error !== 'object') return false;
  const { message } = error as { message?: unknown };
  return typeof message === 'string' && SAFE_LINKS_RE.test(message);
}

/**
 * Распознаёт шум моста SafeLinks для Sentry `beforeSend`: и по «живому» значению
 * (`hint.originalException`), и по уже сериализованным `event.exception.values` (там значение
 * лежит в `value`, обёрнутое в `Non-Error promise rejection captured with value: …`).
 */
export function isSafeLinksBridgeNoiseEvent(
  originalException: unknown,
  exceptionValues?: ReadonlyArray<{ type?: string; value?: string }>,
): boolean {
  if (isSafeLinksBridgeError(originalException)) return true;
  return Boolean(exceptionValues?.some((v) => isSafeLinksBridgeError(v.value)));
}
