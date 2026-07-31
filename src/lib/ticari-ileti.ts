/**
 * Ticari elektronik ileti (commercial electronic message) consent — client logic
 * for FBG-410, against the ARM endpoints added by FBG-409.
 *
 * Canon: «Ticari Elektronik İleti Bilgilendirmesi ve Onay Metni» v2.0
 * (KK-ET-TEI-2026-V2, published at /legal/ticari-elektronik-ileti). Rules this
 * module exists to keep honest:
 *   - §5 channels are independent (E-POSTA / MESAJ / ARAMA) and only channels the
 *     store ACTUALLY uses may be shown; SMS and WhatsApp are two sub-channels of
 *     the single İYS channel MESAJ;
 *   - §9 consent is never a condition of registration — nothing here may gate a
 *     submit, and a zero-decision payload is the normal case;
 *   - §10 withdrawal is free and unconditional — a `ret` is never blocked.
 *
 * Named `ticari-ileti` because `consent.ts` is already the cookie/CMP module —
 * a different legal basis entirely, as are the checkout KVKK/Mesafeli boxes and
 * the Üyelik Sözleşmesi checkbox.
 *
 * Pure and React-free so both the registration form and the account page can
 * share it (and so it is testable without mounting either).
 */

import type { ArmConsentDecision, ArmConsentState, ArmConsentStatus } from './arm-types';

/** A channel as the shopper sees it — MESAJ is split into its two sub-channels. */
export type UiChannel = 'email' | 'sms' | 'arama' | 'whatsapp';

/** Canonical display order; also the parse order for the env override. */
const KNOWN_CHANNELS: readonly UiChannel[] = ['email', 'sms', 'arama', 'whatsapp'];

/**
 * Channels this storefront actually runs, as declared by the launch owner in
 * FBG-410 («3 штуки: e-posta / SMS / arama; WhatsApp — только если канал реально
 * запущен»). This is a product decision, NOT something derived from the BFF.
 */
export const LAUNCH_CHANNELS: readonly UiChannel[] = ['email', 'sms', 'arama'];

/**
 * Parses `NEXT_PUBLIC_TICARI_ILETI_CHANNELS`. Unset → the launch scope above.
 * Any value that IS set is honoured fail-closed: unknown tokens are dropped and
 * an empty/garbage result yields NO channels rather than silently falling back
 * to the default — showing a channel the store cannot send on violates §5, and
 * "no channels at all" has to be expressible (e.g. a launch without SMS is
 * `NEXT_PUBLIC_TICARI_ILETI_CHANNELS=email,arama`, no code change).
 */
