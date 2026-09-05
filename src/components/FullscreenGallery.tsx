'use client';

/**
 * Полноэкранный просмотрщик фото товара.
 *
 * Тач: свайп влево/вправо — следующее/предыдущее фото, пинч — зум, один палец
 * на увеличенной — панорама, двойной тап — приблизить/вернуть.
 * Десктоп: стрелки (кнопки и клавиатура), колесо — зум к курсору, двойной
 * клик — приблизить/вернуть, Esc / крестик — закрыть.
 *
 * Вся математика жестов — в `@/lib/gallery-gestures` (чистые функции, тесты там же).
 * Жесты собираются из Pointer Events на одном элементе-вьюпорте с
 * `touch-action: none`, чтобы браузер не перехватывал пинч/скролл.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Box, IconButton, Modal, Typography } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CloseIcon from '@mui/icons-material/Close';
import { imgDetail, imgOriginal } from '@/lib/image-url';
import {
  IDENTITY,
  clampPan,
  distance,
  isDoubleTap,
  isTap,
  midpoint,
  pinchTransform,
  settle,
  swipeDelta,
  toggleZoom,
  wheelZoom,
  type PinchStart,
  type Point,
  type Transform,
} from '@/lib/gallery-gestures';

export interface GalleryImage {
  id: string | number;
  file_path: string;
}

/** Подписи кнопок (для ru/en витрины приходят из next-intl; дефолт — русский) */
export interface FullscreenGalleryLabels {
  close: string;
  prev: string;
  next: string;
}

const DEFAULT_LABELS: FullscreenGalleryLabels = {
  close: 'Close',
  prev: 'Previous photo',
  next: 'Next photo',
};

export interface FullscreenGalleryProps {
  open: boolean;
  labels?: Partial<FullscreenGalleryLabels>;
  images: GalleryImage[];
  index: number;
  alt: string;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}

type GestureMode = 'none' | 'swipe' | 'pan' | 'pinch';

interface Gesture {
  mode: GestureMode;
  start: Point;
  startT: Transform;
  startTime: number;
  last: Point;
  lastTime: number;
  velocity: number;
  moved: number;
  pinch: PinchStart | null;
}

const ctrlButtonSx = {
  color: 'white',
  bgcolor: 'rgba(0,0,0,0.35)',
  '&:hover': { bgcolor: 'rgba(0,0,0,0.55)' },
  '&.Mui-disabled': { color: 'rgba(255,255,255,0.25)', bgcolor: 'rgba(0,0,0,0.2)' },
} as const;

