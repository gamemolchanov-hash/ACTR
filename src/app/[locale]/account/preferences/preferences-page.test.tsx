/**
 * FBG-410 — «İletişim Tercihleri» in the account area.
 *
 * The page owns three awkward truths:
 *   - the state ARM derives is per-contact and can go stale, so it is re-read on
 *     every visit rather than cached;
 *   - a failed POST is only sometimes safe to roll back — ARM writes the events
 *     BEFORE it clears its cache, sends the teyit and re-reads, so a 5xx or a
 *     dropped connection can mean "recorded anyway";
 *   - "all your preferences are withdrawn" (§17) is a claim about the SERVER
 *     state, including channels this UI does not show.
 */
import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';
import type { ArmConsentState } from '@/lib/arm-types';

const activeChannels = vi.hoisted(() => ({ value: ['email', 'sms', 'arama'] as string[] }));
const routerSpy = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
const signOut = vi.hoisted(() => vi.fn());
const auth = vi.hoisted(() => ({
  value: {
    customer: { id: 'c1', name: 'Ada', email: 'ada@example.com', phone: '+90 (555) 123 45 67' },
    loading: false,
  } as { customer: Record<string, unknown> | null; loading: boolean },
}));
const consentsApi = vi.hoisted(() => ({ getConsents: vi.fn(), updateConsents: vi.fn() }));

vi.mock('next-intl', () => ({
  useTranslations: (namespace?: string) => (key: string) =>
    namespace ? `${namespace}.${key}` : key,
  useLocale: () => 'tr',
}));

vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, ...props }: { children?: ReactNode; [k: string]: unknown }) => (
    <a {...props}>{children}</a>
  ),
  useRouter: () => routerSpy,
}));

vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({ ...auth.value, signOut }),
}));

vi.mock('@/lib/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/auth')>()),
  getConsents: consentsApi.getConsents,
  updateConsents: consentsApi.updateConsents,
}));

vi.mock('@/lib/ticari-ileti', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/ticari-ileti')>();
  return {
    ...actual,
    get ACTIVE_CHANNELS() {
      return activeChannels.value;
    },
  };
});

import PreferencesPage from './page';

const EMPTY: ArmConsentState = {
  email: null,
  arama: null,
  mesaj: null,
  mesaj_sms: null,
  mesaj_whatsapp: null,
};
const answer = (over: Partial<ArmConsentState> = {}) => ({
  text_version: 'KK-ET-TEI-2026-V2',
  consents: { ...EMPTY, ...over },
});

const toggle = (channel: string) =>
  (Array.from(document.querySelectorAll('input[type="checkbox"]')) as HTMLInputElement[]).find(
    (el) => el.closest('label')?.textContent === `ticariIleti.${channel}Label`,
  )!;

const httpError = (status: number, code?: string) =>
  Object.assign(new Error(`HTTP ${status}`), { response: { status, data: { code } } });

/** Renders and waits for the initial authoritative read to settle. */
async function renderLoaded() {
  render(<PreferencesPage />);
  await waitFor(() => expect(consentsApi.getConsents).toHaveBeenCalled());
  await waitFor(() => expect(toggle('email')).toBeTruthy());
}

beforeEach(() => {
  activeChannels.value = ['email', 'sms', 'arama'];
  auth.value = {
    customer: { id: 'c1', name: 'Ada', email: 'ada@example.com', phone: '+90 (555) 123 45 67' },
    loading: false,
  };
  routerSpy.push.mockReset();
  routerSpy.replace.mockReset();
  signOut.mockReset();
  consentsApi.getConsents.mockReset().mockResolvedValue(answer());
  consentsApi.updateConsents.mockReset();
});

afterEach(() => cleanup());

