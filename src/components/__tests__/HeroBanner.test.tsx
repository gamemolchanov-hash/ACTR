/**
 * FBG-426 — the hero banner is a real carousel only with 2+ slides.
 *
 * With a single slide it must be static: no embla loop, no Autoplay plugin and
 * no pagination dots. Adding a second slide brings the carousel (loop, autoplay,
 * dots) back. Both branches are driven by mocking the slide data source.
 */
import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import type { HeroSlide } from '@/lib/hero-slides';

// Toggleable slide data. Tests set `slides.value` before rendering.
const slides = vi.hoisted(() => {
  const make = (id: string): HeroSlide => ({
    id,
    desktopImage: '/hero/hero-desktop.png',
    mobileImage: '/hero/hero-mobile.png',
    title: 'AMERICAN CREATOR',
    subtitle: 'hero.subtitle',
    ctaText: 'hero.cta',
    ctaHref: '/catalog',
    card: {
      title: 'FRAMEWORK GEL & ACRYLATE GEL',
      description: 'hero.cardDescription',
      ctaText: 'hero.cardCta',
      ctaHref: '/catalog',
    },
  });
  return { value: [make('slide-1')], make };
});
vi.mock('@/lib/hero-slides', () => ({
  buildHeroSlides: () => slides.value,
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, ...props }: { children?: ReactNode; [k: string]: unknown }) => (
    <a {...props}>{children}</a>
  ),
}));

// Spy on carousel init so we can assert whether embla loops / Autoplay runs.
const emblaSpy = vi.hoisted(() => vi.fn());
vi.mock('embla-carousel-react', () => ({
  default: (options: unknown, plugins: unknown) => {
    emblaSpy(options, plugins);
    // [ref, api]; a no-op callback ref, no api so effects short-circuit.
    return [() => {}, undefined];
  },
}));

const autoplaySpy = vi.hoisted(() => vi.fn((..._args: unknown[]) => ({ name: 'autoplay' })));
vi.mock('embla-carousel-autoplay', () => ({
  default: (...args: unknown[]) => autoplaySpy(...args),
}));

import { HeroBanner } from '../HeroBanner';

beforeEach(() => {
  slides.value = [slides.make('slide-1')];
  emblaSpy.mockClear();
  autoplaySpy.mockClear();
});

afterEach(() => {
  cleanup();
});

describe('HeroBanner', () => {
  it('single slide: static banner — no autoplay, no loop, no pagination dots', () => {
    render(<HeroBanner />);

    // Banner content still renders (CTA from the hero.* keys).
    expect(screen.getByText('hero.cta')).toBeTruthy();

    // No Autoplay plugin instantiated, embla initialised without loop or plugins.
    expect(autoplaySpy).not.toHaveBeenCalled();
    expect(emblaSpy).toHaveBeenCalledWith({ loop: false }, []);

    // No pagination dots.
    expect(screen.queryByTestId('hero-pagination')).toBeNull();
  });

  it('two slides: carousel comes back — loop, autoplay and pagination dots', () => {
    slides.value = [slides.make('slide-1'), slides.make('slide-2')];

    render(<HeroBanner />);

    expect(autoplaySpy).toHaveBeenCalledTimes(1);
    const [options, plugins] = emblaSpy.mock.calls[0];
    expect(options).toEqual({ loop: true });
    expect(Array.isArray(plugins) && plugins.length).toBe(1);

    // Pagination dots container with one dot per slide.
    const dots = screen.getByTestId('hero-pagination');
    expect(dots.childElementCount).toBe(2);
  });
});
