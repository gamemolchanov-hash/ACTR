/**
 * Extract KDV (Turkish VAT) portion from a KDV-inclusive (brutto) price.
 * TR B2C prices are KDV-inclusive by law (D-01, D-03).
 *
 * @param gross  - KDV-inclusive price (brutto)
 * @param rate   - KDV rate as decimal, default 0.20 (20%, fixed per D-03)
 * @returns      KDV portion rounded to nearest integer (whole TRY, kuruş-free)
 */
export function kdvFromBrutto(gross: number, rate = 0.20): number {
  // TODO: implement
  return 0;
}
