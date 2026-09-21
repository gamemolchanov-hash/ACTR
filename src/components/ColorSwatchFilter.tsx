'use client';

import { Box } from '@mui/material';
import { palette } from '@/lib/theme';
import type { ColorGroupFacet } from '@/lib/api';


/** Заливка кружка по ключу группы — два-три оттенка палитры бренда одним градиентом. */
const SWATCHES: Record<string, string> = {
  green_yellow_orange: 'linear-gradient(135deg, #5DB65A 0%, #F2D13B 50%, #F28C28 100%)',
  violet_lilac: 'linear-gradient(135deg, #6E45B0 0%, #C9A7E6 100%)',
  blue: 'linear-gradient(135deg, #1F4FBF 0%, #7FB3FF 100%)',
  red_pink_burgundy: 'linear-gradient(135deg, #7A1F2B 0%, #E63946 50%, #F48FB1 100%)',
  // «Бежевые и базовые»: беж → белый → чёрный (владелец 22.09: в группе и базовые цвета)
  beige_basic: 'linear-gradient(135deg, #D8C4A6 0%, #EBDCC4 30%, #FFFFFF 48%, #FFFFFF 56%, #111111 78%, #000000 100%)',
  nude: 'linear-gradient(135deg, #E7C6B4 0%, #F6E4D9 100%)',
};

export interface ColorSwatchFilterProps {
  groups: ColorGroupFacet[];
  value?: string;
  onChange: (key: string | undefined) => void;
}

/**
 * Фильтр по цветовой группе цветников для телефона: кружки-свотчи с короткой
 * подписью в одну строку (шесть групп умещаются на 360 px). Та же логика, что у
 * чипов `ColorGroupFilter` в сайдбаре: одна группа за раз, повторный тап — сброс.
 */
export function ColorSwatchFilter({ groups, value, onChange }: ColorSwatchFilterProps) {
  if (groups.length === 0) return null;
  return (
    <Box
      role="group"
      data-testid="sf-catalog-color-swatches"
      sx={{
        // Одна строка; на узком экране (< 340 px) прокручивается, как чипы категорий.
        display: 'flex',
        flexWrap: 'nowrap',
        gap: { xs: 1, sm: 2.5 },
        mt: 1.5,
        justifyContent: 'flex-start',
        overflowX: 'auto',
        mx: -2,
        px: 2,
        // Запас под обводку активного кружка (4 px), иначе прокрутка её подрезает.
        py: '6px',
        scrollbarWidth: 'none',
        '&::-webkit-scrollbar': { display: 'none' },
      }}
    >
      {groups.map((g) => {
        const active = g.key === value;
        return (
          <Box
            key={g.key}
            component="button"
            type="button"
            data-testid="sf-catalog-color-swatch"
            data-color-group={g.key}
            aria-pressed={active}
            aria-label={`${g.label} · ${g.count}`}
            title={`${g.label} · ${g.count}`}
            onClick={() => onChange(active ? undefined : g.key)}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 0.5,
              p: 0,
              px: '5px',
              border: 'none',
              bgcolor: 'transparent',
              cursor: 'pointer',
              minWidth: 48,
              flexShrink: 0,
            }}
          >
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: SWATCHES[g.key] ?? palette.bgLight,
                boxShadow: active
                  ? `0 0 0 2px white, 0 0 0 4px ${palette.primary}`
                  : `inset 0 0 0 1px rgba(51,74,159,0.15)`,
                transition: 'box-shadow .15s',
              }}
            />
            {/* Подписи сняты (владелец 22.09: «не отображают реальной картины»); полное
                название группы — в title и aria-label. */}
          </Box>
        );
      })}
    </Box>
  );
}
