'use client';

import { useLayoutEffect, useRef, type ElementType, type ReactNode } from 'react';
import { Box, type SxProps, type Theme } from '@mui/material';

/**
 * Текст в одну строку, который ужимает СВОЙ размер шрифта под ширину контейнера
 * (владелец 21.09.2026: «уменьшать шрифт, а не переносить»). Рендерится с базовым
 * размером из sx и `white-space: nowrap`, меряет scrollWidth/clientWidth и ставит
 * inline font-size ровно такой, чтобы строка поместилась, но не ниже `minPx`;
 * если не хватает и минимального — переносится обычным образом. При ресайзе
 * окна / контейнера пересчитывается (ResizeObserver), базовый размер берётся
 * заново (inline-стиль сбрасывается перед замером), поэтому шрифт растёт назад.
 */
export function FitText({
  children,
  minPx = 11,
  sx,
  component = 'div',
  ...rest
}: {
  children: ReactNode;
  /** Ниже этого размера не ужимаем — дальше обычный перенос. */
  minPx?: number;
  sx?: SxProps<Theme>;
  /** Семантический тег (h1, p, span…); по умолчанию div. */
  component?: ElementType;
  [key: string]: unknown;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      el.style.fontSize = '';
      el.style.whiteSpace = '';
      const base = parseFloat(getComputedStyle(el).fontSize) || 16;
      const { scrollWidth, clientWidth } = el;
      if (clientWidth === 0 || scrollWidth <= clientWidth) return;
      // Небольшой запас, чтобы округление не оставило хвост под overflow.
      const wanted = Math.floor((clientWidth / scrollWidth) * base * 100) / 100 - 0.2;
      if (wanted >= minPx) {
        el.style.fontSize = `${wanted}px`;
      } else {
        el.style.fontSize = `${minPx}px`;
        el.style.whiteSpace = 'normal';
      }
    };
    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    if (el.parentElement) ro?.observe(el.parentElement);
    return () => ro?.disconnect();
  }, [children, minPx]);

  return (
    <Box
      ref={ref}
      component={component}
      {...rest}
      sx={[{ minWidth: 0, whiteSpace: 'nowrap' }, ...(Array.isArray(sx) ? sx : [sx])]}
    >
      {children}
    </Box>
  );
}
