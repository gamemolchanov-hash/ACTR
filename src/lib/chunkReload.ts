/**
 * Восстановление после stale-chunk (FBG-127).
 *
 * Storefront собран с `output: 'standalone'` и деплоится через docker rebuild: при релизе
 * старые хешированные webpack-чанки в `.next/static/chunks` удаляются. Клиент с уже открытой
 * (закешированной) страницей при клиентской навигации запрашивает
 * `/_next/static/chunks/<id>-<hash>.js`, которого больше нет → 404 →
 * `ChunkLoadError: Loading chunk <id> failed` в webpack-рантайме (`__webpack_require__.e`).
 * Это транзиентная гонка stale-chunk-after-deploy — лечится перезагрузкой страницы
 * (свежий HTML тянет актуальные чанки).
 *
 * Стратегия: при chunk-load ошибке автоматически перезагрузить страницу, но не зацикливаться —
 * если перезагрузка НЕ помогла (чанк реально 404, сломанный деплой), ошибка доходит до UI и
 * репортится в GlitchTip как настоящий аутаж.
 *
 * FBG-146: раньше повтор глушился булевым sessionStorage-флагом «уже перезагружались» на ВСЮ
 * сессию. Это смешивало два разных случая: (а) reload не помог — тот же чанк 404 сразу после
 * перезагрузки (битый деплой) и (б) НОВЫЙ транзиент позже в той же сессии — пользователь
 * успешно перезагрузился по прошлому редеплою, а через время прилетел НОВЫЙ редеплой с новой
 * stale-chunk гонкой. В случае (б) старая логика отказывала в перезагрузке (флаг-то стоит) →
 * пользователь застревал на сломанной странице, а событие ложно помечалось `persistent` и
 * улетало в GlitchTip. Поэтому флаг теперь хранит ВРЕМЯ последней recovery-перезагрузки, а
 * решение принимается по cooldown-окну (`RELOAD_COOLDOWN_MS`): chunk-error в пределах окна после
 * нашей перезагрузки = reload не помог → persist (не зацикливаемся); ошибка ПОЗЖЕ окна = почти
 * наверняка новый редеплой → даём свежую перезагрузку (транзиент, drop). Так петля reload по
 * битому деплою остаётся ограниченной, а новый транзиент в той же сессии снова лечится сам.
 *
 * FBG-139: recovery из error.tsx/global-error.tsx срабатывает только если React успел
 * отрендерить границу ошибки. Но при stale-deploy 404 ловит и чанк самой границы
 * (`global-error-*.js`) — тогда её `useEffect` не выполнится, а ошибка из webpack-рантайма
 * (`__webpack_require__.e`) всплывёт как `unhandledrejection`/`error` на `window`. Поэтому
 * recovery продублирован глобальным слушателем (`installChunkErrorRecovery`), не зависящим
 * от монтирования границы. Плюс устранена гонка: в той же загрузке, где мы только что
 * запустили перезагрузку, то же исключение, перехваченное глобальным хендлером Sentry,
 * не должно помечаться `persistent` (см. `reloadInitiatedThisLoad`/`classifyChunkEvent`).
 */

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

export const CHUNK_RELOAD_FLAG = 'sf:chunk-reloaded';

/**
 * Окно «горячей» перезагрузки (FBG-146). chunk-load ошибка в пределах этого окна ПОСЛЕ нашей
 * recovery-перезагрузки трактуется как «reload не помог» (битый деплой) → persist + стоп-петля;
 * ошибка позже окна — почти всегда новый редеплой → даём свежую перезагрузку. `location.reload()`
 * перезапрашивает тот же URL, так что повторный 404 битого деплоя прилетает в пределах загрузки
 * страницы (секунды), а не по действию пользователя — 10 с с запасом отделяют «не помогло» от
 * «новый деплой».
 */
export const RELOAD_COOLDOWN_MS = 10_000;

