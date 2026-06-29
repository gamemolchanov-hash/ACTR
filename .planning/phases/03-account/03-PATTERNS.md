# Phase 3: Авторизация и личный кабинет — Pattern Map

**Mapped:** 2026-06-30
**Files analyzed:** 13 (10 modified + 2 created + 1 redirect shim)
**Analogs found:** 13 / 13

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/lib/auth.ts` | service | request-response | self (rewrite) + FBG `src/lib/api.ts` §§531-693 | exact |
| `src/lib/auth-context.tsx` | provider | event-driven | FBG `src/contexts/AuthContext.tsx` | exact |
| `src/lib/api.ts` | service | request-response | self (patch `createOrder`) | exact |
| `src/app/login/page.tsx` | component | request-response | self (patch: `setAuth` replace `refresh`) | exact |
| `src/app/login/register/page.tsx` | component | request-response | self (patch: terms checkbox + ARM register body) | exact |
| `src/app/login/forgot-password/page.tsx` | component | request-response | self (patch: import only) | exact |
| `src/app/login/reset-password/page.tsx` | component | request-response | self (patch: import only) | exact |
| `src/app/account/page.tsx` | component | request-response | self (patch: `isLogged` → `customer`, `logout` → `signOut`) | exact |
| `src/app/account/orders/page.tsx` | component | CRUD | self (rewrite data-layer: ARM shape, fmtMoney) | exact |
| `src/app/account/orders/[id]/page.tsx` | component | CRUD | self (rewrite data-layer: ARM shape) | exact |
| `src/app/account/settings/page.tsx` | component | CRUD | self (patch: `isLogged`→`customer`, add GDPR zone) | exact |
| `src/app/account/addresses/page.tsx` | component | CRUD | `src/app/account/orders/page.tsx` (same auth-guard + fetch pattern) | role-match |
| `src/app/reset-password/page.tsx` | component | request-response | `src/app/login/reset-password/page.tsx` (shim variant) | role-match |
| `src/app/checkout/page.tsx` | component | request-response | self (patch: add prefill + savedAddresses) | exact |

---

## Pattern Assignments

### `src/lib/auth.ts` (service, request-response) — REWRITE

**Analogs:** current file (baseline) + FBG `~/work/puz/FBG/src/lib/api.ts` §§531-693

**Current state (lines 1-48 of current file — to replace):**
```typescript
// TOKEN_KEY = 'sf_token'  ← MUST become 'arm_token'
// getMe() calls clearToken() on any error  ← MUST be replaced with isAuthFailure guard
// logout() calls window.location.href = '/'  ← MUST be replaced with state-only signOut
```

**New imports pattern** — keep existing `import { api } from './api'`:
```typescript
import { api } from './api';
```

**New TOKEN_KEY + migration** (replaces lines 34-47):
```typescript
export const TOKEN_KEY = 'arm_token';

