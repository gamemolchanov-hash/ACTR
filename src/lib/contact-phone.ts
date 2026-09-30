/**
 * Public contact phone links.
 *
 * The phone comes from BFF `/config` (`contact_phone` — the distributor's phone as
 * typed in Portal, e.g. "+90 531 871 30 07"), so the display text is shown as-is
 * and only the links are derived from its digits. A value without enough digits
 * to dial yields no link at all rather than a broken one.
 */

const MIN_DIGITS = 7;

function digitsOf(phone: string | null | undefined): string | null {
  const digits = (phone ?? '').replace(/\D/g, '');
  return digits.length >= MIN_DIGITS ? digits : null;
}

/** `tel:+905318713007` — international form, the number must carry its country code. */
export function telHref(phone: string | null | undefined): string | null {
  const digits = digitsOf(phone);
  return digits ? `tel:+${digits}` : null;
}

/** `https://wa.me/905318713007` — WhatsApp click-to-chat wants digits only. */
export function whatsappHref(phone: string | null | undefined): string | null {
  const digits = digitsOf(phone);
  return digits ? `https://wa.me/${digits}` : null;
}
