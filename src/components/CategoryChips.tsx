'use client';

import { Box } from '@mui/material';
import { palette } from '@/lib/theme';
import { categoryShortName } from '@/lib/category-short-names';

const fontMain = 'LiraFix, "Futura PT", "Futura PT Fallback", "Ubuntu", Arial, sans-serif';

export interface CategoryChipsProps {
  categories: Array<{ id: string; slug: string; name: string }>;
  /** Активная категория; undefined — «Все». */
  activeSlug?: string;
  allLabel: string;
  onSelect: (slug: string | undefined) => void;
}

/**
 * Ряд чипов категорий мобильного каталога (образец — forza-brava.com): «Все» +
 * категории короткими именами в одну строку с горизонтальной прокруткой.
 * Активная — залитая пилюля, остальные — разрежённый капс.
 */
export function CategoryChips({ categories, activeSlug, allLabel, onSelect }: CategoryChipsProps) {
  const items: Array<{ key: string; slug: string | undefined; label: string }> = [
    { key: 'all', slug: undefined, label: allLabel },
    ...categories.map((c) => ({ key: c.id, slug: c.slug, label: categoryShortName(c) })),
  ];
  return (
    <Box
      role="group"
      data-testid="sf-catalog-category-chips"
      sx={{
        // Одна строка с горизонтальной прокруткой, как у forza-brava.com (владелец 21.09):
        // полоса скролла скрыта, край страницы не обрезает крайние чипы.
        display: 'flex',
        flexWrap: 'nowrap',
        gap: 0.5,
        alignItems: 'center',
        overflowX: 'auto',
        mx: -2,
        px: 2,
        scrollbarWidth: 'none',
        '&::-webkit-scrollbar': { display: 'none' },
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {items.map((it) => {
        const active = it.slug === activeSlug;
        return (
          <Box
            key={it.key}
            component="button"
            type="button"
            data-testid="sf-catalog-category-chip"
            data-slug={it.slug ?? 'all'}
            aria-pressed={active}
            onClick={() => onSelect(it.slug)}
            sx={{
              height: 36,
              px: 1.5,
              flexShrink: 0,
              borderRadius: '999px',
              border: 'none',
              bgcolor: active ? palette.primary : 'transparent',
              color: active ? 'white' : palette.primaryLight,
              fontFamily: fontMain,
              fontSize: 13,
              fontWeight: 500,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              cursor: 'pointer',
              transition: 'background-color .15s, color .15s',
            }}
          >
            {it.label}
          </Box>
        );
      })}
    </Box>
  );
}
