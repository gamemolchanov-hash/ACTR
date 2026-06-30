'use client';

import { useCallback, useEffect, useState } from 'react';
import { Box, Typography, Button } from '@mui/material';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { palette } from '@/lib/theme';

interface HeroSlide {
  id: string;
  desktopImage: string;
  mobileImage: string;
  title: string;
  subtitle: string;
  ctaText: string;
  ctaHref: string;
  card?: {
    title: string;
    description: string;
    ctaText: string;
    ctaHref: string;
  };
}

export function HeroBanner() {
  const t = useTranslations();

  const HERO_SLIDES: HeroSlide[] = Array.from({ length: 5 }, (_, i) => ({
    id: `slide-${i + 1}`,
    desktopImage: '/hero/hero-desktop.png',
    mobileImage: '/hero/hero-mobile.png',
    title: 'AMERICAN CREATOR',
    subtitle: t('hero.subtitle'),
    ctaText: t('hero.cta'),
    ctaHref: '/catalog',
    card: {
      title: 'FRAMEWORK GEL & ACRYLATE GEL',
      description: t('hero.cardDescription'),
      ctaText: t('hero.cardCta'),
      ctaHref: '/catalog',
    },
  }));

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [
    Autoplay({ delay: 5000, stopOnInteraction: false, stopOnMouseEnter: true }),
  ]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onSelect]);

  const scrollTo = useCallback((index: number) => emblaApi?.scrollTo(index), [emblaApi]);

  return (
    <Box sx={{ position: 'relative', overflow: 'hidden' }}>
      {/* Embla viewport */}
      <Box ref={emblaRef} sx={{ overflow: 'hidden' }}>
        <Box sx={{ display: 'flex' }}>
          {HERO_SLIDES.map((slide) => (
            <Box
              key={slide.id}
              sx={{
                flex: '0 0 100%',
                minWidth: 0,
                position: 'relative',
              }}
            >
              {/* Banner image — desktop */}
              <Box
                component="img"
                src={slide.desktopImage}
                alt=""
                sx={{
                  display: { xs: 'none', md: 'block' },
                  width: '100%',
                  height: 'auto',
                  maxWidth: 1300,
                  mx: 'auto',
                }}
              />
              {/* Banner image — mobile */}
              <Box
                component="img"
                src={slide.mobileImage}
                alt=""
                sx={{
                  display: { xs: 'block', md: 'none' },
                  width: '100%',
                  height: 'auto',
                }}
              />

              {/* Text overlay — bottom-left */}
              <Box
                sx={{
                  position: 'absolute',
                  bottom: { xs: 24, sm: 40, md: 60, lg: 80 },
                  left: { xs: 16, sm: 24, md: 0 },
                  right: { xs: 16, sm: 'auto' },
                  maxWidth: { xs: '100%', md: 500 },
                  // Center within max-width container
                  ...(typeof window !== 'undefined' ? {} : {}),
                  ml: { md: 'max(16px, calc((100vw - 1300px) / 2 + 32px))' },
                }}
              >
                <Typography
                  variant="h1"
                  sx={{
                    fontSize: { xs: 24, sm: 30, md: 36, lg: 42 },
                    mb: 1,
                    textShadow: '0 1px 8px rgba(255,255,255,0.6)',
                  }}
                >
                  {slide.title}
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    fontSize: { xs: 13, sm: 15, md: 17 },
                    lineHeight: '24px',
                    mb: { xs: 2, md: 3 },
                  }}
                >
                  {slide.subtitle}
                </Typography>
                <Button
                  component={Link}
                  href={slide.ctaHref}
                  variant="contained"
                  color="primary"
                  sx={{
                    borderRadius: '10px',
                    px: { xs: 3, md: 4 },
                    py: { xs: 1.2, md: 1.5 },
                    fontSize: { xs: 14, md: 18 },
                    textTransform: 'none',
                  }}
                >
                  {slide.ctaText}
                </Button>
              </Box>

              {/* Info card — center */}
              {slide.card && (
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: { xs: 'auto', md: 60, lg: 80 },
                    top: { xs: 'auto' },
                    left: '50%',
                    transform: { md: 'translateX(-10%)' },
                    display: { xs: 'none', md: 'block' },
                    width: { md: 320, lg: 360 },
                    bgcolor: 'rgba(255,255,255,0.92)',
                    borderRadius: '16px',
                    border: `1px solid ${palette.primaryLight}`,
                    p: { md: 2.5, lg: 3 },
                    boxShadow: '0 4px 24px rgba(51,74,159,0.08)',
                    zIndex: 2,
                  }}
                >
                  <Typography
                    sx={{
                      fontWeight: 500,
                      fontSize: { md: 16, lg: 18 },
                      textTransform: 'uppercase',
                      color: palette.primary,
                      mb: 1.5,
                    }}
                  >
                    {slide.card.title}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2.5, lineHeight: '20px' }}>
                    {slide.card.description}
                  </Typography>
                  <Button
                    component={Link}
                    href={slide.card.ctaHref}
                    variant="contained"
                    color="primary"
                    sx={{
                      borderRadius: '10px',
                      textTransform: 'none',
                      fontSize: 14,
                      px: 3,
                      py: 1.2,
                    }}
                  >
                    {slide.card.ctaText}
                  </Button>
                </Box>
              )}
            </Box>
          ))}
        </Box>
      </Box>

      {/* Pagination dots */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          gap: 1,
          py: 2.5,
        }}
      >
        {HERO_SLIDES.map((_, i) => (
          <Box
            key={i}
            onClick={() => scrollTo(i)}
            sx={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              bgcolor: i === selectedIndex ? palette.primary : palette.primaryLight,
              cursor: 'pointer',
              transition: 'background-color 0.3s',
              '&:hover': {
                bgcolor: i === selectedIndex ? palette.primary : '#b0bce0',
              },
            }}
          />
        ))}
      </Box>
    </Box>
  );
}
