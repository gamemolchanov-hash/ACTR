/**
 * One-click unsubscribe from marketing emails (23.09.2026).
 *
 * Every marketing email from ARM (Creator Club: rewards reminders, expiring XP,
 * upcoming tier drop) carries `/unsubscribe?t=<token>`. The token is signed by
 * the backend and replaces a login. The canon promises a one-click opt-out in
 * every email («her e-postada tek tıklamayla … abonelikten çıkma»), so the page
 * withdraws on open and then tells the shopper what will no longer arrive.
 */

import { api } from '@/lib/api';
import { ENDPOINTS } from '@/lib/arm-contract';

export async function confirmUnsubscribe(token: string): Promise<void> {
  await api.post(ENDPOINTS.mailUnsubscribe, { t: token });
}

/** A backend 404/400 means the link is invalid (forged, other storefront, erased customer). */
export function isInvalidLink(err: unknown): boolean {
  const status = (err as { response?: { status?: number } })?.response?.status;
  return status === 404 || status === 400;
}