describe('access', () => {
  it('bounces a guest to sign-in without asking ARM for anything', async () => {
    auth.value = { customer: null, loading: false };
    render(<PreferencesPage />);

    await waitFor(() => expect(routerSpy.replace).toHaveBeenCalledWith('/login'));
    expect(consentsApi.getConsents).not.toHaveBeenCalled();
  });

  it('shows the "no live channel" notice and asks for nothing when none is live', async () => {
    activeChannels.value = [];
    render(<PreferencesPage />);

    await waitFor(() => expect(screen.getByText('account.prefs.noChannels')).toBeTruthy());
    expect(consentsApi.getConsents).not.toHaveBeenCalled();
  });
});

describe('loading the current state', () => {
  it('renders one switch per live channel, positioned by the server state', async () => {
    consentsApi.getConsents.mockResolvedValue(answer({ email: 'onay', mesaj_sms: 'ret' }));
    await renderLoaded();

    expect(toggle('email').checked).toBe(true);
    expect(toggle('sms').checked).toBe(false);
    expect(toggle('arama').checked).toBe(false);
  });

  it('shows no switch before ARM has answered', async () => {
    let answerNow: (v: unknown) => void = () => {};
    consentsApi.getConsents.mockReturnValue(
      new Promise((resolve) => {
        answerNow = resolve;
      }),
    );
    render(<PreferencesPage />);

    await waitFor(() => expect(consentsApi.getConsents).toHaveBeenCalled());
    // An unknown state painted as "all off" is a position the shopper could act on.
    expect(toggle('email')).toBeUndefined();

    answerNow(answer({ email: 'onay' }));
    await waitFor(() => expect(toggle('email')?.checked).toBe(true));
  });

  it('offers a retry instead of pretending everything is switched off', async () => {
    consentsApi.getConsents.mockRejectedValueOnce(new Error('BFF down'));
    render(<PreferencesPage />);

    await waitFor(() => expect(screen.getByText('account.prefs.loadError')).toBeTruthy());
    expect(toggle('email')).toBeUndefined();

    consentsApi.getConsents.mockResolvedValue(answer({ email: 'onay' }));
    fireEvent.click(screen.getByText('account.prefs.retry'));
    await waitFor(() => expect(toggle('email')?.checked).toBe(true));
  });
});

describe('saving a choice (canon §17)', () => {
  it('withdraws a channel in one click and reports the remaining grants', async () => {
    consentsApi.getConsents.mockResolvedValue(answer({ email: 'onay', arama: 'onay' }));
    consentsApi.updateConsents.mockResolvedValue(answer({ email: 'ret', arama: 'onay' }));
    await renderLoaded();

    fireEvent.click(toggle('email'));

    await waitFor(() => expect(screen.getByText('ticariIleti.channelOff')).toBeTruthy());
    expect(consentsApi.updateConsents).toHaveBeenCalledWith(
      [{ channel: 'email', status: 'ret' }],
      'tr',
    );
    expect(toggle('email').checked).toBe(false);
  });

  it('grants MESAJ through its SMS sub-channel', async () => {
    consentsApi.updateConsents.mockResolvedValue(answer({ mesaj_sms: 'onay' }));
    await renderLoaded();

    fireEvent.click(toggle('sms'));

    await waitFor(() => expect(screen.getByText('ticariIleti.savedMesaj')).toBeTruthy());
    expect(consentsApi.updateConsents).toHaveBeenCalledWith(
      [{ channel: 'mesaj', sub_channel: 'sms', status: 'onay' }],
      'tr',
    );
    expect(toggle('sms').checked).toBe(true);
  });

  it('claims "all withdrawn" only when the server has no grant left', async () => {
    consentsApi.getConsents.mockResolvedValue(answer({ email: 'onay' }));
    consentsApi.updateConsents.mockResolvedValue(answer({ email: 'ret' }));
    await renderLoaded();

    fireEvent.click(toggle('email'));
    await waitFor(() => expect(screen.getByText('ticariIleti.allOff')).toBeTruthy());
  });

  it('does not claim "all withdrawn" while a hidden channel is still granted', async () => {
    consentsApi.getConsents.mockResolvedValue(answer({ email: 'onay' }));
    // WhatsApp is not shown here, but ARM still reports (and honours) its onay.
    consentsApi.updateConsents.mockResolvedValue(answer({ email: 'ret', mesaj_whatsapp: 'onay' }));
    await renderLoaded();

    fireEvent.click(toggle('email'));
    await waitFor(() => expect(screen.getByText('ticariIleti.channelOff')).toBeTruthy());
    expect(screen.queryByText('ticariIleti.allOff')).toBeNull();
  });
});

