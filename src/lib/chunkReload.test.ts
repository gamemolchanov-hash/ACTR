/**
 * FBG-127 — авто-recovery при stale-chunk после редеплоя storefront.
 *
 * Продовая ошибка GlitchTip #12 (project ac-vitrina, american-creator.ru):
 *   ChunkLoadError: Loading chunk 3081 failed.  (стек webpack, `__webpack_require__.e`)
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  isChunkLoadError,
  isChunkLoadEvent,
  shouldReloadOnce,
  chunkReloadAttempted,
  classifyChunkEvent,
  recoverFromChunkError,
  reloadInitiatedThisLoad,
  installChunkErrorRecovery,
  CHUNK_RELOAD_FLAG,
  RELOAD_COOLDOWN_MS,
} from './chunkReload';

const PROD_ERROR = { name: 'ChunkLoadError', message: 'Loading chunk 3081 failed.' };
/** Точный payload прод-события FBG-139 (GlitchTip issue #24). */
const PROD_6470 = { name: 'ChunkLoadError', message: 'Loading chunk 6470 failed.' };

/** Фейковое окно: пишет sessionStorage в Map и копит window-слушатели для ручного dispatch. */
function makeFakeWin() {
  const map = new Map<string, string>();
  const listeners: Record<string, Array<(e: unknown) => void>> = {};
  const reload = vi.fn();
  const win = {
    sessionStorage: {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => void map.set(k, v),
    },
    location: { reload },
    addEventListener: (type: string, fn: (e: unknown) => void) => {
      (listeners[type] ??= []).push(fn);
    },
    removeEventListener: (type: string, fn: (e: unknown) => void) => {
      listeners[type] = (listeners[type] ?? []).filter((f) => f !== fn);
    },
  } as unknown as Window;
  const dispatch = (type: string, event: unknown) =>
    (listeners[type] ?? []).forEach((fn) => fn(event));
  return { win, reload, dispatch };
}

describe('isChunkLoadError', () => {
  it('распознаёт ровно продовую ошибку #12', () => {
    expect(isChunkLoadError(PROD_ERROR)).toBe(true);
  });

  it('распознаёт нативные dynamic-import ошибки браузеров', () => {
    expect(
      isChunkLoadError({
        name: 'TypeError',
        message:
          'Failed to fetch dynamically imported module: https://american-creator.ru/_next/static/chunks/3081-x.js',
      }),
    ).toBe(true); // Chrome/Edge
    expect(isChunkLoadError({ message: 'Importing a module script failed.' })).toBe(true); // Safari
    expect(isChunkLoadError({ message: 'error loading dynamically imported module' })).toBe(true); // Firefox
    expect(isChunkLoadError({ message: 'Loading CSS chunk 42 failed.' })).toBe(true); // webpack css
  });

  it('НЕ глушит обычные ошибки кода (негатив)', () => {
    expect(isChunkLoadError({ name: 'TypeError', message: "Cannot read 'id' of undefined" })).toBe(
      false,
    );
    expect(isChunkLoadError(null)).toBe(false);
    expect(isChunkLoadError(undefined)).toBe(false);
    expect(isChunkLoadError({})).toBe(false);
    expect(isChunkLoadError('Loading chunk 3081 failed.')).toBe(false); // строка, не Error
  });
});

describe('isChunkLoadEvent (Sentry beforeSend)', () => {
  it('ловит по originalException и по сериализованным exception.values', () => {
    expect(isChunkLoadEvent(PROD_ERROR)).toBe(true);
    expect(
      isChunkLoadEvent(undefined, [
        { type: 'ChunkLoadError', value: 'Loading chunk 3081 failed.' },
      ]),
    ).toBe(true);
    expect(isChunkLoadEvent(new TypeError('boom'), [{ type: 'TypeError', value: 'boom' }])).toBe(
      false,
    );
  });
});

