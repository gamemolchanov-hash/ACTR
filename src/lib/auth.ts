/**
 * ARM Storefront Customer Auth/Account API — session contract for ACTR
 * D-01: token in localStorage['arm_token'], Bearer via proxy
 * D-02: sf_token → arm_token (one-time migration via migrateToken)
 * D-04 / FBG-50: only 401/403 drops session; network/5xx preserves it
 * D-07: register sends terms_accepted + terms_version (AUTH-01)
 */

import { api } from './api';
import { ENDPOINTS } from './arm-contract';

// ---------------------------------------------------------------------------
// Types (from 03-RESEARCH.md §ARM Types — verified from BFF source)
// ---------------------------------------------------------------------------

export interface AuthCustomer {
  id: string;
  name: string;
  email: string;
  phone: string | null;
}

// backward-compat alias for pages that import Customer
export type Customer = AuthCustomer;

export interface LoyaltyData {
  loyalty_points: number;
  loyalty_tier: number; // 1=Welcome, 2=Silver, 3=Gold
  total_spent: number;
}

export interface CustomerAddress {
  id: string;
  label: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  address: string | null;
  street: string | null;
  building: string | null;
  block: string | null;
  apartment: string | null;
  postal_code: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  is_default: boolean;
}

export interface CustomerOrder {
  id: string;
  number: string;
  total: number | string;
  vat_amount: number | string | null;
  currency: string;
  date_created: string;
  track_number: string | null;
  track_url: string | null;
  status: { code: string; name: string; color: string } | null;
  items: Array<{
    id: string;
    quantity: number;
    unit_price: number;
    product: { name: string } | null;
  }>;
}

export interface LoginResult {
  token: string;
  customer: AuthCustomer;
  loyalty?: LoyaltyData;
  needsReset?: boolean;
  message?: string;
}

// ---------------------------------------------------------------------------
// Terms version (D-07 / AUTH-01 — bump when legal copy changes, GDPR Art.7)
// ---------------------------------------------------------------------------

export const TERMS_VERSION = '2026-06-30';

// ---------------------------------------------------------------------------
// Token storage (D-01 / D-02)
// ---------------------------------------------------------------------------

export const TOKEN_KEY = 'arm_token';

/**
 * One-time migration: sf_token → arm_token for existing logged-in users.
 * Called on AuthProvider mount. Only mention of 'sf_token' in the codebase (D-02 / Pitfall 2).
 */
export function migrateToken(): void {
  if (typeof window === 'undefined') return;
  const old = localStorage.getItem('sf_token');
  if (old) {
    localStorage.setItem('arm_token', old);
    localStorage.removeItem('sf_token');
  }
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

// ---------------------------------------------------------------------------
// Auth helpers (D-04 / FBG-50 + Pattern 3)
// ---------------------------------------------------------------------------

/**
 * True only for real auth failures (401/403) — D-04 / FBG-50.
 * Network errors and 5xx return false, preserving the session.
 */
export function isAuthFailure(err: unknown): boolean {
  if (err && typeof err === 'object' && 'response' in err) {
    const status = (err as { response?: { status?: number } }).response?.status;
    return status === 401 || status === 403;
  }
  return false;
}

/** Returns Authorization Bearer header for protected calls — empty {} if no token (Pitfall 5) */
export function bearerHeader(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ---------------------------------------------------------------------------
// Public auth API calls
// ---------------------------------------------------------------------------

export async function register(data: {
  name: string;
  email: string;
  phone?: string;
  password: string;
  terms_accepted: boolean;
  terms_version: string;
}): Promise<{ message: string }> {
  const res = await api.post(ENDPOINTS.auth.register, data);
  return res.data;
}

/**
 * Login — returns LoginResult. Does NOT call setToken.
 * Token is stored by AuthContext.setAuth (D-03).
 */
export async function login(loginValue: string, password: string): Promise<LoginResult> {
  const res = await api.post(ENDPOINTS.auth.login, { login: loginValue, password });
  return res.data;
}

export async function forgotPassword(email: string): Promise<{ message: string }> {
  const res = await api.post(ENDPOINTS.auth.forgotPassword, { email });
  return res.data;
}

export async function resetPassword(token: string, password: string): Promise<{ message: string }> {
  const res = await api.post(ENDPOINTS.auth.resetPassword, { token, password });
  return res.data;
}

/**
 * GET /auth/me — throws on error.
 * Caller (AuthContext) handles error with isAuthFailure guard (FBG-50).
 * Does NOT call clearToken — only 401/403 via isAuthFailure drops the session.
 */
export async function getMe(): Promise<{ customer: AuthCustomer; loyalty: LoyaltyData | null }> {
  const res = await api.get(ENDPOINTS.auth.me, { headers: bearerHeader() });
  return { customer: res.data.customer, loyalty: res.data.loyalty ?? null };
}

// ---------------------------------------------------------------------------
// Protected account functions (all use bearerHeader — contract for 03-02/03-03)
// ---------------------------------------------------------------------------

export async function getMyAddresses(): Promise<{ data: CustomerAddress[] }> {
  const res = await api.get(ENDPOINTS.auth.addresses, { headers: bearerHeader() });
  return res.data;
}

export async function addMyAddress(
  addr: Partial<CustomerAddress>,
): Promise<{ data: CustomerAddress }> {
  const res = await api.post(ENDPOINTS.auth.addresses, addr, { headers: bearerHeader() });
  return res.data;
}

export async function deleteMyAddress(id: string): Promise<void> {
  await api.delete(ENDPOINTS.auth.address(id), { headers: bearerHeader() });
}

export async function getMyOrders(
  page = 1,
  limit = 10,
): Promise<{
  data: CustomerOrder[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}> {
  const res = await api.get(ENDPOINTS.auth.orders, {
    headers: bearerHeader(),
    params: { page, limit },
  });
  return res.data;
}

export async function getMyOrder(id: string): Promise<{ data: CustomerOrder }> {
  const res = await api.get(ENDPOINTS.auth.order(id), { headers: bearerHeader() });
  return res.data;
}

export async function updateProfile(data: {
  name?: string;
  phone?: string;
}): Promise<AuthCustomer> {
  const res = await api.patch(ENDPOINTS.auth.profile, data, { headers: bearerHeader() });
  return res.data.customer;
}

export async function changePassword(data: {
  currentPassword: string;
  newPassword: string;
}): Promise<{ message: string }> {
  const res = await api.post(ENDPOINTS.auth.changePassword, data, { headers: bearerHeader() });
  return res.data;
}

export async function exportAccount(): Promise<Record<string, unknown>> {
  const res = await api.get(ENDPOINTS.auth.export, { headers: bearerHeader() });
  return res.data;
}

export async function deleteAccount(data: { password?: string }): Promise<{ message: string }> {
  const res = await api.post(ENDPOINTS.auth.deleteAccount, data, { headers: bearerHeader() });
  return res.data;
}

/**
 * Returns `url` only when it is an absolute http(s) link, otherwise null.
 * Guards `href` sinks against `javascript:`/`data:` schemes in backend-provided
 * URLs (e.g. a mis-ingested carrier track_url). React does not strip such schemes.
 */
export function safeHttpUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}
