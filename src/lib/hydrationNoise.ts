/**
 * Глушение ВОССТАНОВИМЫХ ошибок гидратации React в Sentry/GlitchTip (FBG-126).
 *
 * Продовая ошибка GlitchTip #13 (project ac-vitrina, american-creator.ru):
 *   Error: Minified React error #423  — стек целиком в react-dom hydration + scheduler
 *   (MessagePort), ни одного фрейма приложения; 1 событие, URL `search.php?products/...`
 *   (бот по старым .php), Chrome 105/Windows.
 *
 * При расхождении server/client DOM React 18/19 вызывает `onRecoverableError` с кодами
 * #418/#419/#422/#423/#425 и САМ перерисовывает поддерево (или весь корень) на клиенте —
 * это ВОССТАНОВИМЫЕ ошибки: пользователь видит рабочую страницу. На проде их источник почти
 * всегда внешний (расширение/антивирус/прокси, мутировавшие DOM до гидратации; боты на
 * легаси-URL в старых браузерах), а не баг репо. Настоящее SSR/CSR-расхождение в коде даёт
 * не одно событие на ботовом URL, а массовый поток на реальных маршрутах — и ловится в dev
 * (React печатает полный diff гидратации) и в CI ещё до прода.
 *
 * Поэтому в Sentry `beforeSend` такие события глушим (оставляя breadcrumb — если следом
 * прилетит ДРУГАЯ, настоящая ошибка, в ней будет видно предшествующее восстановление гидратации).
 *
 * ⚠️ Компромисс (как и в [[chunkReload]]): системный регресс гидратации, занесённый правкой
 * кода, в GlitchTip не всплывёт — его рубеж обороны это dev/CI-предупреждения React. Если
 * понадобится вернуть видимость в проде — сузить список кодов или убрать фильтр здесь.
 */

/** Минифицированные коды ВОССТАНОВИМЫХ ошибок гидратации React 18/19. */
export const RECOVERABLE_HYDRATION_CODES = [418, 419, 422, 423, 425] as const;

/** Прод: `Error: Minified React error #423; visit https://react.dev/errors/423 …`. */
const MINIFIED_RE = /Minified React error #(?:418|419|422|423|425)\b/;

/**
 * Dev / не-минифицированная сборка — те же восстановимые ошибки человекочитаемым текстом:
 *  #418/#423 — «Hydration failed…», «There was an error while hydrating…»;
 *  #419/#422 — «server could not finish this Suspense boundary…»;
 *  #425      — «Text content does not match server-rendered HTML».
 */
const VERBOSE_RE =
  /Hydration failed because|There was an error while hydrating|Text content does(?:n['’]t| not) match server-rendered HTML|server could not finish this Suspense boundary/i;

/**
 * Восстановимая ошибка гидратации React: распознаём по `message` (минифицированный код или
 * человекочитаемый текст). Имя/тип не используем — в проде это всегда просто `Error`.
 */
export function isRecoverableHydrationError(error: unknown): boolean {
  if (error == null || typeof error !== 'object') return false;
  const { message } = error as { message?: unknown };
  if (typeof message !== 'string') return false;
  return MINIFIED_RE.test(message) || VERBOSE_RE.test(message);
}

/**
 * Распознаёт восстановимую ошибку гидратации для Sentry `beforeSend`: и по «живому»
 * исключению (`hint.originalException`), и по уже сериализованным `event.exception.values`
 * (там текст ошибки лежит в `value`).
 */
export function isRecoverableHydrationEvent(
  originalException: unknown,
  exceptionValues?: ReadonlyArray<{ type?: string; value?: string }>,
): boolean {
  if (isRecoverableHydrationError(originalException)) return true;
  return Boolean(exceptionValues?.some((v) => isRecoverableHydrationError({ message: v.value })));
}
