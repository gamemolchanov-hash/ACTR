/**
 * Format a monetary amount using Intl.NumberFormat.
 * Uses style:'currency' so the output includes the ISO symbol (e.g. $12.99, ₺450, €9).
 * Uses currencyDisplay:'narrowSymbol' so the narrow currency symbol renders
 * (e.g. TRY -> ₺) regardless of UI language (D4) — the locale arg should be
 * the country-derived format locale, not the UI language.
 *
 * @param amount - The amount to format
 * @param currency - ISO 4217 currency code. Falls back to NEXT_PUBLIC_STOREFRONT_CURRENCY → 'TRY' (WR-05)
 * @param locale - BCP-47 locale string (e.g. 'tr-TR', 'en-US'). Falls back to 'en-US'
 * @param fractionDigits - Decimals to show (default 2). 0 is for unit labels such as
 *   "₺1 = 1 XP" on the Creator Club page, never for prices or balances.
 */
export function fmtMoney(
  amount: number,
  currency?: string,
  locale?: string,
  fractionDigits = 2,
): string {
  const curr = currency || process.env.NEXT_PUBLIC_STOREFRONT_CURRENCY || 'TRY';
  const loc = locale || 'en-US';
  try {
    return new Intl.NumberFormat(loc, {
      style: 'currency',
      currency: curr,
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(amount);
  } catch {
    // Unknown currency code — fall back to plain number + code
    return `${new Intl.NumberFormat(loc).format(amount)} ${curr}`;
  }
}

/**
 * `fmtMoney` for headlines and banners: a whole amount drops its zero fraction
 * (₺3.000, not ₺3.000,00); a fractional one keeps two digits like everywhere else.
 */
export function fmtMoneyShort(amount: number, currency?: string, locale?: string): string {
  return fmtMoney(amount, currency, locale, Number.isInteger(amount) ? 0 : 2);
}