export function FullscreenGallery({
  open,
  images,
  index,
  alt,
  onClose,
  onIndexChange,
  labels: labelsProp,
}: FullscreenGalleryProps) {
  const labels = { ...DEFAULT_LABELS, ...labelsProp };
  const viewportRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const pointers = useRef(new Map<number, Point>());
  const gesture = useRef<Gesture>({
    mode: 'none',
    start: { x: 0, y: 0 },
    startT: IDENTITY,
    startTime: 0,
    last: { x: 0, y: 0 },
    lastTime: 0,
    velocity: 0,
    moved: 0,
    pinch: null,
  });
  const lastTap = useRef<{ time: number; p: Point } | null>(null);

  // Трансформация текущего слайда; ref — зеркало для обработчиков без stale-closure
  const [t, setTState] = useState<Transform>(IDENTITY);
  const tRef = useRef<Transform>(IDENTITY);
  const setT = useCallback((next: Transform) => {
    tRef.current = next;
    setTState(next);
  }, []);

  // Сдвиг ленты пальцем во время свайпа; dragging отключает CSS-переход
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [loaded, setLoaded] = useState<Record<string, boolean>>({});

  const count = images.length;
  const zoomed = t.s > 1;

  // Смена фото / открытие — картинка в исходном масштабе
  useEffect(() => {
    setT(IDENTITY);
    setDragX(0);
    pointers.current.clear();
    gesture.current.mode = 'none';
  }, [index, open, setT]);

  const goTo = useCallback(
    (i: number) => {
      if (i < 0 || i >= count || i === index) return;
      onIndexChange(i);
    },
    [count, index, onIndexChange],
  );

  /** Точка события относительно центра вьюпорта */
  const localPoint = (e: { clientX: number; clientY: number }): Point => {
    const r = viewportRef.current?.getBoundingClientRect();
    if (!r) return { x: e.clientX, y: e.clientY };
    return { x: e.clientX - r.left - r.width / 2, y: e.clientY - r.top - r.height / 2 };
  };

  /** Ограничить панораму размерами вписанной картинки и вьюпорта */
  const bounded = (next: Transform): Transform => {
    const vp = viewportRef.current;
    const img = imgRef.current;
    if (!vp) return next;
    const vw = vp.clientWidth;
    const vh = vp.clientHeight;
    const fitW = img?.offsetWidth || vw;
    const fitH = img?.offsetHeight || vh;
    return clampPan(next, fitW, fitH, vw, vh);
  };

  const handleTap = (p: Point, now: number) => {
    if (isDoubleTap(lastTap.current, now, p)) {
      lastTap.current = null;
      setT(bounded(toggleZoom(tRef.current, p)));
    } else {
      lastTap.current = { time: now, p };
    }
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Кнопки поверх вьюпорта обрабатывают клики сами
    if ((e.target as HTMLElement).closest('button')) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const p = localPoint(e);
    pointers.current.set(e.pointerId, p);
    const g = gesture.current;
    const now = e.timeStamp;

    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      g.mode = 'pinch';
      g.pinch = { t: tRef.current, dist: distance(a, b), mid: midpoint(a, b) };
      g.moved = Infinity; // после пинча тап не засчитываем
      setDragX(0);
      return;
    }
    if (pointers.current.size > 2) return;

    g.mode = tRef.current.s > 1 ? 'pan' : 'swipe';
    g.start = p;
    g.startT = tRef.current;
    g.startTime = now;
    g.last = p;
    g.lastTime = now;
    g.velocity = 0;
    g.moved = 0;
    g.pinch = null;
    setDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId)) return;
    const p = localPoint(e);
    pointers.current.set(e.pointerId, p);
    const g = gesture.current;

    if (g.mode === 'pinch' && g.pinch && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      setT(bounded(pinchTransform(g.pinch, distance(a, b), midpoint(a, b))));
      return;
    }
    if (g.mode === 'pan') {
      g.moved = Math.max(g.moved, distance(g.start, p));
      setT(
        bounded({
          s: g.startT.s,
          tx: g.startT.tx + (p.x - g.start.x),
          ty: g.startT.ty + (p.y - g.start.y),
        }),
      );
      return;
    }
    if (g.mode === 'swipe') {
      let dx = p.x - g.start.x;
      g.moved = Math.max(g.moved, distance(g.start, p));
      if (g.moved < 6) return; // допуск тапа
      const dt = e.timeStamp - g.lastTime;
      if (dt > 0) g.velocity = (p.x - g.last.x) / dt;
      g.last = p;
      g.lastTime = e.timeStamp;
      // Резинка на краях ленты (без зацикливания)
      if ((index === 0 && dx > 0) || (index === count - 1 && dx < 0)) dx *= 0.3;
      setDragX(dx);
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId)) return;
    const p = localPoint(e);
    pointers.current.delete(e.pointerId);
    const g = gesture.current;
    const now = e.timeStamp;

    if (g.mode === 'pinch') {
      const settled = settle(tRef.current);
      setT(bounded(settled));
      if (pointers.current.size === 1) {
        // Один палец остался — продолжаем панорамой с него
        const [rest] = [...pointers.current.values()];
        g.mode = settled.s > 1 ? 'pan' : 'swipe';
        g.start = rest;
        g.startT = settled;
        g.startTime = now;
        g.last = rest;
        g.lastTime = now;
        g.velocity = 0;
        g.moved = Infinity;
        g.pinch = null;
      } else {
        g.mode = 'none';
        g.pinch = null;
        setDragging(false);
      }
      return;
    }

    if (g.mode === 'swipe') {
      const width = viewportRef.current?.clientWidth ?? 0;
      if (isTap(g.moved, now - g.startTime)) {
        handleTap(p, now);
      } else {
        goTo(index + swipeDelta(p.x - g.start.x, width, g.velocity));
      }
      setDragX(0);
    } else if (g.mode === 'pan') {
      if (isTap(g.moved, now - g.startTime)) handleTap(p, now);
    }
    setDragging(false);
    g.mode = 'none';
  };

  // Колесо и iOS-gesture — нативные non-passive слушатели: React регистрирует
  // wheel как passive, а preventDefault нужен, чтобы трекпад не зумил страницу.
  useEffect(() => {
    const vp = viewportRef.current;
    if (!open || !vp) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const next = settle(wheelZoom(tRef.current, localPoint(e), e.deltaY));
      setT(bounded(next));
    };
    const prevent = (e: Event) => e.preventDefault();
    vp.addEventListener('wheel', onWheel, { passive: false });
    vp.addEventListener('gesturestart', prevent);
    vp.addEventListener('gesturechange', prevent);
    return () => {
      vp.removeEventListener('wheel', onWheel);
      vp.removeEventListener('gesturestart', prevent);
      vp.removeEventListener('gesturechange', prevent);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, setT]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') goTo(index + 1);
    else if (e.key === 'ArrowLeft') goTo(index - 1);
  };

  if (count === 0) return null;

  return (
    <Modal open={open} onClose={onClose} hideBackdrop closeAfterTransition={false}>
      <Box
        ref={viewportRef}
        tabIndex={-1}
        role="dialog"
        aria-label={alt}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        sx={{
          position: 'fixed',
          inset: 0,
          bgcolor: 'rgba(0,0,0,0.96)',
          outline: 'none',
          overflow: 'hidden',
          touchAction: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          cursor: zoomed ? 'grab' : 'zoom-in',
          '&:active': { cursor: zoomed ? 'grabbing' : 'zoom-in' },
        }}
      >
        {/* Лента слайдов. Меняющиеся на каждый pointermove transform/transition —
            inline style, а не sx: emotion иначе плодит класс на каждый кадр */}
        <Box
          style={{
            transform: `translate3d(calc(${-index * 100}% + ${dragX}px), 0, 0)`,
            transition: dragging ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
          }}
          sx={{ display: 'flex', height: '100%', width: '100%', willChange: 'transform' }}
        >
          {images.map((img, i) => {
            const near = Math.abs(i - index) <= 1;
            const current = i === index;
            const key = String(img.id);
            const imgTransform = current ? `translate(${t.tx}px, ${t.ty}px) scale(${t.s})` : 'none';
            // Переход только вне жеста (двойной тап / колесо / возврат после пинча)
            const imgTransition =
              current && gesture.current.mode === 'none' ? 'transform 0.2s ease-out' : 'none';
            return (
              <Box
                key={key}
                sx={{
                  position: 'relative',
                  flex: '0 0 100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}
              >
                {near && (
                  <>
                    {/* Размытое превью, пока грузится полноразмерное */}
                    {!loaded[key] && (
                      <Box
                        component="img"
                        src={imgDetail(img.file_path)}
                        alt=""
                        draggable={false}
                        sx={{
                          position: 'absolute',
                          inset: 0,
                          m: 'auto',
                          maxWidth: '100%',
                          maxHeight: '100%',
                          filter: 'blur(8px)',
                          opacity: 0.6,
                          pointerEvents: 'none',
                        }}
                      />
                    )}
                    <Box
                      component="img"
                      ref={current ? imgRef : undefined}
                      src={imgOriginal(img.file_path)}
                      alt={count > 1 ? `${alt} — ${i + 1}` : alt}
                      draggable={false}
                      onLoad={() =>
                        setLoaded((prev) => (prev[key] ? prev : { ...prev, [key]: true }))
                      }
                      style={{
                        opacity: loaded[key] ? 1 : 0,
                        transform: imgTransform,
                        transition: imgTransition,
                      }}
                      sx={{
                        display: 'block',
                        maxWidth: '100%',
                        maxHeight: '100%',
                        width: 'auto',
                        height: 'auto',
                        transformOrigin: 'center',
                        pointerEvents: 'none',
                      }}
                    />
                  </>
                )}
              </Box>
            );
          })}
        </Box>

        {/* Верхняя панель: счётчик + закрыть (с учётом чёлки) */}
        <Box
          sx={{
            position: 'absolute',
            top: 'env(safe-area-inset-top, 0px)',
            left: 0,
            right: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 1.5,
            pointerEvents: 'none',
          }}
        >
          {/* Тёмная «пилюля», как у кнопок: белые фото при зуме заливают весь экран */}
          <Typography
            aria-live="polite"
            sx={{
              color: 'white',
              fontSize: 14,
              lineHeight: '20px',
              px: 1.5,
              py: 0.5,
              borderRadius: 999,
              bgcolor: 'rgba(0,0,0,0.35)',
              visibility: count > 1 ? 'visible' : 'hidden',
            }}
          >
            {count > 1 ? `${index + 1} / ${count}` : ''}
          </Typography>
          <IconButton
            aria-label={labels.close}
            onClick={onClose}
            sx={{ ...ctrlButtonSx, pointerEvents: 'auto' }}
          >
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Стрелки — только там, где есть курсор; на таче листают свайпом */}
        {count > 1 && (
          <>
            <IconButton
              aria-label={labels.prev}
              disabled={index === 0}
              onClick={() => goTo(index - 1)}
              sx={{
                ...ctrlButtonSx,
                position: 'absolute',
                left: 16,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 48,
                height: 48,
                '@media (hover: none)': { display: 'none' },
              }}
            >
              <ChevronLeftIcon sx={{ fontSize: 32 }} />
            </IconButton>
            <IconButton
              aria-label={labels.next}
              disabled={index === count - 1}
              onClick={() => goTo(index + 1)}
              sx={{
                ...ctrlButtonSx,
                position: 'absolute',
                right: 16,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 48,
                height: 48,
                '@media (hover: none)': { display: 'none' },
              }}
            >
              <ChevronRightIcon sx={{ fontSize: 32 }} />
            </IconButton>
          </>
        )}
      </Box>
    </Modal>
  );
}
