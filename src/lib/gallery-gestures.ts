/**
 * Чистая математика жестов полноэкранного просмотрщика фото (FullscreenGallery):
 * пинч-зум, зум вокруг точки (двойной тап / колесо), ограничение панорамы,
 * решение по свайпу. Без DOM — покрывается юнит-тестами.
 *
 * Система координат: точка `p` задаётся относительно ЦЕНТРА вьюпорта,
 * трансформация картинки — `translate(tx, ty) scale(s)` с transform-origin в центре.
 * Точка картинки под экранной точкой p: (p - t) / s.
 */

export interface Transform {
  s: number;
  tx: number;
  ty: number;
}

export interface Point {
  x: number;
  y: number;
}

export const IDENTITY: Transform = { s: 1, tx: 0, ty: 0 };
export const MIN_SCALE = 1;
export const MAX_SCALE = 4;
/** Масштаб по двойному тапу */
export const DOUBLE_TAP_SCALE = 2.5;
/** Ниже этого порога масштаб «прилипает» к 1 — картинка встаёт на место */
const SETTLE_SCALE = 1.05;

// `|| 0` нормализует -0 (Math.max(-0, -30) даёт -0) — чтобы transform не дрожал на сравнениях
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v)) || 0;

export const clampScale = (s: number) => clamp(s, MIN_SCALE, MAX_SCALE);

export const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
export const midpoint = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

/**
 * Ограничить сдвиг так, чтобы увеличенная картинка не уезжала за края вьюпорта.
 * `fitW × fitH` — размер картинки при s = 1 (уже вписанной во вьюпорт `vw × vh`).
 * Если картинка меньше вьюпорта по оси — по этой оси она остаётся по центру.
 */
export function clampPan(
  t: Transform,
  fitW: number,
  fitH: number,
  vw: number,
  vh: number,
): Transform {
  const maxX = Math.max(0, (fitW * t.s - vw) / 2);
  const maxY = Math.max(0, (fitH * t.s - vh) / 2);
  return { s: t.s, tx: clamp(t.tx, -maxX, maxX), ty: clamp(t.ty, -maxY, maxY) };
}

/** Зум к масштабу `nextScale` вокруг точки p: точка картинки под p остаётся под p. */
export function zoomAt(t: Transform, p: Point, nextScale: number): Transform {
  const s = clampScale(nextScale);
  const k = s / t.s;
  return { s, tx: p.x - (p.x - t.tx) * k, ty: p.y - (p.y - t.ty) * k };
}

export interface PinchStart {
  /** Трансформация в момент касания вторым пальцем */
  t: Transform;
  dist: number;
  mid: Point;
}

/**
 * Пинч двумя пальцами: масштаб — по отношению расстояний, сдвиг — так, чтобы
 * точка картинки, бывшая под серединой пальцев в начале, следовала за серединой
 * (даёт одновременно зум и панораму).
 */
export function pinchTransform(start: PinchStart, dist: number, mid: Point): Transform {
  if (start.dist <= 0) return start.t;
  const s = clampScale(start.t.s * (dist / start.dist));
  const k = s / start.t.s;
  return {
    s,
    tx: mid.x - (start.mid.x - start.t.tx) * k,
    ty: mid.y - (start.mid.y - start.t.ty) * k,
  };
}

/** Зум колесом: deltaY > 0 — отдаление. */
export function wheelZoom(t: Transform, p: Point, deltaY: number): Transform {
  return zoomAt(t, p, t.s * Math.exp(-deltaY * 0.0015));
}

/** Двойной тап: увеличенную картинку вернуть, обычную — приблизить к точке тапа. */
export function toggleZoom(t: Transform, p: Point): Transform {
  return t.s > 1 ? IDENTITY : zoomAt(IDENTITY, p, DOUBLE_TAP_SCALE);
}

/** После жеста: почти единичный масштаб → ровно 1 и по центру. */
export function settle(t: Transform): Transform {
  return t.s < SETTLE_SCALE ? IDENTITY : t;
}

/**
 * Решение по окончании горизонтального свайпа: +1 — к следующему фото,
 * −1 — к предыдущему, 0 — остаться. `dx` — сдвиг пальца (px), `width` — ширина
 * вьюпорта, `velocity` — скорость в px/мс (знак как у dx).
 */
export function swipeDelta(dx: number, width: number, velocity: number): -1 | 0 | 1 {
  const threshold = Math.min(80, width * 0.2);
  const flick = Math.abs(velocity) > 0.5 && Math.abs(dx) > 20;
  if (dx < -threshold || (flick && dx < 0)) return 1;
  if (dx > threshold || (flick && dx > 0)) return -1;
  return 0;
}

/** Тап: короткое касание почти без движения. */
export function isTap(moved: number, durationMs: number): boolean {
  return moved < 10 && durationMs < 300;
}

/** Второй тап считается двойным, если близко по времени и месту к первому. */
export function isDoubleTap(
  prev: { time: number; p: Point } | null,
  now: number,
  p: Point,
): boolean {
  return !!prev && now - prev.time < 300 && distance(prev.p, p) < 30;
}
