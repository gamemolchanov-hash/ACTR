/**
 * Mesafeli Satış Sözleşmesi V4 (FBG-458) — fills the canonical dynamic contract
 * template (mesafeli-satis-content.ts, KK-MSS-2026-V4) with a concrete order's
 * data and returns ready-to-render Markdown for LegalMarkdown. It is the sibling
 * of the Ön Bilgilendirme Formu (FBG-401): the contract is the subject of the
 * sale itself, filled per order and delivered on a durable medium.
 *
 * The order data is the SAME snapshot the OBF uses, so the two documents can
 * never disagree on price, carrier or buyer details. `buildMesafeliSatisData`
 * therefore reuses `buildOnBilgilendirmeData` (all the totals / promo-vs-wallet
 * split / business-day delivery-date logic, plus the GFM-cell sanitisation) and
 * only maps/adds the tokens unique to the contract:
 *   - §5 uses `{{variant}}` where the OBF line map carries `variant_or_not_applicable`;
 *   - §1.3 "İade Gönderi Kodu / Yöntemi" (`{{return_code_or_request_method}}`)
 *     reuses the OBF return channel — at checkout no return code exists yet, so
 *     both fields describe how it is obtained;
 *   - the Elektronik Kabul Kaydı carries the OBF document version
 *     (`{{pre_information_version}}`) from the single `ON_BILGILENDIRME_DOC_CODE`
 *     source, so the two versions cannot drift.
 *
 * Pure and side-effect free (the timestamp is passed in), so the substitution is
 * deterministic and unit-testable — like the OBF renderer.
 */
import {
  applyPlaceholders,
  buildOnBilgilendirmeData,
  type BuildOnBilgilendirmeInput,
  type OnBilgilendirmeData,
} from './on-bilgilendirme';
import {
  MESAFELI_SATIS_PRODUCT_BLOCK,
  MESAFELI_SATIS_TEMPLATE,
} from '@/app/[locale]/legal/mesafeli-satis-content';
import { ON_BILGILENDIRME_DOC_CODE } from './on-bilgilendirme-formu-content';

/** Same order snapshot the OBF is built from; the contract adds no new inputs. */
export type BuildMesafeliSatisInput = BuildOnBilgilendirmeInput;

export interface MesafeliSatisData {
  /** One resolved placeholder map per cart line (expands §5's product block). */
  lines: Record<string, string>[];
  /** Order-level placeholder map (everything outside the per-product block). */
  order: Record<string, string>;
}

/**
 * Map raw checkout state → the resolved placeholder maps for the contract. Built
 * on top of the OBF data (already sanitised against GFM-table-breaking chars) so
 * the shared fields are guaranteed identical to the OBF; only the contract-only
 * tokens are added on top (all derived from already-sanitised or constant safe
 * values, so no further sanitisation is needed).
 */
export function buildMesafeliSatisData(input: BuildMesafeliSatisInput): MesafeliSatisData {
  const obf: OnBilgilendirmeData = buildOnBilgilendirmeData(input);

  const lines = obf.lines.map((line) => ({
    ...line,
    // §5's token is {{variant}}; the OBF line map names it variant_or_not_applicable.
    variant: line.variant_or_not_applicable,
  }));

  const order: Record<string, string> = {
    ...obf.order,
    // §1.3 "İade Gönderi Kodu / Yöntemi": no return code exists pre-return, so it
    // describes the same channel the OBF uses to obtain one.
    return_code_or_request_method: obf.order.return_request_channel_and_code_method,
    // Elektronik Kabul Kaydı — the OBF version, from the single shared source.
    pre_information_version: ON_BILGILENDIRME_DOC_CODE,
  };

  return { lines, order };
}

/** Fill the canonical template with order data → ready-to-render Markdown. */
export function renderMesafeliSatis(data: MesafeliSatisData): string {
  let withBlocks: string;
  if (data.lines.length === 0) {
    // No valid lines: drop the product block AND its leading newline so §5 stays
    // one contiguous table (order header + totals) instead of splitting on a
    // blank line. Guards the empty/all-invalid cart edge.
    withBlocks = MESAFELI_SATIS_TEMPLATE.replace(`\n${MESAFELI_SATIS_PRODUCT_BLOCK}`, () => '');
  } else {
    const productBlocks = data.lines
      .map((line) => applyPlaceholders(MESAFELI_SATIS_PRODUCT_BLOCK, line))
      .join('\n');
    // Function replacement so `$`/`$&` in a value are treated literally; the block
    // still carries its `{{tokens}}` here, so the plain-string search hits its one
    // occurrence in §5.
    withBlocks = MESAFELI_SATIS_TEMPLATE.replace(MESAFELI_SATIS_PRODUCT_BLOCK, () => productBlocks);
  }
  return applyPlaceholders(withBlocks, data.order);
}