/** One-time migration: sf_token → arm_token for existing logged-in users. */
export function migrateToken(): void {
  if (typeof window === 'undefined') return;
  const old = localStorage.getItem('sf_token');
  if (old) { localStorage.setItem('arm_token', old); localStorage.removeItem('sf_token'); }
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string): void { localStorage.setItem(TOKEN_KEY, token); }
export function clearToken(): void { localStorage.removeItem(TOKEN_KEY); }
```

**isAuthFailure guard** (new, replaces catch-all clearToken pattern — RESEARCH Pattern 1):
```typescript
export function isAuthFailure(err: unknown): boolean {
  if (err && typeof err === 'object' && 'response' in err) {
    const status = (err as { response?: { status?: number } }).response?.status;
    return status === 401 || status === 403;
  }
  return false;
}
```

**bearerHeader helper** (new — RESEARCH Pattern 3):
```typescript
export function bearerHeader(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
```

**New ARM types** (replace old Customer / CustomerAddress / OrderSummary / OrderDetail — from RESEARCH.md §ARM Types):
```typescript
export type { AuthCustomer as Customer };  // alias for page compatibility
export interface AuthCustomer { id: string; name: string; email: string; phone: string | null; }
export interface LoyaltyData { loyalty_points: number; loyalty_tier: number; total_spent: number; }
export interface CustomerAddress {
  id: string; label: string | null; country: string | null; state: string | null;
  city: string | null; address: string | null; street: string | null;
  building: string | null; block: string | null; apartment: string | null;
  postal_code: string | null; contact_name: string | null; contact_phone: string | null;
  is_default: boolean;
}
export interface CustomerOrder {
  id: string; number: string; total: number | string; vat_amount: number | string | null;
  currency: string; date_created: string; track_number: string | null; track_url: string | null;
  status: { code: string; name: string; color: string } | null;
  items: Array<{ id: string; quantity: number; unit_price: number; product: { name: string } | null }>;
}
export interface LoginResult {
  token: string; customer: AuthCustomer; loyalty?: LoyaltyData; needsReset?: boolean; message?: string;
}
```

**TERMS_VERSION constant** (AUTH-01 / D-07):
```typescript
export const TERMS_VERSION = '2026-06-30';  // bump when legal copy changes (GDPR Art.7 accountability)
```

**New register() — adds terms_accepted + terms_version** (replaces lines 53-61):
```typescript
export async function register(data: {
  name: string; email: string; phone?: string; password: string;
  terms_accepted: boolean; terms_version: string;
}): Promise<{ message: string }> {
  const res = await api.post('/auth/register', data);
  return res.data;
}
```

**New login() — returns LoginResult, does NOT call setToken** (replaces lines 63-72; token stored by AuthContext.setAuth):
```typescript
export async function login(loginValue: string, password: string): Promise<LoginResult> {
  const res = await api.post('/auth/login', { login: loginValue, password });
  return res.data;
}
```

**New getMe() — uses bearerHeader, isAuthFailure guard, throws on error** (replaces lines 99-114):
```typescript
export async function getMe(): Promise<{ customer: AuthCustomer; loyalty: LoyaltyData | null }> {
  const res = await api.get('/auth/me', { headers: bearerHeader() });
  return { customer: res.data.customer, loyalty: res.data.loyalty ?? null };
}
```

**New protected account functions** — same path prefix `/auth/me/...`, add bearerHeader (updates lines 146-204):
```typescript
export async function getMyAddresses(): Promise<{ data: CustomerAddress[] }> {
  const res = await api.get('/auth/me/addresses', { headers: bearerHeader() });
  return res.data;
}
export async function addMyAddress(addr: Partial<CustomerAddress>): Promise<{ data: CustomerAddress }> {
  const res = await api.post('/auth/me/addresses', addr, { headers: bearerHeader() });
  return res.data;
}
export async function deleteMyAddress(id: string): Promise<void> {
  await api.delete(`/auth/me/addresses/${id}`, { headers: bearerHeader() });
}
export async function getMyOrders(page = 1, limit = 10): Promise<{
  data: CustomerOrder[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}> {
  const res = await api.get('/auth/me/orders', { headers: bearerHeader(), params: { page, limit } });
  return res.data;
}
export async function getMyOrder(id: string): Promise<{ data: CustomerOrder }> {
  const res = await api.get(`/auth/me/orders/${id}`, { headers: bearerHeader() });
  return res.data;
}
export async function updateProfile(data: { name?: string; phone?: string }): Promise<AuthCustomer> {
  const res = await api.patch('/auth/me/profile', data, { headers: bearerHeader() });
  return res.data.customer;
}
export async function changePassword(data: { currentPassword: string; newPassword: string }): Promise<{ message: string }> {
  const res = await api.post('/auth/me/change-password', data, { headers: bearerHeader() });
  return res.data;
}
export async function exportAccount(): Promise<Record<string, unknown>> {
  const res = await api.get('/auth/me/export', { headers: bearerHeader() });
  return res.data;
}
export async function deleteAccount(data: { password?: string }): Promise<{ message: string }> {
  const res = await api.post('/auth/me/delete-account', data, { headers: bearerHeader() });
  return res.data;
}
```

---

### `src/lib/auth-context.tsx` (provider, event-driven) — REWRITE

**Analog:** FBG `~/work/puz/FBG/src/contexts/AuthContext.tsx` (entire file, read above)

**Key differences from current ACTR:** replace `isLogged/address/refresh/logout` API with `token/loyalty/setAuth/signOut/refreshProfile`.

**Full rewrite pattern** (adapted from FBG, Next.js SSR-safe lazy init — RESEARCH Pattern 2):
```typescript
'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { getMe, isAuthFailure, migrateToken, TOKEN_KEY, type AuthCustomer, type LoyaltyData } from './auth';

interface AuthContextType {
  customer: AuthCustomer | null;
  loyalty: LoyaltyData | null;
  token: string | null;
  loading: boolean;
  setAuth: (token: string, customer: AuthCustomer, loyalty?: LoyaltyData | null) => void;
  signOut: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // lazy init — prevents SSR mismatch
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    migrateToken();  // one-time sf_token → arm_token migration
    return localStorage.getItem(TOKEN_KEY);
  });
  const [customer, setCustomer] = useState<AuthCustomer | null>(null);
  const [loyalty, setLoyalty] = useState<LoyaltyData | null>(null);
  const [loading, setLoading] = useState(!!token);

  const setAuth = useCallback((t: string, c: AuthCustomer, l?: LoyaltyData | null) => {
    localStorage.setItem(TOKEN_KEY, t);
    setToken(t); setCustomer(c);
    if (l !== undefined) setLoyalty(l ?? null);
  }, []);

  const signOut = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null); setCustomer(null); setLoyalty(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!token) return;
    try {
      const { customer: c, loyalty: l } = await getMe();
      setCustomer(c); setLoyalty(l ?? null);
    } catch (e) {
      if (isAuthFailure(e)) signOut();
      // network/5xx: keep session intact (FBG-50 / D-04)
    }
  }, [token, signOut]);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    getMe()
      .then(({ customer: c, loyalty: l }) => { setCustomer(c); setLoyalty(l ?? null); setLoading(false); })
      .catch((e) => { if (isAuthFailure(e)) signOut(); setLoading(false); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AuthContext.Provider value={{ customer, loyalty, token, loading, setAuth, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}
```

---

### `src/lib/api.ts` (service, request-response) — PATCH (D-06)

**Analog:** self (`src/lib/api.ts` lines 192-316, read above)

**Only change:** add `bearerHeader()` import and pass it in `createOrder()`:

```typescript
// Add import at top of function section:
import { bearerHeader } from './auth';

// Patch createOrder() — add bearerHeader() to headers (line 314):
export async function createOrder(payload: CreateOrderPayload): Promise<ArmOrderCreateResponse> {
  const body = { /* unchanged */ };
  const { data } = await api.post('/orders', body, {
    headers: { ...currencyHeader(), ...bearerHeader() },  // bearerHeader() is empty {} for guests
  });
  return data;
}
```

Proxy already forwards `Authorization` header from the incoming request (route.ts line 29-30: `const auth = req.headers.get('authorization'); if (auth) headers['Authorization'] = auth;`). The bearer token only needs to be in the outgoing fetch headers — which `bearerHeader()` provides.

---

### `src/app/login/page.tsx` (component, request-response) — PATCH

**Analog:** self (current file, read above lines 57-109)

**Current `useAuth()` usage at line 73:** `const { refresh } = useAuth();`
**New usage:** `const { setAuth } = useAuth();`

**Current handleSubmit pattern (lines 88-102) — replace:**
```typescript
// BEFORE (calls auth.login which also calls setToken internally):
const res = await doLogin({ login, password });
await refresh();
router.push('/');

// AFTER (setAuth stores token+customer+loyalty in context; no side-effect in login()):
const res = await doLogin(login, password);  // login() in new auth.ts takes (login, password) not object
if (res.needsReset) { /* same needsReset handling as before */ return; }
setAuth(res.token, res.customer, res.loyalty);
router.push('/');
```

**Import change** (line 20-21):
```typescript
// BEFORE:
import { login as doLogin, type NeedsResetResponse } from '@/lib/auth';
// AFTER:
import { login as doLogin } from '@/lib/auth';
import type { LoginResult } from '@/lib/auth';
```

---

### `src/app/login/register/page.tsx` (component, request-response) — PATCH

**Analog:** self (current file, read above lines 71-160)

**Add state** (after existing `const [loading, setLoading] = useState(false)` line 79):
```typescript
const [agreed, setAgreed] = useState(false);
const { setAuth } = useAuth();
```

**Add import:**
```typescript
import { register, login as doLogin, TERMS_VERSION } from '@/lib/auth';
import { useAuth } from '@/lib/auth-context';
```

**Gate on terms in handleSubmit** (before line 145 `setLoading(true)`):
```typescript
if (!agreed) {
  setSnack({ open: true, message: 'Please accept the Terms & Privacy Policy to register.', severity: 'error' });
  return;
}
```

**Send terms in register call** (lines 146-153):
```typescript
// BEFORE:
await register({ name: name.trim(), email: email.trim().toLowerCase(), phone: phone || undefined, password });
setSnack({ open: true, message: res.message, severity: 'success' });
setTimeout(() => router.push('/login'), 1500);

// AFTER — auto-login after register (FBG pattern):
await register({
  name: name.trim(), email: email.trim().toLowerCase(), phone: phone || undefined, password,
  terms_accepted: true, terms_version: TERMS_VERSION,
});
const loginRes = await doLogin(email.trim().toLowerCase(), password);
setAuth(loginRes.token, loginRes.customer, loginRes.loyalty);
router.push('/');
```

**Add terms checkbox** (before the Submit Button, after the ConfirmPassword FieldBlock):
```typescript
<FormControlLabel
  control={
    <Checkbox
      checked={agreed}
      onChange={(e) => setAgreed(e.target.checked)}
      sx={{ color: palette.primaryLight, '&.Mui-checked': { color: palette.primary } }}
    />
  }
  label={
    <Typography sx={{ fontFamily: fontMain, fontSize: { xs: 13, md: 15 }, color: palette.primary }}>
      I agree to the{' '}
      <Link href="/terms" style={{ color: palette.primary }}>Terms of Service</Link>
      {' '}and{' '}
      <Link href="/privacy" style={{ color: palette.primary }}>Privacy Policy</Link>
    </Typography>
  }
  sx={{ mb: 1, alignItems: 'flex-start' }}
/>
```

**Update isValid** (line 163 — add `agreed`):
```typescript
const isValid = name && email && phone && password && confirmPassword && captchaInput && agreed;
```

---

### `src/app/login/forgot-password/page.tsx` (component, request-response) — PATCH (import only)

**Analog:** self — paths `/auth/forgot-password` unchanged in new auth.ts, only verify the import points to `@/lib/auth`.

No structural change needed — `forgotPassword()` signature and path are identical in new auth.ts.

---

### `src/app/login/reset-password/page.tsx` (component, request-response) — PATCH (import only)

**Analog:** self — same as forgot-password: `resetPassword(token, password)` signature unchanged.

No structural change needed.

---

### `src/app/account/page.tsx` (component, request-response) — PATCH

**Analog:** self (lines 35-40, read above)

**useAuth destructure change** (line 36):
```typescript
// BEFORE:
const { customer, isLogged, loading, logout } = useAuth();
// AFTER:
const { customer, loading, signOut } = useAuth();

// Auth guard change (line 40):
// BEFORE: if (!loading && !isLogged) router.replace('/login');
// AFTER:  if (!loading && !customer) router.replace('/login');

// Logout button: replace logout() with signOut() + router.push('/'):
// BEFORE: onClick={logout}
// AFTER:  onClick={() => { signOut(); router.push('/'); }}
```

Also add "Адреса доставки" menu item pointing to `/account/addresses` (alongside existing items at line 14).

---

### `src/app/account/orders/page.tsx` (component, CRUD) — REWRITE data-layer

**Analog:** self (lines 1-53, read above) — keep layout/UI, replace data-layer

**Import changes:**
```typescript
// BEFORE:
import { useAuth } from '@/lib/auth-context';
import { getMyOrders, type OrderSummary } from '@/lib/auth';
// + CDEK_TRACK_URL constant line 29

// AFTER:
import { useAuth } from '@/lib/auth-context';
import { getMyOrders, type CustomerOrder } from '@/lib/auth';
import { fmtMoney } from '@/lib/money';
// Remove: const CDEK_TRACK_URL = '...'
```

**Auth-guard pattern** (lines 39-41) — replace `isLogged` with `customer`:
```typescript
// BEFORE: const { isLogged, loading: authLoading } = useAuth();
// AFTER:  const { customer, loading: authLoading } = useAuth();

// guard: if (!authLoading && !isLogged) → if (!authLoading && !customer)
// useEffect dep: [isLogged, page] → [customer, page] ; condition: if (!isLogged) → if (!customer)
```

**Currency format** — wherever `order.total` is rendered with `₽`:
```typescript
// BEFORE: {order.total?.toLocaleString('ru-RU')} ₽
// AFTER:  {fmtMoney(Number(order.total), order.currency)}
```

**Tracking link** — replace CDEK logic with `track_url`:
```typescript
// BEFORE: CDEK_TRACK_URL + order.track_number
// AFTER:
{order.track_url && (
  <Tooltip title="Track shipment">
    <IconButton component="a" href={order.track_url} target="_blank" rel="noopener">
      <LocalShipping fontSize="small" />
    </IconButton>
  </Tooltip>
)}
```

**Remove:** `delivery_service` column from table.

---

### `src/app/account/orders/[id]/page.tsx` (component, CRUD) — REWRITE data-layer

**Analog:** `src/app/account/orders/page.tsx` (same auth-guard pattern)

Same changes as orders/page.tsx:
- `isLogged` → `customer` in auth guard
- `getMyOrder(id)` returns `{ data: CustomerOrder }` — unwrap `.data`
- Replace `order.delivery_service` references with `order.track_url`
- Replace `₽` formatting with `fmtMoney(Number(order.total), order.currency)`
- Remove OMS fields: `delivery_tariff_type`, `delivery_service`, CDEK-specific tracking

**Import:**
```typescript
import { getMyOrder, type CustomerOrder } from '@/lib/auth';
import { fmtMoney } from '@/lib/money';
```

---

### `src/app/account/settings/page.tsx` (component, CRUD) — PATCH

**Analog:** self (lines 1-58, read above)

**Auth context change** (line 33):
```typescript
// BEFORE: const { customer, isLogged, loading: authLoading, refresh } = useAuth();
// AFTER:  const { customer, loading: authLoading, refreshProfile, signOut } = useAuth();

// guard: !isLogged → !customer
// After profile save: refresh() → refreshProfile()
```

**Add GDPR Danger Zone section** (after existing change-password section — RESEARCH Pattern 6 + FBG `AccountSettingsPage.tsx`):
```typescript
{/* GDPR Danger Zone */}
<Box sx={{ mt: 4, pt: 3, borderTop: `1px solid ${palette.primaryLight}` }}>
  <Typography sx={{ fontFamily: fontMain, fontWeight: 500, fontSize: { xs: 16, md: 20 }, color: 'error.main', mb: 2 }}>
    Data & Privacy
  </Typography>

  {/* Export */}
  <Button variant="outlined" color="primary" onClick={handleExport} sx={{ mr: 2, mb: 2 }}>
    Download My Data
  </Button>

  {/* Delete with password confirmation dialog */}
  <Button variant="outlined" color="error" onClick={() => setDeleteDialogOpen(true)} sx={{ mb: 2 }}>
    Delete Account
  </Button>
</Box>
```

**Export handler** (RESEARCH Pattern 6):
```typescript
const handleExport = async () => {
  try {
    const data = await exportAccount();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'american-creator-account-data.json';
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  } catch { setSnack({ open: true, message: 'Export failed. Try again.', severity: 'error' }); }
};
```

**Delete handler** (with password confirm dialog, then signOut + redirect):
```typescript
const handleDeleteAccount = async () => {
  try {
    await deleteAccount({ password: deletePassword });
    signOut();
    router.push('/');
  } catch (err: any) {
    const msg = err?.response?.data?.error || 'Could not delete account.';
    setSnack({ open: true, message: msg, severity: 'error' });
  }
};
```

**Add imports:**
```typescript
import { updateProfile, changePassword, exportAccount, deleteAccount } from '@/lib/auth';
```

---

### `src/app/account/addresses/page.tsx` (component, CRUD) — CREATE

**Analog:** `src/app/account/orders/page.tsx` (auth-guard pattern + fetch-on-mount + MUI layout)

**Auth-guard pattern** (copy from orders/page.tsx lines 39-41, adapt):
```typescript
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { getMyAddresses, addMyAddress, deleteMyAddress, type CustomerAddress } from '@/lib/auth';

export default function AddressesPage() {
  const { customer, loading: authLoading } = useAuth();
  const router = useRouter();
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !customer) router.replace('/login');
  }, [authLoading, customer, router]);

  useEffect(() => {
    if (!customer) return;
    setLoading(true);
    getMyAddresses()
      .then(({ data }) => setAddresses(data || []))
      .catch(() => setAddresses([]))
      .finally(() => setLoading(false));
  }, [customer]);

  const handleDelete = async (id: string) => {
    await deleteMyAddress(id);
    setAddresses((prev) => prev.filter((a) => a.id !== id));
  };
  // ... MUI render — layout mirrors orders/page.tsx card-per-item style
}
```

---

### `src/app/reset-password/page.tsx` (component, request-response) — CREATE (redirect shim)

**Analog:** `src/app/login/reset-password/page.tsx`

**Purpose:** BFF generates reset links as `${ARM_STOREFRONT_URL}/reset-password?token=X` but ACTR page is at `/login/reset-password`. This shim redirects transparently (Pitfall 3 from RESEARCH).

```typescript
'use client';
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function ResetPasswordRedirect() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const token = params.get('token');
    router.replace(`/login/reset-password${token ? `?token=${token}` : ''}`);
  }, [router, params]);

  return null;  // renders nothing — immediate redirect
}
```

---

### `src/app/checkout/page.tsx` (component, request-response) — PATCH (D-06)

**Analog:** self (lines 1-50, read above) — already imports `useAuth`, `getMyAddresses`, `deleteMyAddress`

The checkout page already imports `getMyAddresses` and `useAuth`. The D-06 integration is already partially in place (these imports exist). What needs to be added / verified:

**`useAuth` destructure — add `customer`** (already `const { ... } = useAuth()` exists — confirm `customer` is destructured):
```typescript
const { customer } = useAuth();
```

**Add state for prefill** (if not present):
```typescript
const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
```

**Prefill from customer** (add useEffect if not present — RESEARCH Pattern 5):
```typescript
useEffect(() => {
  if (!customer) return;
  const [first, ...rest] = (customer.name || '').split(' ');
  setShipping(prev => ({
    ...prev,
    firstName: prev.firstName || first || '',
    lastName: prev.lastName || rest.join(' ') || '',
    email: prev.email || customer.email || '',
    phone: prev.phone || customer.phone || '',
  }));
}, [customer]);
```

**`createOrder()` in api.ts now includes bearerHeader** (guest gets empty `{}`, authenticated user gets `Authorization` header automatically — no change needed in checkout page itself).

---

## Shared Patterns

### Auth Guard (applies to all `/account/*` pages)
**Source:** `src/app/account/orders/page.tsx` lines 39-41 (current), adapted
```typescript
const { customer, loading: authLoading } = useAuth();
// ...
useEffect(() => {
  if (!authLoading && !customer) router.replace('/login');
}, [authLoading, customer, router]);

if (authLoading) return null;
```

### Bearer Header (applies to all protected API calls in auth.ts)
**Source:** FBG `~/work/puz/FBG/src/lib/api.ts` (authHeaders pattern), RESEARCH Pattern 3
```typescript
export function bearerHeader(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
// Usage: api.get('/auth/me/...', { headers: bearerHeader() })
```

### Snackbar Error Display (applies to all form pages)
**Source:** `src/app/login/page.tsx` lines 63-70, 461-474 (current)
```typescript
const [snack, setSnack] = useState<{ open: boolean; message: string; severity: 'error' | 'info' | 'success' }>({
  open: false, message: '', severity: 'info',
});
// setSnack({ open: true, message: err?.response?.data?.error || 'Error.', severity: 'error' });
```

### fmtMoney for TRY formatting (applies to orders/page.tsx, orders/[id]/page.tsx)
**Source:** `src/lib/money.ts` (exists from Phase 2)
```typescript
import { fmtMoney } from '@/lib/money';
// Usage: fmtMoney(Number(order.total), order.currency)
// Replaces: {order.total?.toLocaleString('ru-RU')} ₽
```

### FBG-50 Session Guard (applies to auth-context.tsx and auth.ts)
**Source:** FBG `~/work/puz/FBG/src/contexts/AuthContext.tsx` lines 8-9 (read above)
```typescript
// Only 401/403 drop the session. Network errors and 5xx do NOT log out.
if (isAuthFailure(e)) signOut();
// no else — keep session on 5xx/network
```

---

## No Analog Found

All files have close analogs. No gaps.

---

## Critical Anti-Patterns (from RESEARCH.md)

1. `catch { clearToken(); }` in getMe — replace with `isAuthFailure` guard (Pitfall 1)
2. `window.location.href = '/'` in logout — replace with state-only `signOut()` (current `auth-context.tsx` line 56: `doLogout()` calls `window.location.href`)
3. `delivery_service` / `CDEK` / `₽` in orders pages — grep targets for cleanup (Pitfalls 6, 7)
4. `isLogged` in account pages — replace with `customer` boolean check
5. Missing `terms_accepted + terms_version` in register body — gate by checkbox (Pitfall 4)

---

## Metadata

**Analog search scope:** `src/lib/`, `src/app/login/`, `src/app/account/`, `src/app/checkout/`, `src/app/api/`, `~/work/puz/FBG/src/`
**Files scanned:** 12 ACTR source files + FBG AuthContext.tsx
**Pattern extraction date:** 2026-06-30
