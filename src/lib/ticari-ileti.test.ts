/**
 * FBG-410 — ticari elektronik ileti consent logic (canon KK-ET-TEI-2026-V2).
 */
import { describe, it, expect } from 'vitest';
import {
  LAUNCH_CHANNELS,
  buildRegisterConsents,
  classifySaveError,
  hasAnyGrant,
  isPhoneUsableForConsent,
  missingGrants,
  parseActiveChannels,
  stateToToggles,
  statusMessageKey,
  toDecision,
} from './ticari-ileti';
import type { ArmConsentState } from './arm-types';

const state = (over: Partial<ArmConsentState> = {}): ArmConsentState => ({
  email: null,
  arama: null,
  mesaj: null,
  mesaj_sms: null,
  mesaj_whatsapp: null,
  ...over,
});

describe('parseActiveChannels', () => {
  it('falls back to the declared launch scope when unset', () => {
    expect(parseActiveChannels(undefined)).toEqual([...LAUNCH_CHANNELS]);
    expect(LAUNCH_CHANNELS).toEqual(['email', 'sms', 'arama']);
  });

  it.each([
    ['empty', ''],
    ['unknown token', 'telepati'],
    ['separators only', ',,'],
  ])('yields no channels for a %s override (fail-closed, never the default)', (_l, raw) => {
    expect(parseActiveChannels(raw)).toEqual([]);
  });

  it('normalises order and casing, dropping unknown tokens', () => {
    expect(parseActiveChannels(' ARAMA , sms ,email, faks ')).toEqual(['email', 'sms', 'arama']);
  });

  it('enables WhatsApp only when it is named explicitly', () => {
    expect(parseActiveChannels('email,whatsapp')).toEqual(['email', 'whatsapp']);
    expect(parseActiveChannels('email,sms,arama')).not.toContain('whatsapp');
  });
});

describe('toDecision', () => {
  it('maps SMS/WhatsApp onto the MESAJ channel with a sub_channel', () => {
    expect(toDecision('sms', true)).toEqual({
      channel: 'mesaj',
      sub_channel: 'sms',
      status: 'onay',
    });
    // Withdrawal stays on the SUB-channel: a bare `mesaj: ret` is the İYS
    // channel-level unsubscribe and would mute WhatsApp too.
    expect(toDecision('sms', false)).toEqual({
      channel: 'mesaj',
      sub_channel: 'sms',
      status: 'ret',
    });
    expect(toDecision('whatsapp', true)).toEqual({
      channel: 'mesaj',
      sub_channel: 'whatsapp',
      status: 'onay',
    });
  });

  it('sends email/arama without a sub_channel (the BFF schema is strict)', () => {
    expect(toDecision('email', true)).toEqual({ channel: 'email', status: 'onay' });
    expect(toDecision('arama', false)).toEqual({ channel: 'arama', status: 'ret' });
  });
});

describe('buildRegisterConsents', () => {
  const contact = { email: 'ada@example.com', phone: '+90 (555) 123 45 67' };

  it('sends nothing when no box is ticked (§9 — zero opt-ins is normal)', () => {
    expect(buildRegisterConsents({}, contact)).toEqual([]);
    expect(buildRegisterConsents({ email: false, sms: false, arama: false }, contact)).toEqual([]);
  });

  it('sends only ticked channels, always as grants', () => {
    expect(buildRegisterConsents({ email: true, sms: true }, contact)).toEqual([
      { channel: 'email', status: 'onay' },
      { channel: 'mesaj', sub_channel: 'sms', status: 'onay' },
    ]);
  });

  it('drops phone grants on a half-typed number but keeps the email one', () => {
    // "+90 (555" is what the register form holds after three digits — ARM's §7
    // guard would 400 the whole registration on it.
    expect(
      buildRegisterConsents({ email: true, sms: true, arama: true }, { ...contact, phone: '+90 (555' }),
    ).toEqual([{ channel: 'email', status: 'onay' }]);
  });

  it('drops an email grant with no email address', () => {
    expect(buildRegisterConsents({ email: true }, { email: '  ', phone: contact.phone })).toEqual([]);
  });
});

describe('isPhoneUsableForConsent', () => {
  it.each([
    ['formatted TR mobile', '+90 (555) 123 45 67', true],
    ['digits only', '05551234567', true],
    ['half-typed', '+90 (555', false],
    ['country code only', '+90', false],
    ['punctuation only', '-----', false],
    ['missing', null, false],
  ])('%s → %s', (_l, phone, expected) => {
    expect(isPhoneUsableForConsent(phone)).toBe(expected);
  });
});