describe('shouldReloadOnce — cooldown-окно перезагрузки', () => {
  const mkStorage = () => {
    const map = new Map<string, string>();
    return {
      map,
      storage: {
        getItem: (k: string) => map.get(k) ?? null,
        setItem: (k: string, v: string) => void map.set(k, v),
      },
    };
  };

  it('первый chunk-error → перезагрузка; повтор в пределах cooldown → нет (reload не помог, не зацикливаемся)', () => {
    const { storage } = mkStorage();
    const t0 = 1_000_000;
    expect(shouldReloadOnce(storage, t0)).toBe(true);
    expect(shouldReloadOnce(storage, t0 + RELOAD_COOLDOWN_MS - 1)).toBe(false);
  });

  it('FBG-146: chunk-error ПОЗЖЕ cooldown (новый редеплой в той же сессии) → снова перезагрузка', () => {
    const { storage } = mkStorage();
    const t0 = 1_000_000;
    expect(shouldReloadOnce(storage, t0)).toBe(true);
    // старый булев once-per-session флаг заблокировал бы reload до конца сессии — теперь нет
    expect(shouldReloadOnce(storage, t0 + RELOAD_COOLDOWN_MS + 1)).toBe(true);
  });

  it('FBG-146: легаси-значение флага ("1") трактуется как устаревшее → перезагрузка разрешена', () => {
    const { map, storage } = mkStorage();
    map.set(CHUNK_RELOAD_FLAG, '1'); // формат до FBG-146
    expect(shouldReloadOnce(storage, 1_000_000)).toBe(true);
  });

  it('storage недоступен → false (не рискуем reload-циклом)', () => {
    const broken = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('SecurityError');
      },
    };
    expect(shouldReloadOnce(broken)).toBe(false);
  });
});

describe('classifyChunkEvent — решение beforeSend', () => {
  // 4-й аргумент (reloadInitiated) задаём явно, чтобы не зависеть от in-memory модульного состояния.
  it('не chunk-load ошибка → pass (событие не трогаем)', () => {
    expect(classifyChunkEvent(new TypeError('boom'), undefined, false, false)).toBe('pass');
  });

  it('chunk-load до перезагрузки → drop (транзиент, сейчас перезагрузимся)', () => {
    expect(classifyChunkEvent(PROD_ERROR, undefined, false, false)).toBe('drop');
  });

  it('chunk-load после перезагрузки в ПРОШЛОЙ загрузке → persist (реальный аутаж, видно в GlitchTip)', () => {
    expect(classifyChunkEvent(PROD_ERROR, undefined, true, false)).toBe('persist');
    // через сериализованный event.exception.values тоже
    expect(
      classifyChunkEvent(
        undefined,
        [{ type: 'ChunkLoadError', value: 'Loading chunk 3081 failed.' }],
        true,
        false,
      ),
    ).toBe('persist');
  });

  it('reloadInitiated в ТЕКУЩЕЙ загрузке → drop, даже если sessionStorage-флаг уже стоит (FBG-139)', () => {
    // recovery синхронно ставит sessionStorage-флаг перед reload; то же исключение, перехваченное
    // глобальным хендлером Sentry в этой же загрузке, не должно стать ложным persistent.
    expect(classifyChunkEvent(PROD_6470, undefined, true, true)).toBe('drop');
  });
});

describe('chunkReloadAttempted (jsdom sessionStorage)', () => {
  beforeEach(() => window.sessionStorage.clear());

  it('true только для НЕДАВНЕЙ перезагрузки (в пределах cooldown), давняя отметка → false (FBG-146)', () => {
    const now = 5_000_000;
    expect(chunkReloadAttempted(window, now)).toBe(false);
    window.sessionStorage.setItem(CHUNK_RELOAD_FLAG, String(now));
    expect(chunkReloadAttempted(window, now)).toBe(true);
    // отметка прошлого редеплоя в той же сессии устарела → это не персистентный 404
    expect(chunkReloadAttempted(window, now + RELOAD_COOLDOWN_MS + 1)).toBe(false);
  });
});

describe('recoverFromChunkError — end-to-end путь error.tsx', () => {
  it('1-й chunk-error перезагружает (репорт пропускаем), 2-й — нет (репортим как аутаж)', () => {
    const { win, reload } = makeFakeWin();

    // 1-й раз: транзиент → перезагрузка, error.tsx НЕ репортит
    expect(recoverFromChunkError(win)).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
    // В ЭТОЙ же загрузке reload уже запущен → то же исключение остаётся транзиентом (drop),
    // несмотря на выставленный sessionStorage-флаг (FBG-139: без этого был бы ложный persist).
    expect(
      classifyChunkEvent(
        PROD_ERROR,
        undefined,
        chunkReloadAttempted(win),
        reloadInitiatedThisLoad(),
      ),
    ).toBe('drop');
    // А вот в СЛЕДУЮЩЕЙ загрузке (новый JS-контекст: reloadInitiated=false) тот же 404 → persist.
    expect(classifyChunkEvent(PROD_ERROR, undefined, chunkReloadAttempted(win), false)).toBe(
      'persist',
    );

    // 2-й раз: перезагрузка уже была → НЕ зацикливаемся, error.tsx репортит
    expect(recoverFromChunkError(win)).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);
  });
});

