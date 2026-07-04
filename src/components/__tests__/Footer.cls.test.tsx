/**
 * FBG-229 — CLS: the footer must not shift when its images load.
 *
 * Every <img> in the footer needs explicit width/height attributes so the
 * browser reserves the aspect-ratio box before the bitmap arrives. The logos
 * (logo-white.png, intrinsic 480×114) previously used height:'auto' with no
 * intrinsic size → the footer jumped down as they loaded (CLS 0.287).
 */
import type { ReactNode } from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { vi } from 'vitest';
import { Footer } from '../Footer';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, ...props }: { children?: ReactNode; [k: string]: unknown }) => (
    <a {...props}>{children}</a>
  ),
}));

describe('Footer CLS (FBG-229)', () => {
  it('gives every footer image explicit width and height attributes', () => {
    const { container } = render(<Footer />);
    const imgs = Array.from(container.querySelectorAll('img'));

    expect(imgs.length).toBeGreaterThan(0);
    for (const img of imgs) {
      const w = img.getAttribute('width');
      const h = img.getAttribute('height');
      expect(w, `missing width on ${img.getAttribute('src')}`).toBeTruthy();
      expect(h, `missing height on ${img.getAttribute('src')}`).toBeTruthy();
      // A literal "auto" attribute would defeat aspect-ratio reservation.
      expect(h).not.toBe('auto');
      expect(Number(w)).toBeGreaterThan(0);
      expect(Number(h)).toBeGreaterThan(0);
    }
  });

  it('reserves the correct aspect ratio for both logos (intrinsic 480×114)', () => {
    const { container } = render(<Footer />);
    const logos = Array.from(
      container.querySelectorAll('img[src="/icons/logo-white.png"]'),
    );

    // Desktop + mobile variants are both in the DOM (toggled via CSS display).
    expect(logos.length).toBe(2);
    for (const logo of logos) {
      expect(logo.getAttribute('width')).toBe('480');
      expect(logo.getAttribute('height')).toBe('114');
    }
  });
});