export function parseActiveChannels(raw: string | undefined): UiChannel[] {
  if (raw === undefined) return [...LAUNCH_CHANNELS];
  const tokens = new Set(
    raw
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
  return KNOWN_CHANNELS.filter((c) => tokens.has(c));
}

/**
 * Build-time (Next inlines `NEXT_PUBLIC_*` into the bundles, like
 * `src/lib/prelaunch.ts`) — changing it on a running server has no effect.
 */
export const ACTIVE_CHANNELS: UiChannel[] = parseActiveChannels(
  process.env.NEXT_PUBLIC_TICARI_ILETI_CHANNELS,
);

/**
 * Fewest subscriber digits a phone must carry before we attach a MESAJ/ARAMA
 * grant to it. A TR mobile is 10 digits after the +90/0 prefix, and the register
 * form's own formatter emits a non-empty `+90 …` from the first keystroke — so a
 * half-typed number would otherwise reach ARM's §7 contact guard, which rejects
 * the WHOLE registration with 400 before the account is created. Dropping the
 * grant client-side keeps §9 intact: the account is always created.
 */
const TR_SUBSCRIBER_DIGITS = 10;

function subscriberDigits(phone?: string | null): string {
  let d = (phone ?? '').replace(/\D/g, '');
  if (d.startsWith('90')) d = d.slice(2);
  else if (d.startsWith('0')) d = d.slice(1);
  return d;
}

/** Can a MESAJ/ARAMA grant be attached to this number? (`ret` never asks.) */
export function isPhoneUsableForConsent(phone?: string | null): boolean {
  return subscriberDigits(phone).length >= TR_SUBSCRIBER_DIGITS;
}

/** UI channel + on/off → the ARM decision. SMS/WhatsApp always carry sub_channel. */
export function toDecision(channel: UiChannel, on: boolean): ArmConsentDecision {
  const status: ArmConsentStatus = on ? 'onay' : 'ret';
  if (channel === 'email') return { channel: 'email', status };
  if (channel === 'arama') return { channel: 'arama', status };
  return { channel: 'mesaj', sub_channel: channel, status };
}

/**
 * Decisions to send with `POST /auth/register` — only the ticked boxes, always
 * `onay`. Grants whose contact is not usable are dropped (see
 * TR_SUBSCRIBER_DIGITS): registration must never fail because of a consent.
 */
export function buildRegisterConsents(
  selected: Partial<Record<UiChannel, boolean>>,
  contact: { email?: string | null; phone?: string | null },
): ArmConsentDecision[] {
  const emailUsable = !!(contact.email ?? '').trim();
  const phoneUsable = isPhoneUsableForConsent(contact.phone);
  return KNOWN_CHANNELS.filter((c) => selected[c] === true)
    .filter((c) => (c === 'email' ? emailUsable : phoneUsable))
    .map((c) => toDecision(c, true));
}

/** Effective status of one decision's target inside the derived server state. */
function statusOf(state: ArmConsentState | null | undefined, d: ArmConsentDecision) {
  if (!state) return null;
  if (d.channel === 'email') return state.email;
  if (d.channel === 'arama') return state.arama;
  return d.sub_channel === 'whatsapp' ? state.mesaj_whatsapp : state.mesaj_sms;
}

/**
 * Grants that were sent but are NOT reflected in the authoritative state.
 *
 * ARM records register-time consents best-effort and answers 200 either way, so
 * this is the only way to notice a lost opt-in. Returns exactly the missing
 * decisions, so a retry re-sends nothing that already landed.
 */
export function missingGrants(
  sent: ArmConsentDecision[],
  state: ArmConsentState | null | undefined,
): ArmConsentDecision[] {
  return sent.filter((d) => d.status === 'onay' && statusOf(state, d) !== 'onay');
}

/** Server state → switch positions. Anything but an explicit `onay` is off. */
export function stateToToggles(state: ArmConsentState | null | undefined): Record<UiChannel, boolean> {
  return {
    email: state?.email === 'onay',
    sms: state?.mesaj_sms === 'onay',
    arama: state?.arama === 'onay',
    whatsapp: state?.mesaj_whatsapp === 'onay',
  };
}

/**
 * Is ANY channel still granted? Counts channels the UI does not show — a hidden
 * WhatsApp `onay` means "all your preferences are now ret" (§17) would be a lie.
 * `state.mesaj` is informational (already folded into the sub fields), so it is
 * deliberately not counted.
 */
export function hasAnyGrant(state: ArmConsentState | null | undefined): boolean {
  if (!state) return false;
  return (
    state.email === 'onay' ||
    state.arama === 'onay' ||
    state.mesaj_sms === 'onay' ||
    state.mesaj_whatsapp === 'onay'
  );
}

/**
 * How a failed `POST /me/consents` must be treated.
 *
 * `auth` / `contact` / `rejected` are raised BEFORE ARM appends anything, so the
 * switch can be rolled back truthfully. Everything else — network error, 5xx,
 * unknown code — is `ambiguous`: ARM writes the events first and only then
 * clears its cache, sends the teyit and re-reads the state, so a late failure
 * can leave the consent RECORDED. Rolling back there would show the shopper a
 * position that contradicts what ARM will act on; re-read instead.
 */
export type SaveFailure = 'auth' | 'contact' | 'rejected' | 'ambiguous';

export function classifySaveError(err: unknown): SaveFailure {
  const res = (err as { response?: { status?: number; data?: { code?: string } } })?.response;
  const status = res?.status;
  if (status === 401 || status === 403) return 'auth';
  if (res?.data?.code === 'consent_contact_required') return 'contact';
  if (status === 400 || status === 422 || status === 429) return 'rejected';
  return 'ambiguous';
}

/** i18n key (under `ticariIleti.`) for the §17 message shown after a save. */
export function statusMessageKey(args: {
  channel: UiChannel;
  turnedOn: boolean;
  /** The state ARM reported AFTER the write — never the local switches. */
  serverState: ArmConsentState | null | undefined;
  failure?: SaveFailure | null;
}): string {
  if (args.failure === 'contact') return 'contactRequired';
  if (args.failure) return 'saveError';
  if (args.turnedOn) {
    if (args.channel === 'email') return 'savedEmail';
    if (args.channel === 'arama') return 'savedArama';
    return 'savedMesaj';
  }
  return hasAnyGrant(args.serverState) ? 'channelOff' : 'allOff';
}
