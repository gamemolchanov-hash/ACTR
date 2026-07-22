/**
 * Hero banner slide data (FBG-426).
 *
 * Kept as an array so more banners can be added later without touching the
 * component. With a single slide `HeroBanner` renders a static banner (no
 * embla loop/autoplay, no pagination dots); add a second entry here and the
 * autoplaying carousel with dots comes back automatically.
 *
 * Copy comes from the `hero.*` i18n keys (EN/TR) via the passed `t` — never
 * hardcoded user-facing strings.
 */
export interface HeroSlide {
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

export function buildHeroSlides(t: (key: string) => string): HeroSlide[] {
  return [
    {
      id: 'slide-1',
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
    },
  ];
}
