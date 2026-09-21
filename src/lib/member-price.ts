/**
 * Creator Club member price — pure helpers (port of the .ru storefront, FBG-600).
 *
 * The figures themselves come from the ARM BFF (`member_price` on a catalogue
 * row, `memberPrice` on a validated cart line, `category_discount` on the cart /
 * promo / order answers): the storefront only renders them. A missing field means
 * «no member price» — the page shows the list price exactly as before.
 *
 * Kept free of I/O (no `./api` import) so components and their tests can use it
 * without dragging axios in.
 */

/** A finite member price strictly below the list price, else `null`. */
export function memberPriceOf(
  listPrice?: number | string | null,
  memberPrice?: number | string | null,
): number | null {
  const list = Number(listPrice);
  const member = Number(memberPrice);
  if (memberPrice == null || !Number.isFinite(member) || member < 0) return null;
  if (!Number.isFinite(list) || list <= 0 || member >= list) return null;
  return member;
}

/**
 * «−N%» for the badge, derived from the two prices printed next to it — never
 * from the member's rate alone, which is positive on every page and would promise
 * a discount on lines outside the configured categories. The first member-priced
 * line answers for the whole cart (one rate per customer); 0 = nothing discounted.
 */
export function memberDiscountPercentOf(
  lines: readonly { unitPrice?: number | string | null; memberPrice?: number | string | null }[],
): number {
  for (const line of lines) {
    const member = memberPriceOf(line.unitPrice, line.memberPrice);
    if (member === null) continue;
    return Math.round((1 - member / Number(line.unitPrice)) * 100);
  }
  return 0;
}

/**
 * Creator Club discount of a placed order: the BFF answers `category_discount`
 * either as a number or as `{ rate, discount }`; older orders carry only the
 * history event `category_discount` (its `amount`, or «… : -X» in the notes).
 */
export function orderCategoryDiscountOf(order: {
  category_discount?: number | string | { rate?: number; discount?: number | string } | null;
  history?: Array<{ event?: string | null; type?: string | null; amount?: number | string | null; notes?: string | null }> | null;
}): number {
  const raw = order.category_discount;
  const direct = typeof raw === 'object' && raw !== null ? Number(raw.discount) : Number(raw);
  if (raw != null && Number.isFinite(direct) && direct > 0) return direct;
  for (const h of order.history ?? []) {
    if ((h.event ?? h.type) !== 'category_discount') continue;
    const amount = Number(h.amount);
    if (h.amount != null && Number.isFinite(amount) && amount > 0) return amount;
    // «Скидка Creator Club (−3 %): -1 260.50» → сумма после последнего «:»
    const tail = (h.notes ?? '').split(':').pop() ?? '';
    const m = /[-−–]?\s*(\d[\d\s]*(?:[.,]\d+)?)/.exec(tail);
    if (m) {
      const parsed = Number(m[1].replace(/\s/g, '').replace(',', '.'));
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }
  }
  return 0;
}
