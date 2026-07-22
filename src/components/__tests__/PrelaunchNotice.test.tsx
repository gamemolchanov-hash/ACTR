/**
 * FBG-416 — the pre-launch notice renders all copy from `prelaunch.*` i18n keys
 * (no hardcoded strings) and links back to the still-open catalog.
 */
import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import PrelaunchNotice from '../PrelaunchNotice';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, ...props }: { children?: ReactNode; [k: string]: unknown }) => (
    <a {...props}>{children}</a>
  ),
}));

describe('PrelaunchNotice', () => {
  it('renders title, message and a catalog CTA from translation keys', () => {
    render(<PrelaunchNotice />);
    expect(screen.getByText('prelaunch.title')).toBeTruthy();
    expect(screen.getByText('prelaunch.message')).toBeTruthy();
    const cta = screen.getByText('prelaunch.cta').closest('a');
    expect(cta).toBeTruthy();
    expect(cta?.getAttribute('href')).toBe('/catalog');
  });
});
