/**
 * Глушение `ChunkLoadError` от ПОИСКОВЫХ БОТОВ в Sentry/GlitchTip (FBG-609).
 *
 * Продовая ошибка GlitchTip #201: 13 событий `ChunkLoadError: Loading chunk …
 * failed` с 13.07, UA — `Googlebot/2.1`. Механика та же stale-chunk-after-deploy, что и у людей
 * (см. [[chunkReload]]), но бот держит старый HTML сколь угодно долго и НЕ перезагружает страницу
 * по нашему recovery, так что `classifyChunkEvent` (drop только «до перезагрузки») его не глушит:
 * при выставленной отметке перезагрузки бот получал бы тег `persistent` и уходил в GlitchTip.
 *
 * Для краулера это не инцидент: он просто перезапросит страницу в следующий обход и получит
 * свежий HTML со свежими чанками. Живой пользователь ничего не теряет, реагировать не на что —
 * значит, событие чистый шум.
 *
 * ⚠️ Фильтр узкий: срабатывает ТОЛЬКО на chunk-load ошибку И ТОЛЬКО при бот-UA.
 * Персистентный `ChunkLoadError` реального пользователя (битый деплой) по-прежнему
 * доезжает в GlitchTip с тегом `persistent`.
 */
import { isChunkLoadEvent } from './chunkReload';

/**
 * Краулеры, которые исполняют JS и потому вообще способны прислать `ChunkLoadError`
 * (Googlebot/Applebot/bingbot рендерят страницу; SEO-сканеры — по настройке).
 */
const BOT_UA_RE =
  /Googlebot|bingbot|YandexBot|DuckDuckBot|Baiduspider|AhrefsBot|SemrushBot|facebookexternalhit|Applebot/i;

/** UA принадлежит известному краулеру. */
function isBotUserAgent(userAgent: unknown): boolean {
  return typeof userAgent === 'string' && BOT_UA_RE.test(userAgent);
}

/**
 * UA события: заголовок из `event.request.headers` (его кладёт HttpContext-интеграция SDK;
 * регистр заголовка не гарантирован), иначе — `navigator.userAgent` браузера.
 */
function eventUserAgent(headers?: Record<string, string>): string | undefined {
  const fromHeaders = headers?.['User-Agent'] ?? headers?.['user-agent'];
  if (typeof fromHeaders === 'string') return fromHeaders;
  return typeof navigator !== 'undefined' ? navigator.userAgent : undefined;
}

/**
 * Распознаёт chunk-load ошибку краулера для Sentry `beforeSend`. Проверять ДО
 * `classifyChunkEvent`, иначе бот успеет получить тег `persistent` (FBG-609).
 */
export function isBotChunkLoadEvent(
  originalException: unknown,
  exceptionValues?: ReadonlyArray<{ type?: string; value?: string }>,
  headers?: Record<string, string>,
): boolean {
  if (!isChunkLoadEvent(originalException, exceptionValues)) return false;
  return isBotUserAgent(eventUserAgent(headers));
}
