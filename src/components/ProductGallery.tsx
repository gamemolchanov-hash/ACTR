'use client';

/**
 * Инлайн-галерея карточки товара (как на forza-brava.com): фото листаются
 * свайпом прямо на странице, без превьюшек — под картинкой точки «сколько
 * фото / на каком мы». Тап/клик по фото открывает полноэкранный просмотр
 * (FullscreenGallery), индекс у них общий.
 *
 * Свайп — нативный CSS scroll-snap (ни JS-жестов, ни библиотек): браузерная
 * инерция, `scroll-snap-stop: always` — один свайп = один слайд (быстрый флик
 * не пролетает несколько). Активный индекс читается из onScroll; точки
 * скроллят трек к слайду.
 */

import { useEffect, useRef } from 'react';
import { Box, Typography } from '@mui/material';
import { palette } from '@/lib/theme';
import { imgDetail } from '@/lib/image-url';
import type { GalleryImage } from './FullscreenGallery';

/** Подписи ARIA (для ru/en витрины приходят из next-intl; дефолт — русский) */
export interface ProductGalleryLabels {
  /** «Фото товара» — префикс к названию для региона карусели */
  region: string;
  carousel: string;
  dots: string;
  /** «Фото» — префикс к номеру точки */
  photo: string;
}

const DEFAULT_LABELS: ProductGalleryLabels = {
  region: 'Фото товара',
  carousel: 'карусель',
  dots: 'Выбор фото',
  photo: 'Фото',
};

export interface ProductGalleryProps {
  images: GalleryImage[];
  labels?: Partial<ProductGalleryLabels>;
  index: number;
  alt: string;
  /** Что показать, когда фото нет (артикул) */
  emptyLabel?: string;
  onIndexChange: (index: number) => void;
  onOpen: () => void;
}

const slideIndexOf = (track: HTMLDivElement) =>
  track.clientWidth > 0 ? Math.round(track.scrollLeft / track.clientWidth) : 0;

export function ProductGallery({
  images,
  index,
  alt,
  emptyLabel,
  onIndexChange,
  onOpen,
  labels: labelsProp,
}: ProductGalleryProps) {
  const labels = { ...DEFAULT_LABELS, ...labelsProp };
  const trackRef = useRef<HTMLDivElement>(null);
  const count = images.length;

  // Индекс поменяли снаружи (полноэкранный просмотр) — трек догоняет мгновенно:
  // он за модалкой, анимировать нечего, а плавный скролл слал бы промежуточные
  // индексы обратно в модалку и дёргал её ленту.
  useEffect(() => {
    const track = trackRef.current;
    if (!track || slideIndexOf(track) === index) return;
    track.scrollTo?.({ left: index * track.clientWidth, behavior: 'auto' });
  }, [index]);

  const handleScroll = () => {
    const track = trackRef.current;
    if (!track) return;
    const i = Math.min(count - 1, Math.max(0, slideIndexOf(track)));
    if (i !== index) onIndexChange(i);
  };

  // Точка: только плавный скролл — индекс придёт из onScroll, когда доедем
  const scrollToSlide = (i: number) => {
    const track = trackRef.current;
    track?.scrollTo?.({ left: i * track.clientWidth, behavior: 'smooth' });
  };

  const frameSx = {
    bgcolor: palette.bgLight,
    borderRadius: '20px',
    height: { xs: 350, md: 612 },
    overflow: 'hidden',
  } as const;

  if (count === 0) {
    return (
      <Box sx={{ ...frameSx, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography sx={{ color: palette.primaryLight, fontSize: 18 }}>{emptyLabel}</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box
        ref={trackRef}
        onScroll={handleScroll}
        role="region"
        aria-roledescription={labels.carousel}
        aria-label={`${labels.region} ${alt}`}
        sx={{
          ...frameSx,
          display: 'flex',
          overflowX: 'auto',
          overflowY: 'hidden',
          scrollSnapType: 'x mandatory',
          overscrollBehaviorX: 'contain',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
          cursor: 'zoom-in',
        }}
      >
        {images.map((img, i) => (
          <Box
            key={img.id}
            onClick={onOpen}
            sx={{
              flex: '0 0 100%',
              height: '100%',
              scrollSnapAlign: 'center',
              scrollSnapStop: 'always',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Box
              component="img"
              src={imgDetail(img.file_path)}
              alt={count > 1 ? `${alt} — ${i + 1}` : alt}
              // Первое фото — LCP, грузим сразу; остальные по мере надобности
              loading={i > 0 ? 'lazy' : undefined}
              fetchPriority={i === 0 ? 'high' : undefined}
              draggable={false}
              sx={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain', userSelect: 'none' }}
            />
          </Box>
        ))}
      </Box>

      {count > 1 && (
        <Box
          role="tablist"
          aria-label={labels.dots}
          sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}
        >
          {images.map((img, i) => {
            const active = i === index;
            return (
              // Точка 6px, но зона нажатия ≥32px (WCAG 2.5.8): кнопка — хит-зона,
              // видимая точка — декоративный span внутри
              <Box
                key={img.id}
                component="button"
                type="button"
                role="tab"
                aria-label={`${labels.photo} ${i + 1}`}
                aria-selected={active}
                aria-current={active || undefined}
                onClick={() => scrollToSlide(i)}
                sx={{
                  height: 32,
                  minWidth: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  p: 0,
                  border: 0,
                  bgcolor: 'transparent',
                  cursor: 'pointer',
                }}
              >
                <Box
                  component="span"
                  aria-hidden="true"
                  sx={{
                    display: 'block',
                    height: 6,
                    width: active ? 16 : 6,
                    borderRadius: 3,
                    bgcolor: active ? palette.primary : 'rgba(51,74,159,0.2)',
                    transition: 'width 0.3s, background-color 0.3s',
                    'button:hover > &': {
                      bgcolor: active ? palette.primary : 'rgba(51,74,159,0.4)',
                    },
                  }}
                />
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
