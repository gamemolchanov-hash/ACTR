/**
 * FBG-410 — ticari elektronik ileti opt-ins on the registration form.
 *
 * The canon is blunt about what must NOT happen (§9): no box may be pre-ticked
 * and consent may never be a condition of registering. And because ARM records
 * register-time consents best-effort — it answers 200 even when the write blew
 * up — a choice the shopper made can silently vanish, so the form reconciles
 * against the authoritative GET after logging in.
 */
import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';

const activeChannels = vi.hoisted(() => ({ value: ['email', 'sms', 'arama'] as string[] }));
const routerSpy = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
const authApi = vi.hoisted(() => ({
  register: vi.fn(),
  login: vi.fn(),
  getConsents: vi.fn(),
  updateConsents: vi.fn(),
}));
const setAuth = vi.hoisted(() => vi.fn());

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

vi.mock('@/lib/auth-context', () => ({ useAuth: () => ({ setAuth }) }));

vi.mock('@/lib/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/auth')>()),
  register: authApi.register,
  login: authApi.login,
  getConsents: authApi.getConsents,
  updateConsents: authApi.updateConsents,
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

import RegisterPage from './page';

const EMPTY_STATE = {
  email: null,
  arama: null,
  mesaj: null,
  mesaj_sms: null,
  mesaj_whatsapp: null,
};

/** Every checkbox whose visible label is a canon §15 declaration. */
const consentBoxes = () =>
  (Array.from(document.querySelectorAll('input[type="checkbox"]')) as HTMLInputElement[]).filter(
    (el) => (el.closest('label')?.textContent ?? '').startsWith('ticariIleti.'),
  );

const labelOf = (el: HTMLInputElement) => el.closest('label')!.textContent;

const consentBox = (channel: string) =>
  consentBoxes().find((el) => labelOf(el) === `ticariIleti.${channel}Label`)!;

const input = (selector: string) => document.querySelector(selector) as HTMLInputElement;

function fillRequiredFields(phone = '5551234567') {
  fireEvent.change(input('input[placeholder="auth.namePlaceholder"]'), {
    target: { value: 'Ada Yılmaz' },
  });
  fireEvent.change(input('input[type="email"]'), { target: { value: ' Ada@Example.com ' } });
  fireEvent.change(input('input[placeholder="+90 (5__) ___ __ __"]'), {
    target: { value: phone },
  });
  const passwords = Array.from(
    document.querySelectorAll('input[type="password"]'),
  ) as HTMLInputElement[];
  fireEvent.change(passwords[0], { target: { value: 'secret123' } });
  fireEvent.change(passwords[1], { target: { value: 'secret123' } });
  // Math.random is pinned to 0 below, so the captcha is always "1 + 1".
  fireEvent.change(input('input[placeholder="?"]'), { target: { value: '2' } });
}

const submitButton = () =>
  Array.from(document.querySelectorAll('button')).find((b) => b.type === 'submit')!;

let now = 1_700_000_000_000;

