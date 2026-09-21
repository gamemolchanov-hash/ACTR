'use client';

/**
 * Мобильная раскладка списков личного кабинета (regress 25.08.2026, mobileAudit):
 * таблицы кабинета аффилиата на 390 px были шире экрана (до 792 px), а список
 * «Мои заказы» — 723 px (FBG-628), и скроллились внутри контейнера — с телефона
 * не видно сумм и статусов. На xs строки рендерятся карточками в стиле витрины
 * (bgLight, radius 20), таблица остаётся с sm. Якоря `data-testid` у карточек
 * те же, что у строк таблицы.
 */

import type { ReactNode } from 'react';
import { Box, Stack, Typography, useMediaQuery } from '@mui/material';
import { palette } from '@/lib/theme';

export const fontMain = 'LiraFix, "Futura PT", "Futura PT Fallback", Helvetica, sans-serif';
export const fontBody = '"Open Sans", Helvetica, sans-serif';

/** Телефон (MUI xs, < 600 px). В SSR/jsdom без matchMedia — false (таблица). */
export function useIsXs(): boolean {
  return useMediaQuery('(max-width:599.95px)', { noSsr: true });
}

export function MobileCard({
  children,
  testId,
  data,
  onClick,
}: {
  children: ReactNode;
  testId: string;
  data?: Record<string, string>;
  /** Карточка-строка ведёт на свою страницу (список заказов ЛК) — как строка таблицы. */
  onClick?: () => void;
}) {
  return (
    <Box
      data-testid={testId}
      {...data}
      onClick={onClick}
      sx={{
        bgcolor: palette.bgLight,
        borderRadius: '20px',
        p: 2,
        ...(onClick ? { cursor: 'pointer' } : null),
      }}
    >
      {children}
    </Box>
  );
}

/** Пара «подпись / значение» в карточке; strong — акцент суммы (шрифт заголовков). */
export function MobileMeta({
  label,
  value,
  strong,
  testId,
  align = 'left',
}: {
  label: string;
  value: ReactNode;
  strong?: boolean;
  testId?: string;
  align?: 'left' | 'right';
}) {
  return (
    <Box sx={{ minWidth: 0, textAlign: align }}>
      <Typography sx={{ fontFamily: fontBody, fontSize: 12, color: palette.primaryLight }}>
        {label}
      </Typography>
      <Typography
        data-testid={testId}
        sx={{
          fontFamily: strong ? fontMain : fontBody,
          fontSize: strong ? 18 : 14,
          fontWeight: strong ? 600 : 400,
          color: palette.primary,
          whiteSpace: 'nowrap',
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}

export function MobileCardRow({ children }: { children: ReactNode }) {
  return (
    <Stack direction="row" justifyContent="space-between" spacing={1.5} sx={{ mt: 1.5 }}>
      {children}
    </Stack>
  );
}