/**
 * Парсит сохранённую отметку времени последней recovery-перезагрузки.
 * `null` — отметки нет. Легаси-значение `'1'` (булев флаг до FBG-146) парсится в epoch-1мс,
 * т.е. оказывается давно устаревшим → трактуется как «перезагрузки не было недавно» (разрешаем
 * свежую). Нечисловой мусор → `null`.
 */
function parseReloadTs(raw: string | null): number | null {
  if (raw == null) return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}

/**
 * In-memory флаг «в ЭТОЙ загрузке страницы мы уже запустили recovery-перезагрузку».
 * Живёт только до перезагрузки (новый JS-контекст стартует с `false`) — в отличие от
 * sessionStorage-флага, который переживает перезагрузку. Различие критично для триажа:
 * sessionStorage-флаг, выставленный в ПРОШЛОЙ загрузке, означает «перезагрузка уже была, а
 * чанк всё равно 404» → persistent; тот же флаг, выставленный только что в ТЕКУЩЕЙ загрузке,
 * означает «мы прямо сейчас перезагружаемся» → это всё ещё транзиент, репортить не нужно.
 */
let reloadInitiated = false;

/** `true` — recovery-перезагрузка уже запущена в текущей (ещё не перезагруженной) загрузке. */
export function reloadInitiatedThisLoad(): boolean {
  return reloadInitiated;
}

/**
 * Ошибка загрузки code-split чанка: webpack `ChunkLoadError` (Next.js) или нативный
 * dynamic import (Chrome/Firefox/Safari) — на случай, если глобальный обработчик Sentry
 * поймает её под другим именем.
 */
export function isChunkLoadError(error: unknown): boolean {
  if (error == null || typeof error !== 'object') return false;
  const { name, message } = error as { name?: unknown; message?: unknown };
  if (name === 'ChunkLoadError') return true;
  if (typeof message !== 'string') return false;
  return /Loading (?:CSS )?chunk \S+ failed|Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed/i.test(
    message,
  );
}

/**
 * Распознаёт chunk-load ошибку для Sentry `beforeSend`: и по «живому» исключению
 * (`hint.originalException`), и по уже сериализованным `event.exception.values`.
 */
export function isChunkLoadEvent(
  originalException: unknown,
  exceptionValues?: ReadonlyArray<{ type?: string; value?: string }>,
): boolean {
  if (isChunkLoadError(originalException)) return true;
  return Boolean(
    exceptionValues?.some((v) => isChunkLoadError({ name: v.type, message: v.value })),
  );
}

/**
 * `true` — если последнюю recovery-перезагрузку делали НЕ в пределах cooldown-окна (значит, это
 * либо первый chunk-error, либо новый редеплой) — и помечает текущим временем, что перезагружаемся
 * сейчас. `false` — перезагрузка была только что (в пределах окна): reload не помог, не зацикливаемся.
 * Если sessionStorage недоступен (private mode / отключён) — `false`, чтобы не рисковать reload-циклом
 * без возможности запомнить отметку.
 */
export function shouldReloadOnce(storage: StorageLike, now: number = Date.now()): boolean {
  try {
    const last = parseReloadTs(storage.getItem(CHUNK_RELOAD_FLAG));
    if (last !== null && now - last < RELOAD_COOLDOWN_MS) return false;
    storage.setItem(CHUNK_RELOAD_FLAG, String(now));
    return true;
  } catch {
    return false;
  }
}

/**
 * `true` — recovery-перезагрузка была НЕДАВНО (в пределах cooldown-окна), т.е. «мы только что
 * перезагрузились, а чанк всё равно 404» → реальный аутаж. Давняя отметка (прошлый редеплой в той
 * же сессии) уже не считается — такой chunk-error это новый транзиент, а не персистентный 404 (FBG-146).
 */
export function chunkReloadAttempted(
  win: Window | undefined = typeof window !== 'undefined' ? window : undefined,
  now: number = Date.now(),
): boolean {
  if (!win) return false;
  try {
    const last = parseReloadTs(win.sessionStorage.getItem(CHUNK_RELOAD_FLAG));
    return last !== null && now - last < RELOAD_COOLDOWN_MS;
  } catch {
    return false;
  }
}

