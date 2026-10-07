/**
 * FBG-426 — the home page shows the pre-launch notice instead of the banner
 * while `PRELAUNCH` is on, mirroring the basket/checkout gate (FBG-416). When
 * the flag is flipped off at launch the catalog renders (home = catalog, as on ACRU/ACSTORE).
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

// Toggleable mock of the single PRELAUNCH constant (getter keeps the ESM
// live-binding honest so the page reads the current value at render time).
const prelaunch = vi.hoisted(() => ({ value: true }));
vi.mock('@/lib/prelaunch', () => ({
  get PRELAUNCH() {
    return prelaunch.value;
  },
}));

vi.mock('@/components/CatalogView', () => ({
  CatalogView: () => <div data-testid="catalog-view" />,
}));

vi.mock('@/components/BannerSlot', () => ({
  BannerSlot: () => <div data-testid="banner-slot" />,
}));

vi.mock('@/components/PrelaunchNotice', () => ({
  default: () => <div data-testid="prelaunch-notice" />,
}));

import HomePage from './page';

afterEach(() => {
  cleanup();
});

describe('HomePage — pre-launch gate', () => {
  it('PRELAUNCH=true: shows the pre-launch notice, not the catalog', () => {
    prelaunch.value = true;
    render(<HomePage />);
    expect(screen.getByTestId('prelaunch-notice')).toBeTruthy();
    expect(screen.queryByTestId('catalog-view')).toBeNull();
  });

  it('PRELAUNCH=false: shows the catalog, not the notice', () => {
    prelaunch.value = false;
    render(<HomePage />);
    expect(screen.getByTestId('catalog-view')).toBeTruthy();
    expect(screen.queryByTestId('prelaunch-notice')).toBeNull();
  });
});
