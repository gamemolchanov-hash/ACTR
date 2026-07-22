/**
 * FBG-426 — the home page shows the pre-launch notice instead of the banner
 * while `PRELAUNCH` is on, mirroring the basket/checkout gate (FBG-416). When
 * the flag is flipped off at launch the hero banner renders as before.
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

vi.mock('@/components/HeroBanner', () => ({
  HeroBanner: () => <div data-testid="hero-banner" />,
}));

vi.mock('@/components/PrelaunchNotice', () => ({
  default: () => <div data-testid="prelaunch-notice" />,
}));

import HomePage from './page';

afterEach(() => {
  cleanup();
});

describe('HomePage — pre-launch gate', () => {
  it('PRELAUNCH=true: shows the pre-launch notice, not the banner', () => {
    prelaunch.value = true;
    render(<HomePage />);
    expect(screen.getByTestId('prelaunch-notice')).toBeTruthy();
    expect(screen.queryByTestId('hero-banner')).toBeNull();
  });

  it('PRELAUNCH=false: shows the hero banner, not the notice', () => {
    prelaunch.value = false;
    render(<HomePage />);
    expect(screen.getByTestId('hero-banner')).toBeTruthy();
    expect(screen.queryByTestId('prelaunch-notice')).toBeNull();
  });
});
