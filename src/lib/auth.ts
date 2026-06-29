/**
 * Storefront Customer Auth API + state management
 */

import { api } from './api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  type?: string;
}

export interface LoginResponse {
  token: string;
  customer: Customer;
}

export interface NeedsResetResponse {
  needsReset: true;
  email: string;
  message: string;
}

// ---------------------------------------------------------------------------
// Token storage
// ---------------------------------------------------------------------------

const TOKEN_KEY = 'sf_token';

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
// API calls
// ---------------------------------------------------------------------------

export async function register(data: {
  name: string;
  email: string;
  phone?: string;
  password: string;
}): Promise<{ message: string }> {
  const res = await api.post('/auth/register', data);
  return res.data;
}

export async function login(data: {
  login: string;
  password: string;
}): Promise<LoginResponse | NeedsResetResponse> {
  const res = await api.post('/auth/login', data);
  if (res.data.token) {
    setToken(res.data.token);
  }
  return res.data;
}

export async function forgotPassword(email: string): Promise<{ message: string }> {
  const res = await api.post('/auth/forgot-password', { email });
  return res.data;
}

export async function resetPassword(token: string, password: string): Promise<{ message: string }> {
  const res = await api.post('/auth/reset-password', { token, password });
  return res.data;
}

export interface CustomerAddress {
  id: string;
  city: string;
  address: string;
  postal_code: string | null;
  region: string | null;
  district: string | null;
  street: string | null;
  building: string | null;
  block: string | null;
  apartment: string | null;
  label: string | null;
  is_default: boolean;
}

export async function getMe(): Promise<{
  customer: Customer;
  address: CustomerAddress | null;
} | null> {
  const token = getToken();
  if (!token) return null;
  try {
    const res = await api.get('/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return { customer: res.data.customer, address: res.data.address || null };
  } catch {
    clearToken();
    return null;
  }
}

export function logout(): void {
  clearToken();
  window.location.href = '/';
}

// ---------------------------------------------------------------------------
// Account API (protected)
// ---------------------------------------------------------------------------

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface OrderSummary {
  id: string;
  number: string;
  status: { id: string; name: string; color: string; code: string } | null;
  total: number;
  date_created: string;
  track_number: string | null;
  delivery_service: { id: string; name: string } | null;
  items: Array<{
    id: string;
    quantity: number;
    unit_price: number;
    product: { id: string; name: string } | null;
  }>;
}

export async function getMyAddresses(): Promise<CustomerAddress[]> {
  const res = await api.get('/auth/me/addresses', { headers: authHeaders() });
  return res.data.data;
}

export async function deleteMyAddress(id: string): Promise<void> {
  await api.delete(`/auth/me/addresses/${id}`, { headers: authHeaders() });
}

export async function getMyOrders(
  page = 1,
  limit = 10,
): Promise<{
  data: OrderSummary[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}> {
  const res = await api.get('/auth/me/orders', {
    headers: authHeaders(),
    params: { page, limit },
  });
  return res.data;
}

export interface OrderDetail extends OrderSummary {
  subtotal: number | string;
  discount: number | string;
  promo_discount: number | string;
  payment_status: string | null;
  delivery_tariff_type: string | null;
  recipient_name: string | null;
  recipient_phone: string | null;
  shipping_zip: string | null;
  shipping_region: string | null;
  shipping_city: string | null;
  shipping_address: string | null;
  shipping_street: string | null;
  shipping_building: string | null;
  shipping_block: string | null;
  shipping_apartment: string | null;
  promo_code: { code: string } | null;
}

export async function getMyOrder(id: string): Promise<OrderDetail> {
  const res = await api.get(`/auth/me/orders/${id}`, { headers: authHeaders() });
  return res.data.data;
}

export async function updateProfile(data: { name?: string; phone?: string }): Promise<Customer> {
  const res = await api.patch('/auth/me/profile', data, { headers: authHeaders() });
  return res.data.customer;
}

export async function changePassword(data: {
  currentPassword?: string;
  newPassword: string;
}): Promise<{ message: string }> {
  const res = await api.post('/auth/me/change-password', data, { headers: authHeaders() });
  return res.data;
}