describe('missingGrants', () => {
  const sent = [
    { channel: 'email', status: 'onay' } as const,
    { channel: 'mesaj', sub_channel: 'sms', status: 'onay' } as const,
    { channel: 'arama', status: 'onay' } as const,
  ];

  it('returns the grants ARM did not record', () => {
    expect(missingGrants(sent, state({ email: 'onay' }))).toEqual([
      { channel: 'mesaj', sub_channel: 'sms', status: 'onay' },
      { channel: 'arama', status: 'onay' },
    ]);
  });

  it('returns nothing when every grant landed', () => {
    expect(missingGrants(sent, state({ email: 'onay', mesaj_sms: 'onay', arama: 'onay' }))).toEqual(
      [],
    );
  });

  it('treats an unreadable state as "nothing landed"', () => {
    expect(missingGrants(sent, null)).toEqual(sent);
  });

  it('never re-sends a withdrawal', () => {
    expect(missingGrants([{ channel: 'email', status: 'ret' }], state())).toEqual([]);
  });
});

describe('stateToToggles', () => {
  it('is on only for an explicit onay', () => {
    expect(stateToToggles(state({ email: 'onay', mesaj_sms: 'ret', arama: null }))).toEqual({
      email: true,
      sms: false,
      arama: false,
      whatsapp: false,
    });
  });

  it('is all-off for a missing state', () => {
    expect(stateToToggles(null)).toEqual({
      email: false,
      sms: false,
      arama: false,
      whatsapp: false,
    });
  });
});

describe('hasAnyGrant', () => {
  it('counts a hidden WhatsApp grant', () => {
    expect(hasAnyGrant(state({ email: 'ret', arama: 'ret', mesaj_whatsapp: 'onay' }))).toBe(true);
  });

  it('ignores the informational channel-level mesaj field', () => {
    expect(hasAnyGrant(state({ mesaj: 'onay' }))).toBe(false);
  });

  it('is false for an empty or missing state', () => {
    expect(hasAnyGrant(state())).toBe(false);
    expect(hasAnyGrant(null)).toBe(false);
  });
});

describe('classifySaveError', () => {
  const err = (status: number, code?: string) => ({ response: { status, data: { code } } });

  it.each([
    ['401', err(401), 'auth'],
    ['403', err(403), 'auth'],
    ['missing contact', err(400, 'consent_contact_required'), 'contact'],
    ['invalid input', err(400, 'invalid_input'), 'rejected'],
    ['rate limit', err(429), 'rejected'],
    ['server error', err(500), 'ambiguous'],
    ['network failure', new Error('Network Error'), 'ambiguous'],
  ])('%s → %s', (_l, e, expected) => {
    expect(classifySaveError(e)).toBe(expected);
  });
});

describe('statusMessageKey (canon §17)', () => {
  const on = (channel: 'email' | 'sms' | 'arama') =>
    statusMessageKey({ channel, turnedOn: true, serverState: state({ email: 'onay' }) });

  it('reports the granted channel', () => {
    expect(on('email')).toBe('savedEmail');
    expect(on('sms')).toBe('savedMesaj');
    expect(on('arama')).toBe('savedArama');
  });

  it('reports a single withdrawal while other grants remain', () => {
    expect(
      statusMessageKey({
        channel: 'email',
        turnedOn: false,
        serverState: state({ email: 'ret', arama: 'onay' }),
      }),
    ).toBe('channelOff');
  });

  it('reports "all withdrawn" only when the SERVER state has no grant left', () => {
    expect(
      statusMessageKey({ channel: 'email', turnedOn: false, serverState: state({ email: 'ret' }) }),
    ).toBe('allOff');
    // A hidden WhatsApp grant still counts — "all your preferences are ret"
    // would be false.
    expect(
      statusMessageKey({
        channel: 'email',
        turnedOn: false,
        serverState: state({ email: 'ret', mesaj_whatsapp: 'onay' }),
      }),
    ).toBe('channelOff');
  });

  it('puts failures ahead of any success copy', () => {
    expect(
      statusMessageKey({ channel: 'email', turnedOn: true, serverState: null, failure: 'contact' }),
    ).toBe('contactRequired');
    for (const failure of ['rejected', 'ambiguous', 'auth'] as const) {
      expect(
        statusMessageKey({ channel: 'sms', turnedOn: false, serverState: state(), failure }),
      ).toBe('saveError');
    }
  });
});