/**
 * Решение Sentry `beforeSend` по chunk-load событию:
 *  - `'drop'`    — транзиент: либо перезагрузки ещё не было (клиент сейчас сам перезагрузится),
 *                  либо перезагрузка запущена прямо в этой загрузке (`reloadInitiated`) и до неё
 *                  глобальный хендлер Sentry успел перехватить то же исключение → глушим;
 *  - `'persist'` — перезагрузка была НЕДАВНО (в пределах cooldown-окна, см. `chunkReloadAttempted`),
 *                  а чанк всё равно 404 → reload не помог = реальный аутаж, событие оставляем;
 *  - `'pass'`    — это не chunk-load ошибка, пропускаем без изменений.
 *
 * `reloadInitiated` (in-memory) проверяется ПЕРЕД `reloadAttempted` (sessionStorage): иначе
 * recovery, выставивший sessionStorage-флаг синхронно перед `location.reload()`, превратил бы
 * первый же транзиент в ложный `persistent` (FBG-139).
 */
export function classifyChunkEvent(
  originalException: unknown,
  exceptionValues?: ReadonlyArray<{ type?: string; value?: string }>,
  reloadAttempted: boolean = chunkReloadAttempted(),
  reloadInitiated: boolean = reloadInitiatedThisLoad(),
): 'drop' | 'persist' | 'pass' {
  if (!isChunkLoadEvent(originalException, exceptionValues)) return 'pass';
  if (reloadInitiated) return 'drop';
  return reloadAttempted ? 'persist' : 'drop';
}

/**
 * Пытается восстановиться после chunk-load ошибки.
 * @returns `true` — перезагрузка запущена (транзиент, самовосстановление: репортить НЕ нужно);
 *          `false` — перезагрузка была только что (в пределах cooldown-окна) и не помогла
 *                    (персистентный 404 = реальный аутаж: репортить нужно).
 */
export function recoverFromChunkError(win: Window = window, now: number = Date.now()): boolean {
  let storage: StorageLike | null = null;
  try {
    storage = win.sessionStorage;
  } catch {
    storage = null;
  }
  if (storage && shouldReloadOnce(storage, now)) {
    reloadInitiated = true;
    win.location.reload();
    return true;
  }
  return false;
}

/**
 * Глобальный (не зависящий от React-границ) перехват chunk-load ошибок (FBG-139).
 *
 * Слушает `error` и `unhandledrejection` на `window`: ошибка чанка из webpack-рантайма
 * (`__webpack_require__.e`) всплывает сюда ещё до — или вместо — границы ошибки, чанк которой
 * при stale-deploy сам может быть 404 (тогда `error.tsx`/`global-error.tsx` не смонтируются и
 * их recovery-`useEffect` не запустится). Дублирует ту же once-per-session перезагрузку через
 * `recoverFromChunkError`, поэтому sessionStorage-флаг гарантирует ровно один reload, даже если
 * сработают и слушатель, и граница. Регистрируется ПОСЛЕ `Sentry.init` — глобальный хендлер
 * Sentry успевает перехватить (и по `beforeSend` приглушить) транзиент до перезагрузки.
 *
 * Не вызывает `preventDefault`/`stopImmediatePropagation` — не мешаем Sentry увидеть событие.
 * @returns функция-деинсталлятор (для тестов/HMR).
 */
export function installChunkErrorRecovery(win: Window = window): () => void {
  const onError = (event: ErrorEvent): void => {
    if (isChunkLoadError(event?.error)) recoverFromChunkError(win);
  };
  const onRejection = (event: PromiseRejectionEvent): void => {
    if (isChunkLoadError(event?.reason)) recoverFromChunkError(win);
  };
  win.addEventListener('error', onError);
  win.addEventListener('unhandledrejection', onRejection);
  return () => {
    win.removeEventListener('error', onError);
    win.removeEventListener('unhandledrejection', onRejection);
  };
}
