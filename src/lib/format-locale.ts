/**
 * Derives the CANONICAL number/date format locale from a BFF-provided
 * ISO-3166-1 alpha-2 country code (e.g. "TR"), independent of the UI
 * language (D1).
 *
 * Number separators, currency-symbol position and symbol form follow the
 * LANGUAGE subtag of a BCP-47 tag, not the region alone — `en-TR` would
 * format TRY as `₺1,234.50` (wrong grouping/decimal separators) instead of
 * the correct Turkish convention `₺1.234,50`. So instead of building a
 * mixed `<uiLang>-<country>` tag, we resolve the country's own CANONICAL
 * locale via `Intl.Locale.prototype.maximize()` (D2/D3) — e.g. "TR" ->
 * "tr-Latn-TR", whose lowercased form starts with "tr".
 */

// Reserved for future per-country overrides (e.g. countries with more than
// one plausible canonical locale). Empty for now — checked before falling
// back to Intl.Locale resolution.
const OVERRIDES: Record<string, string> = {};

export function formatLocaleFromCountry(
  country?: string | null,
  fallbackLocale?: string,
): string {
  const fallback = fallbackLocale || 'en-US';

  const cc = (country || '').trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) {
    return fallback;
  }

  if (OVERRIDES[cc]) {
    return OVERRIDES[cc];
  }

  try {
    const maximized = new Intl.Locale('und', { region: cc }).maximize().toString();
    return maximized || fallback;
  } catch {
    return fallback;
  }
}