describe('failed saves', () => {
  it.each([
    ['a rejected payload', httpError(429), 'ticariIleti.saveError'],
    [
      'a missing contact detail',
      httpError(400, 'consent_contact_required'),
      'ticariIleti.contactRequired',
    ],
  ])('rolls the switch back on %s', async (_label, err, message) => {
    consentsApi.updateConsents.mockRejectedValue(err);
    await renderLoaded();

    fireEvent.click(toggle('sms'));

    await waitFor(() => expect(screen.getByText(message)).toBeTruthy());
    expect(toggle('sms').checked).toBe(false);
    // The rejection happened before ARM wrote anything — no need to re-read.
    expect(consentsApi.getConsents).toHaveBeenCalledTimes(1);
  });

  it('re-reads instead of rolling back when the outcome is unknown', async () => {
    consentsApi.updateConsents.mockRejectedValue(httpError(500));
    // ARM appends the events before the step that blew up, so the grant landed.
    consentsApi.getConsents.mockResolvedValueOnce(answer()).mockResolvedValueOnce(
      answer({ mesaj_sms: 'onay' }),
    );
    await renderLoaded();

    fireEvent.click(toggle('sms'));

    await waitFor(() => expect(screen.getByText('ticariIleti.saveError')).toBeTruthy());
    await waitFor(() => expect(consentsApi.getConsents).toHaveBeenCalledTimes(2));
    expect(toggle('sms').checked).toBe(true);
  });

  it('falls back to the retry state when even the re-read fails', async () => {
    consentsApi.updateConsents.mockRejectedValue(new Error('Network Error'));
    consentsApi.getConsents
      .mockResolvedValueOnce(answer())
      .mockRejectedValueOnce(new Error('Network Error'));
    await renderLoaded();

    fireEvent.click(toggle('sms'));

    await waitFor(() => expect(screen.getByText('account.prefs.loadError')).toBeTruthy());
    expect(toggle('sms')).toBeUndefined();
    expect(screen.getByText('account.prefs.retry')).toBeTruthy();
  });

  it('signs out on an expired session', async () => {
    consentsApi.updateConsents.mockRejectedValue(httpError(401));
    await renderLoaded();

    fireEvent.click(toggle('email'));

    await waitFor(() => expect(signOut).toHaveBeenCalled());
    expect(routerSpy.replace).toHaveBeenCalledWith('/login');
  });
});

describe('a profile without a usable phone', () => {
  beforeEach(() => {
    auth.value = {
      customer: { id: 'c1', name: 'Ada', email: 'ada@example.com', phone: null },
      loading: false,
    };
  });

  it('cannot grant the phone channels, and says where to fix it', async () => {
    await renderLoaded();

    expect(toggle('sms').disabled).toBe(true);
    expect(toggle('arama').disabled).toBe(true);
    expect(toggle('email').disabled).toBe(false);
    expect(screen.getByText('account.prefs.phoneMissing')).toBeTruthy();
  });

  it('can still withdraw a phone channel granted earlier (§10)', async () => {
    consentsApi.getConsents.mockResolvedValue(answer({ mesaj_sms: 'onay' }));
    consentsApi.updateConsents.mockResolvedValue(answer());
    await renderLoaded();

    expect(toggle('sms').disabled).toBe(false);
    fireEvent.click(toggle('sms'));

    await waitFor(() =>
      expect(consentsApi.updateConsents).toHaveBeenCalledWith(
        [{ channel: 'mesaj', sub_channel: 'sms', status: 'ret' }],
        'tr',
      ),
    );
  });
});