beforeEach(() => {
  activeChannels.value = ['email', 'sms', 'arama'];
  routerSpy.push.mockReset();
  routerSpy.replace.mockReset();
  setAuth.mockReset();
  authApi.register.mockReset().mockResolvedValue({ message: 'ok' });
  authApi.login
    .mockReset()
    .mockResolvedValue({ token: 'tok', customer: { id: 'c1', name: 'Ada' } });
  authApi.getConsents.mockReset();
  authApi.updateConsents.mockReset();
  vi.spyOn(Math, 'random').mockReturnValue(0);
  now = 1_700_000_000_000;
  vi.spyOn(Date, 'now').mockImplementation(() => now);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

/** Fills the form, clears the anti-bot time gate and submits. */
function submit() {
  fillRequiredFields();
  fireEvent.click(document.querySelector('input[type="checkbox"]')!); // Üyelik Sözleşmesi
  now += 5000;
  fireEvent.click(submitButton());
}

describe('registration consent checkboxes (canon §15 / §9)', () => {
  it('renders exactly the active channels, none of them pre-ticked', () => {
    render(<RegisterPage />);

    expect(consentBoxes().map(labelOf)).toEqual([
      'ticariIleti.emailLabel',
      'ticariIleti.smsLabel',
      'ticariIleti.aramaLabel',
    ]);
    expect(consentBoxes().every((el) => el.checked)).toBe(false);
    expect(consentBoxes().some((el) => el.checked)).toBe(false);
  });

  it('renders no consent section when no channel is live', () => {
    activeChannels.value = [];
    render(<RegisterPage />);

    expect(consentBoxes()).toHaveLength(0);
    expect(screen.queryByText('ticariIleti.heading')).toBeNull();
  });

  it('never blocks the submit button on a consent choice', () => {
    render(<RegisterPage />);
    fillRequiredFields();
    fireEvent.click(document.querySelector('input[type="checkbox"]')!);

    expect(submitButton().disabled).toBe(false);
  });

  it('registers with an empty consent list and skips the reconcile', async () => {
    render(<RegisterPage />);
    submit();

    await waitFor(() => expect(routerSpy.push).toHaveBeenCalledWith('/'));
    expect(authApi.register).toHaveBeenCalledWith(
      expect.objectContaining({ consents: [], locale: 'tr' }),
    );
    expect(authApi.getConsents).not.toHaveBeenCalled();
  });

  it('sends the ticked channel as a MESAJ/SMS grant', async () => {
    authApi.getConsents.mockResolvedValue({
      text_version: 'KK-ET-TEI-2026-V2',
      consents: { ...EMPTY_STATE, mesaj_sms: 'onay' },
    });
    render(<RegisterPage />);
    fireEvent.click(consentBox('sms'));
    submit();

    await waitFor(() => expect(routerSpy.push).toHaveBeenCalledWith('/'));
    expect(authApi.register).toHaveBeenCalledWith(
      expect.objectContaining({
        consents: [{ channel: 'mesaj', sub_channel: 'sms', status: 'onay' }],
        locale: 'tr',
      }),
    );
    expect(authApi.updateConsents).not.toHaveBeenCalled();
  });

  it('re-sends only the grants ARM failed to record', async () => {
    authApi.getConsents.mockResolvedValue({
      text_version: 'KK-ET-TEI-2026-V2',
      consents: { ...EMPTY_STATE, email: 'onay' },
    });
    authApi.updateConsents.mockResolvedValue({
      text_version: 'KK-ET-TEI-2026-V2',
      consents: { ...EMPTY_STATE, email: 'onay', mesaj_sms: 'onay' },
    });
    render(<RegisterPage />);
    fireEvent.click(consentBox('email'));
    fireEvent.click(consentBox('sms'));
    submit();

    await waitFor(() => expect(authApi.updateConsents).toHaveBeenCalled());
    expect(authApi.updateConsents).toHaveBeenCalledWith(
      [{ channel: 'mesaj', sub_channel: 'sms', status: 'onay' }],
      'tr',
    );
    expect(routerSpy.push).toHaveBeenCalledWith('/');
  });

  it.each([
    [
      'the authoritative read fails',
      () => authApi.getConsents.mockRejectedValue(new Error('BFF down')),
    ],
    [
      'the re-send fails',
      () => {
        authApi.getConsents.mockResolvedValue({
          text_version: 'KK-ET-TEI-2026-V2',
          consents: EMPTY_STATE,
        });
        authApi.updateConsents.mockRejectedValue(new Error('BFF down'));
      },
    ],
  ])('sends the new member to their preferences when %s', async (_label, arrange) => {
    arrange();
    render(<RegisterPage />);
    fireEvent.click(consentBox('email'));
    submit();

    await waitFor(() => expect(routerSpy.push).toHaveBeenCalledWith('/account/preferences'));
    // The account exists and the member is signed in — this is not a failed
    // registration and must not be reported as one.
    expect(setAuth).toHaveBeenCalled();
    expect(screen.queryByText(/Registration failed/i)).toBeNull();
  });

  it('freezes the form while the request is in flight, so ARM cannot record a stale choice', async () => {
    // The whole register → login → reconcile chain reads the form once, up
    // front; if a box stayed clickable the shopper could untick a consent that
    // is already on its way to ARM (or tick one that will never be sent).
    let finishRegister: (v: unknown) => void = () => {};
    authApi.register.mockReturnValue(
      new Promise((resolve) => {
        finishRegister = resolve;
      }),
    );
    authApi.getConsents.mockResolvedValue({
      text_version: 'KK-ET-TEI-2026-V2',
      consents: { ...EMPTY_STATE, email: 'onay' },
    });
    render(<RegisterPage />);
    fireEvent.click(consentBox('email'));
    submit();

    await waitFor(() => expect(authApi.register).toHaveBeenCalled());
    // Every consent box — and the rest of the form it was given alongside — is
    // inoperable until the chain finishes.
    expect(consentBoxes().every((el) => el.disabled)).toBe(true);
    expect(input('input[type="email"]').disabled).toBe(true);
    expect(input('input[placeholder="+90 (5__) ___ __ __"]').disabled).toBe(true);

    finishRegister({ message: 'ok' });
    await waitFor(() => expect(routerSpy.push).toHaveBeenCalledWith('/'));
    expect(consentBoxes().some((el) => el.disabled)).toBe(false);
    // What ARM got is exactly what was on screen at submit time.
    expect(authApi.register).toHaveBeenCalledWith(
      expect.objectContaining({ consents: [{ channel: 'email', status: 'onay' }] }),
    );
    expect(authApi.updateConsents).not.toHaveBeenCalled();
  });

  it('drops phone grants on an incomplete number instead of failing registration', async () => {
    render(<RegisterPage />);
    fillRequiredFields('555');
    fireEvent.click(consentBox('email'));
    fireEvent.click(consentBox('sms'));
    fireEvent.click(document.querySelector('input[type="checkbox"]')!);
    expect(screen.getByText('ticariIleti.phoneIncomplete')).toBeTruthy();

    authApi.getConsents.mockResolvedValue({
      text_version: 'KK-ET-TEI-2026-V2',
      consents: { ...EMPTY_STATE, email: 'onay' },
    });
    now += 5000;
    fireEvent.click(submitButton());

    await waitFor(() => expect(authApi.register).toHaveBeenCalled());
    expect(authApi.register).toHaveBeenCalledWith(
      expect.objectContaining({ consents: [{ channel: 'email', status: 'onay' }] }),
    );
  });
});
