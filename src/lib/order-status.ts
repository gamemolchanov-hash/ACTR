/**
 * Order status label for the buyer.
 *
 * ARM keeps status names in Russian (arm_order_statuses.name: "Новый",
 * "Оплачен", …), so the storefront never shows `status.name` as is: a known
 * status code maps to `orderStatus.<code>` (messages/*.json, Tolgee #34); an
 * unknown one falls back to its name only when that has no Cyrillic, else to
 * the raw code.
 */
export const ORDER_STATUS_CODES = [
  'new',
  'confirmed',
  'invoice_issued',
  'awaiting_payment',
  'paid',
  'processing',
  'shipped',
  'delivered',
  'completed',
  'cancelled',
] as const;

const CYRILLIC = /[\u0400-\u04FF]/;

export function orderStatusLabel(
  t: (key: string) => string,
  status: { code?: string | null; name?: string | null } | null | undefined,
): string {
  const code = status?.code ?? '';
  if ((ORDER_STATUS_CODES as readonly string[]).includes(code)) return t(`orderStatus.${code}`);
  const name = status?.name?.trim() ?? '';
  if (name && !CYRILLIC.test(name)) return name;
  return code || '—';
}