describe('FBG-146 — новый редеплой в той же сессии не должен ложно становиться persistent', () => {
  it('chunk-error ПОЗЖЕ cooldown после прошлой перезагрузки → не persist (drop) и снова recovery-reload', () => {
    const { win, reload } = makeFakeWin();
    const t0 = 1_000_000;

    // Эта загрузка стартовала после recovery-перезагрузки прошлого редеплоя (отметка t0).
    win.sessionStorage.setItem(CHUNK_RELOAD_FLAG, String(t0));

    // Спустя время в той же сессии прилетел НОВЫЙ редеплой → новая stale-chunk гонка.
    const tLater = t0 + RELOAD_COOLDOWN_MS + 60_000;

    // Отметка прошлой перезагрузки устарела → это НЕ персистентный 404, а транзиент.
    // (Старая once-per-session логика дала бы chunkReloadAttempted=true → ложный persist в GlitchTip.)
    expect(chunkReloadAttempted(win, tLater)).toBe(false);
    expect(
      classifyChunkEvent(PROD_ERROR, undefined, chunkReloadAttempted(win, tLater), false),
    ).toBe('drop');

    // И recovery снова перезагружает (старая логика отказала бы — флаг-то стоит).
    expect(recoverFromChunkError(win, tLater)).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('битый деплой: повторный chunk-error в пределах cooldown остаётся persistent (петля не зацикливается)', () => {
    const { win, reload } = makeFakeWin();
    const t0 = 2_000_000;

    // 1-й транзиент текущей загрузки: перезагрузка, отметка t0.
    expect(recoverFromChunkError(win, t0)).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);

    // Перезагрузка отдала тот же битый деплой — чанк снова 404 в пределах cooldown.
    const tSoon = t0 + 3_000;
    expect(recoverFromChunkError(win, tSoon)).toBe(false); // не зацикливаемся
    expect(reload).toHaveBeenCalledTimes(1);
    // В НОВОЙ загрузке (reloadInitiated=false) это персистентный аутаж → видно в GlitchTip.
    expect(chunkReloadAttempted(win, tSoon)).toBe(true);
    expect(classifyChunkEvent(PROD_ERROR, undefined, chunkReloadAttempted(win, tSoon), false)).toBe(
      'persist',
    );
  });
});

describe('installChunkErrorRecovery — глобальный recovery без React-границы (FBG-139)', () => {
  it('unhandledrejection с ChunkLoadError из webpack-рантайма → перезагрузка', () => {
    const { win, reload, dispatch } = makeFakeWin();
    installChunkErrorRecovery(win);
    dispatch('unhandledrejection', { reason: PROD_6470 });
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('error-событие с ChunkLoadError → перезагрузка', () => {
    const { win, reload, dispatch } = makeFakeWin();
    installChunkErrorRecovery(win);
    dispatch('error', { error: PROD_6470 });
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('обычная ошибка НЕ триггерит перезагрузку (негатив)', () => {
    const { win, reload, dispatch } = makeFakeWin();
    installChunkErrorRecovery(win);
    dispatch('unhandledrejection', { reason: new TypeError('boom') });
    dispatch('error', { error: new TypeError('boom') });
    expect(reload).not.toHaveBeenCalled();
  });

  it('деинсталлятор снимает слушатели', () => {
    const { win, reload, dispatch } = makeFakeWin();
    const uninstall = installChunkErrorRecovery(win);
    uninstall();
    dispatch('unhandledrejection', { reason: PROD_6470 });
    dispatch('error', { error: PROD_6470 });
    expect(reload).not.toHaveBeenCalled();
  });

  it('регресс FBG-139: транзиент, перехваченный Sentry в той же загрузке, НЕ помечается persistent', () => {
    const { win, reload, dispatch } = makeFakeWin();
    installChunkErrorRecovery(win);

    // Чанк границы ошибки сам 404 → граница не смонтировалась, ошибка пришла как unhandledrejection.
    dispatch('unhandledrejection', { reason: PROD_6470 });
    expect(reload).toHaveBeenCalledTimes(1);
    expect(reloadInitiatedThisLoad()).toBe(true);

    // sessionStorage-флаг уже стоит (его выставил recovery) — раньше это давало ложный persist.
    expect(chunkReloadAttempted(win)).toBe(true);
    // Теперь то же исключение в этой загрузке → drop (мы прямо сейчас перезагружаемся).
    expect(
      classifyChunkEvent(
        PROD_6470,
        undefined,
        chunkReloadAttempted(win),
        reloadInitiatedThisLoad(),
      ),
    ).toBe('drop');
  });
});
