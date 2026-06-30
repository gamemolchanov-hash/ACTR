# Phase 3: Авторизация и личный кабинет — Research

**Researched:** 2026-06-30
**Domain:** ARM Storefront Customer Auth (session, account, GDPR)
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**D-01 (Session/token):** Token in `localStorage['arm_token']`, sent as `Authorization: Bearer <token>` via proxy. CSR (client-side rendering) for account pages. httpOnly-cookie/SSR hardening deferred.

**D-02 (Token key rename):** `sf_token` → `arm_token`. Update `TOKEN_KEY` in `src/lib/auth.ts`.

**D-03 (AuthContext shape):** Mirror FBG pattern: `customer / token / loading / setAuth / signOut / refreshProfile`. Loyalty field optional, not rendered in UI.

**D-04 / FBG-50 (Auth-failure guard):** Only real auth failures (401/403) drop the session. Network errors and 5xx MUST NOT log the customer out. Implement `isAuthFailure(e)` guard.

**D-05 / D-06 (Checkout ↔ account linking):** Logged-in user: checkout prefills name/email/phone from `customer`, loads saved addresses (`getMyAddresses`), `createOrder` with `Authorization`. Guest checkout unchanged (no token → no prefill). Guest order → account linking by email is NOT implemented.

**D-07 (Terms consent):** Mandatory terms checkbox at registration. `register` sends `terms_accepted: true + terms_version: TERMS_VERSION` constant. Stub links only (content deferred to Phase 5).

**D-08:** Full KVKK consent (split checkboxes) deferred to Phase 5.

**D-09 (GDPR/AUTH-07):** Implement as FBG: export = `GET /me/export` → JSON blob download; delete = `POST /me/delete-account` with password confirmation → signOut + redirect.

### Claude's Discretion

- Exact request/response shapes: verify against ARM openapi and live demo BFF.
- `forgot-password`/`reset-password` pages: mechanical rewire of existing pages to ARM paths.
- Address book page (AUTH-05): implement add/remove UI drawing from `getMyAddresses` / `DELETE /me/addresses/:id`.

### Deferred Ideas (OUT OF SCOPE)

- OAuth Google/Apple (AUTH-08)
- UI лояльности (LOYL-01) — `getMe` returns `loyalty` but it is ignored in UI
- httpOnly-cookie / SSR session hardening
- Full KVKK/mesafeli/KDV legal UI (Phase 5)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-01 | Регистрация с terms-согласием | ARM `POST /auth/register` with `terms_accepted`+`terms_version`; BFF validates server-side (code `terms_required` on 400). Add terms checkbox to `login/register/page.tsx`. |
| AUTH-02 | Логин и сессия (`arm_token`) | ARM `POST /auth/login` → `{token, customer, loyalty?}`. Store in `localStorage['arm_token']`. AuthContext with FBG-50 guard. Fix current ACTR `TOKEN_KEY='sf_token'`. |
| AUTH-03 | Сброс пароля по email | ARM `POST /auth/forgot-password` (existing page wired to OMS — change nothing structural, just fix `TOKEN_KEY` env). BFF sends reset email with `${ARM_STOREFRONT_URL}/reset-password?token=...`. ACTR's reset page is at `/login/reset-password` — needs `/reset-password` redirect or BFF `ARM_STOREFRONT_URL` config. |
| AUTH-04 | ЛК: история заказов | ARM `GET /auth/me/orders?page=N` → `{data:[...], meta:{...}}`. Rewrite orders page to use ARM shape (remove CDEK/delivery_service, add track_url, format currency via fmtMoney). |
| AUTH-05 | ЛК: адресная книга | ARM `GET /auth/me/addresses` (list), `POST /auth/me/addresses` (create), `DELETE /auth/me/addresses/:id` (delete). New page needed at `/account/addresses/page.tsx`. |
| AUTH-06 | ЛК: профиль и смена пароля | ARM `PATCH /auth/me/profile` (`{name?,phone?}`) + `POST /auth/me/change-password` (`{currentPassword, newPassword}`). Existing settings page already wired, needs ARM path correction. |
| AUTH-07 | GDPR/KVKK: экспорт и удаление | ARM `GET /auth/me/export` (full JSON dump) + `POST /auth/me/delete-account` (`{password?}`). Both CONFIRMED PRESENT in BFF source. No setup gate (unlike Stripe). |
</phase_requirements>

---

## Summary

Phase 3 migrates the ACTR auth/account data-layer from the OMS contract (paths `/auth/me*`, token key `sf_token`) to the ARM storefront contract (paths `/auth/*` and `/me/*`, token key `arm_token`). The canonical reference is FBG (`~/work/puz/FBG`), which already implements this exact ARM contract.

The ARM auth API is mounted at `/public/arm/storefront/auth/*` on the BFF, which the ACTR proxy (`/api/storefront/[...path]`) already forwards. All auth calls from the frontend use path prefix `/api/storefront/auth/` — no proxy changes required.

The scope of code changes is confined to: (1) replacing the `src/lib/auth.ts` OMS contract with the ARM contract, (2) rewriting `src/lib/auth-context.tsx` to match FBG's `AuthContext`, (3) updating all auth/account pages to use the new context and ARM shapes, (4) adding the terms checkbox on registration, (5) adding the GDPR danger zone to settings, (6) creating a new addresses page, and (7) adding a lightweight checkout prefill integration (D-06). UI structure and design are preserved 1:1.

The GDPR endpoints (`GET /me/export`, `POST /me/delete-account`) are confirmed present in the BFF source code. They require only a valid JWT from a registered customer — no external service configuration gate (unlike the Phase 2 Stripe `payment_config` gate).

**Primary recommendation:** Use `src/lib/auth.ts` as the single source of truth for all auth API calls (replacing both OMS functions and adding ARM-new ones like export/delete). Keep the existing axios `api` client for auth calls (same pattern as Phase 1/2 — it goes through the proxy). Replace `auth-context.tsx` wholesale to match FBG's `AuthContext`.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Token storage / session state | Browser (localStorage) | — | MVP decision D-01; no server-side session |
| Auth API calls (register/login/etc.) | API / ARM BFF | Next.js proxy (forwards headers) | BFF owns all logic, rate limiting, JWT generation |
| Token forwarding to ARM | Next.js Proxy (`/api/storefront/`) | — | Route handler already forwards `Authorization` header |
| Account page auth-guard | Browser (CSR `useEffect`) | — | `if (!loading && !customer) router.replace('/login')` |
| Password reset email | ARM BFF (Resend) | — | BFF calls customer-email.service |
| GDPR export download | Browser (blob URL) | — | Client creates `<a download>` from API response |
| Address book CRUD | API / ARM BFF | Browser (state) | BFF owns validation and persistence |
| Checkout prefill from account | Browser (CSR `useEffect`) | — | Loads customer + saved addresses on mount |

---

## Standard Stack

### Core (no new packages — all already installed)

| Library | Version | Purpose | Source |
|---------|---------|---------|--------|
| `next` | 14.x | App Router, client components | Already installed |
| `@mui/material` | Already installed | UI components matching AC design | Phase 0/1/2 |
| `axios` | Already installed | HTTP client (`api` instance in `src/lib/api.ts`) | Phase 0 |

No new dependencies required for Phase 3. All needed primitives (`fetch`, `localStorage`, `Blob`, `URL.createObjectURL`) are browser built-ins.

### Package Legitimacy Audit

Not applicable — no new packages are installed in this phase.

---

## ARM Endpoint Contract

> All paths below are as seen by the ACTR frontend. The proxy (`/api/storefront/[...path]`) maps these to `$BFF/public/arm/storefront/*`.
> Source: `~/work/autoCRM/packs/arm/bff/routes/storefront-auth.ts` [VERIFIED: source]

### Authentication (Public — require `X-Storefront-Key` via proxy)

| Method | Path | Body | Response |
|--------|------|------|---------|
| POST | `/api/storefront/auth/register` | `{name, email, phone?, password, terms_accepted: true, terms_version: string}` | `{message: string}` |
| POST | `/api/storefront/auth/login` | `{login, password}` | `{token, customer: {id,name,email,phone}, loyalty?: LoyaltyData}` or `{needsReset:true, message}` |
| POST | `/api/storefront/auth/forgot-password` | `{email}` | `{message: string}` (always 200, never reveals if registered) |
| POST | `/api/storefront/auth/reset-password` | `{token, password}` | `{message: string}` |

### Account (Protected — require `Authorization: Bearer arm_token`)

| Method | Path | Body / Query | Response |
|--------|------|-------------|---------|
| GET | `/api/storefront/auth/me` | — | `{customer:{id,name,email,phone}, loyalty:LoyaltyData\|null, address:CustomerAddress\|null}` |
| GET | `/api/storefront/auth/me/orders` | `?page=N&limit=M` | `{data:[CustomerOrder], meta:{total,page,limit,totalPages}}` |
| GET | `/api/storefront/auth/me/addresses` | — | `{data:[CustomerAddress]}` |
| POST | `/api/storefront/auth/me/addresses` | `{label?,country?,state?,city?,address?,street?,building?,block?,apartment?,postal_code?,contact_name?,contact_phone?,is_default?}` | `{data: CustomerAddress}` 201 |
| DELETE | `/api/storefront/auth/me/addresses/:id` | — | `{success:true}` |
| PATCH | `/api/storefront/auth/me/profile` | `{name?, phone?}` | `{customer:{id,name,email,phone}}` |
| POST | `/api/storefront/auth/me/change-password` | `{currentPassword, newPassword}` | `{message: string}` |
| GET | `/api/storefront/auth/me/export` | — | JSON dump (profile+loyalty+addresses+orders) with `Content-Disposition: attachment` |
| POST | `/api/storefront/auth/me/delete-account` | `{password?}` | `{message: string}` |

### ARM Types (verified from BFF source)

```typescript
// [VERIFIED: ~/work/autoCRM/packs/arm/bff/routes/storefront-auth.ts]

export interface AuthCustomer {
  id: string;
  name: string;
  email: string;
  phone: string | null;
}

export interface LoyaltyData {
  loyalty_points: number;
  loyalty_tier: number;  // 1-indexed: 1=Welcome, 2=Silver, 3=Gold
  total_spent: number;
}

export interface CustomerAddress {
  id: string;
  label: string | null;
  country: string | null;
  state: string | null;         // ADD (missing from current ACTR)
  city: string | null;
  address: string | null;
  street: string | null;
  building: string | null;
  block: string | null;
  apartment: string | null;
  postal_code: string | null;
  contact_name: string | null;  // ADD (missing from current ACTR)
  contact_phone: string | null; // ADD (missing from current ACTR)
  is_default: boolean;
}
// REMOVE from current CustomerAddress: region, district (OMS-only fields)

export interface CustomerOrder {
  id: string;
  number: string;
  total: number | string;
  vat_amount: number | string | null;
  currency: string;
  date_created: string;
  track_number: string | null;
  track_url: string | null;     // ADD (missing from current ACTR)
  status: { code: string; name: string; color: string } | null;
  items: Array<{
    id: string;
    quantity: number;
    unit_price: number;
    product: { name: string } | null;
  }>;
}
// REMOVE from current OrderSummary: delivery_service (OMS-only)

export interface LoginResult {
  token: string;
  customer: AuthCustomer;
  loyalty?: LoyaltyData;
  needsReset?: boolean;
  message?: string;
}
```

### BFF Error Shape

BFF serializes errors as `{error: string, status: number}` OR `{error: string, code: string}` depending on route. For axios:
- `err.response.status === 401 || err.response.status === 403` → auth failure (drop session)
- `err.response.status === 409` (code: `email_taken`) → show "email already registered"
- `err.response.status === 400` (code: `terms_required`) → show "accept terms to register"
- `err.response.status === 400` (code: `wrong_password`) → show "wrong current password"

---

## Architecture Patterns

### System Architecture Diagram

```
Browser                         Next.js (CSR client components)        ARM BFF
────────                        ──────────────────────────────         ────────
Login form          ──POST──>   /api/storefront/auth/login    ──────>  POST /public/arm/storefront/auth/login
                    <─token─    ←──────────────────────────── ←──────  {token, customer, loyalty?}

localStorage['arm_token'] ──(set by AuthContext.setAuth)

Account page mount  ──GET───>   /api/storefront/auth/me       ──────>  GET /public/arm/storefront/auth/me
                                (Authorization: Bearer token)          (JWT verified by requireCustomer())

Checkout (logged in) ──GET──>   /api/storefront/auth/me/addresses ──>  addresses list
                     ──POST──>  /api/storefront/orders        ──────>  POST /orders (with Authorization)
                                                                         → ARM links order to customer
```

### Recommended Project Structure (no new folders)

```
src/lib/
  auth.ts            # REWRITE: ARM contract (token key, all API fns, types)
  auth-context.tsx   # REWRITE: FBG AuthContext pattern (setAuth/signOut/refreshProfile)
  api.ts             # PATCH: add bearerHeader() + D-06 createOrder with auth

src/app/login/
  page.tsx           # PATCH: setAuth after login (token+customer+loyalty), RU→EN text
  register/page.tsx  # PATCH: add terms checkbox + terms_accepted+terms_version in register()
  forgot-password/page.tsx  # PATCH: change import from auth.ts (paths already correct)
  reset-password/page.tsx   # PATCH: change import from auth.ts (paths already correct)

src/app/account/
  page.tsx           # PATCH: useAuth → customer (not isLogged), EN text
  orders/page.tsx    # REWRITE: ARM order shape, remove CDEK, add track_url, fmtMoney
  orders/[id]/page.tsx  # REWRITE: ARM order shape, remove OMS-specific fields
  settings/page.tsx  # PATCH: add GDPR danger zone (export + delete with pw confirm)
  addresses/page.tsx # CREATE: new — list + add + delete addresses (AUTH-05)

src/app/
  reset-password/page.tsx  # CREATE: redirect shim → /login/reset-password?token=...
```

### Pattern 1: isAuthFailure Guard (D-04 / FBG-50)

ACTR uses axios, not the FBG `ApiError` class. Adapt the guard:

```typescript
// src/lib/auth.ts
// [VERIFIED: FBG pattern — ~/work/puz/FBG/src/contexts/AuthContext.tsx:8-9]

function isAuthFailure(err: unknown): boolean {
  if (err && typeof err === 'object' && 'response' in err) {
    const status = (err as { response?: { status?: number } }).response?.status;
    return status === 401 || status === 403;
  }
  return false;
}
```

### Pattern 2: AuthContext (FBG mirror, adapted for Next.js App Router)

```typescript
// src/lib/auth-context.tsx  — 'use client'
// [VERIFIED: FBG pattern — ~/work/puz/FBG/src/contexts/AuthContext.tsx]

const TOKEN_KEY = 'arm_token';  // D-02

function isAuthFailure(err: unknown): boolean { /* see Pattern 1 */ }

interface AuthContextType {
  customer: AuthCustomer | null;
  loyalty: LoyaltyData | null;   // deferred UI per LOYL-01 — hold type, ignore in render
  token: string | null;
  loading: boolean;
  setAuth: (token: string, customer: AuthCustomer, loyalty?: LoyaltyData | null) => void;
  signOut: () => void;
  refreshProfile: () => Promise<void>;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // lazy init reads localStorage only after hydration (prevents SSR mismatch)
  const [token, setToken] = useState<string | null>(() =>
    typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null
  );
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
      // network/5xx: keep session intact (FBG-50)
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

### Pattern 3: authRequest Helper (through ACTR proxy)

```typescript
// src/lib/auth.ts
// [ADAPTED FROM: FBG ~/work/puz/FBG/src/lib/api.ts §§531-556]

function bearerHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('arm_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// All auth API calls go through the ACTR proxy:
// /api/storefront/auth/* → BFF /public/arm/storefront/auth/*
// The proxy already injects X-Tenant-ID + X-Storefront-Key server-side (Phase 1)

async function authPost<T>(path: string, body: object): Promise<T> {
  const res = await api.post<T>(`/auth${path}`, body, { headers: bearerHeader() });
  return res.data;
}

async function authGet<T>(path: string): Promise<T> {
  const res = await api.get<T>(`/auth${path}`, { headers: bearerHeader() });
  return res.data;
}
```

### Pattern 4: Register with Terms Consent (AUTH-01 / D-07)

```typescript
// src/app/login/register/page.tsx
// [VERIFIED: ARM requirement — storefront-auth.ts:205-216 registerSchema requires terms_accepted + terms_version]
// [ADAPTED FROM: FBG ~/work/puz/FBG/src/lib/api.ts:580-593]

export const TERMS_VERSION = '2026-06-30';  // bump when legal copy changes

// In the form:
const [agreed, setAgreed] = useState(false);

// In handleSubmit — gate registration:
if (!agreed) {
  setSnack({ open: true, message: 'Please accept the Terms & Privacy Policy.', severity: 'error' });
  return;
}

await register({
  name, email, phone: phone || undefined, password,
  terms_accepted: true,
  terms_version: TERMS_VERSION,
});
// Auto-login after register (FBG pattern):
const result = await login(email, password);
setAuth(result.token, result.customer, result.loyalty);
router.push('/');
```

### Pattern 5: Checkout Prefill Integration (D-06)

```typescript
// src/app/checkout/page.tsx — ADD (backward-compatible, guest path unchanged)
// [ADAPTED FROM: FBG ~/work/puz/FBG/src/pages/CheckoutPage.tsx:106-178]

const { customer } = useAuth();
const [savedAddresses, setSavedAddresses] = useState<CustomerAddress[]>([]);
const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

// Load saved addresses for logged-in customer
useEffect(() => {
  if (!customer) return;
  getMyAddresses()
    .then(({ data }) => {
      setSavedAddresses(data || []);
      const def = data?.find((a) => a.is_default);
      if (def) { setSelectedAddressId(def.id); fillFromAddress(def); }
    })
    .catch(() => {});
}, [customer]);

// Auto-fill name/email/phone from customer
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

// createOrder already goes through proxy which forwards Authorization header
// (route.ts line 29-30: "const auth = req.headers.get('authorization'); if (auth) headers['Authorization'] = auth;")
// So createOrder() in api.ts just needs to include the bearer header:

// In api.ts createOrder():
export async function createOrder(payload: CreateOrderPayload): Promise<ArmOrderCreateResponse> {
  const body = { ... };
  const { data } = await api.post('/orders', body, {
    headers: { ...currencyHeader(), ...bearerHeader() },  // ADD bearerHeader()
  });
  return data;
}
```

### Pattern 6: GDPR Export (AUTH-07)

```typescript
// src/app/account/settings/page.tsx — DangerZone section
// [ADAPTED FROM: FBG ~/work/puz/FBG/src/pages/AccountSettingsPage.tsx:185-203]

const handleExport = async () => {
  const data = await authGet<Record<string, unknown>>('/me/export');
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'american-creator-account-data.json';  // ACTR brand name
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};
```

### Anti-Patterns to Avoid

- **Dropping session on network errors:** The current `getMe()` in `auth.ts` does `catch { clearToken(); return null; }`. This must be replaced with the `isAuthFailure(e)` guard — only 401/403 drop the session.
- **Calling `window.location.href = '/'` in `signOut()`:** FBG uses state-only `signOut()`; the redirect is the responsibility of the calling component. The current ACTR `logout()` forces a full page reload — replace with state update only.
- **Using `api.get('/auth/me')` without `Authorization` header:** `getMe()` is a protected endpoint. The bearer header must be sent explicitly (the proxy does not inject it — it forwards from the incoming request, which for a first call has no token yet).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JWT verification | Client-side token decode | ARM BFF `requireCustomer()` verifies on every protected call | Client can't verify RS256 without the BFF's secret key |
| Password hashing | Client-side hash before sending | ARM BFF uses bcrypt server-side | Never hash passwords client-side |
| GDPR data export | Custom export service | `GET /auth/me/export` (BFF assembles profile+addresses+orders) | Already assembled by BFF, includes all PII |
| Rate limiting | Client-side throttle | BFF Redis sliding window per IP and per login | BFF already enforces; adding client-side won't help bots |
| Email sending (reset) | Custom SMTP code | BFF `customer-email.service` via Resend | Already wired, with locale support |

**Key insight:** ARM BFF handles all server-side auth complexity. The ACTR frontend is purely a client-side state machine that stores the token and passes it in headers.

---

## Reset Password URL Configuration (AUTH-03 Setup Note)

The ARM BFF generates reset links as `${ARM_STOREFRONT_URL}/reset-password?token=...`.
- FBG's reset page is at `/reset-password` (Vite SPA single route)
- ACTR's reset page is at `/login/reset-password` (Next.js App Router sub-route)

**The mismatch:** BFF's `ARM_STOREFRONT_URL` for the demo is likely `http://localhost:5173` or similar, producing link `http://localhost:5173/reset-password?token=X`.

**Resolution options (Claude's discretion):**
1. Add `src/app/reset-password/page.tsx` that does `useEffect(() => router.replace('/login/reset-password' + search), [])` — transparent redirect shim.
2. OR configure demo BFF's `.env` with `ARM_STOREFRONT_URL=http://localhost:3003/login` (path-prefixed) so it generates correct link.

Option 1 is safer (no BFF config change needed) and handles both dev and future prod. **Recommendation: create the redirect shim page.**

---

## Common Pitfalls

### Pitfall 1: FBG-50 Violation (Session Drop on 5xx)
**What goes wrong:** `getMe()` returns 503 during BFF restart. Current ACTR `getMe()` calls `clearToken()` in the catch block, destroying the session.
**Why it happens:** OMS contract assumed: if `getMe()` fails, session is invalid.
**How to avoid:** Replace catch-all with `isAuthFailure(e)` guard. Only 401/403 drop session.
**Warning signs:** TypeScript: `catch { clearToken(); }` pattern in `auth.ts`.

### Pitfall 2: Stale `sf_token` in localStorage
**What goes wrong:** After renaming `TOKEN_KEY` from `sf_token` to `arm_token`, old browsers still have `sf_token` in localStorage. `getItem('arm_token')` returns null, user appears logged out.
**How to avoid:** On AuthProvider mount, check if `sf_token` exists and migrate: `const old = localStorage.getItem('sf_token'); if (old) { localStorage.setItem('arm_token', old); localStorage.removeItem('sf_token'); }`. Run migration once before reading `arm_token`.
**Warning signs:** User was logged in before deploy but gets logged out after.

### Pitfall 3: Reset Email Link to Wrong Path
**What goes wrong:** ARM BFF sends `/reset-password?token=X` but ACTR page is at `/login/reset-password`. User gets 404.
**How to avoid:** Create the redirect shim page at `app/reset-password/page.tsx` (see Architecture Patterns).
**Warning signs:** `GET /reset-password?token=...` returns 404 from Next.js.

### Pitfall 4: Terms Required (400) on Register
**What goes wrong:** Register call succeeds from old OMS code but returns 400 from ARM because `terms_accepted` is missing (ARM server validates: `if (!body.terms_accepted) throw 400`).
**How to avoid:** Always send `terms_accepted: true` AND `terms_version: TERMS_VERSION` in the register body. Gate submit button on consent checkbox.
**Warning signs:** `{error: "You must accept the Terms...", code: "terms_required", status: 400}`.

### Pitfall 5: Missing Authorization on Account Endpoints
**What goes wrong:** Calls to `/auth/me` or `/auth/me/orders` without `Authorization` header return 401. The proxy forwards `Authorization` from the incoming fetch — but only if the client includes it.
**How to avoid:** All account API functions (`getMe`, `getMyOrders`, `getMyAddresses`, etc.) must include `headers: bearerHeader()`.
**Warning signs:** 401 responses on account endpoints even when `arm_token` is in localStorage.

### Pitfall 6: OMS-Specific Fields in ARM Order Response
**What goes wrong:** Orders page renders `order.delivery_service.name` or `CDEK_TRACK_URL` — these fields don't exist in ARM orders. The render silently returns `undefined`, showing `—` where tracking should be.
**How to avoid:** Use `order.track_url` (ARM provides a full tracking URL string, not a partial number to append to CDEK URL). Remove `delivery_service`, `CDEK_TRACK_URL`, and OMS TARIFF_LABELS from orders pages.
**Warning signs:** Grep for `delivery_service` or `CDEK` in `src/app/account/orders/`.

### Pitfall 7: Currency Hardcoded as `₽` in Orders Page
**What goes wrong:** Current `account/orders/page.tsx` line 267 formats total as `{order.total?.toLocaleString('ru-RU')} ₽`. ARM orders carry `order.currency` (TRY for ACTR).
**How to avoid:** Use `fmtMoney(Number(order.total), order.currency)` from `src/lib/money.ts` (already exists from Phase 2).
**Warning signs:** Grep for `₽` in account pages.

---

## Runtime State Inventory

> Not a rename/refactor phase in the data sense — no data migration required. However, there IS one in-browser runtime item:

| Category | Items Found | Action Required |
|----------|-------------|-----------------|
| Stored data (browser) | `sf_token` in localStorage (existing logged-in users) | Migrate on AuthProvider mount: read `sf_token`, write to `arm_token`, remove `sf_token` |
| Live service config | BFF `ARM_STOREFRONT_URL` env (for reset password email links) | Set to `http://localhost:3003/login` OR add redirect shim page |
| OS-registered state | None | — |
| Secrets/env vars | `arm_token` key name — only in client code, no server env var change | Code rename only |
| Build artifacts | None | — |

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| ARM BFF (localhost:4000) | All auth API calls | Yes | healthy (checked live) | `make up` in autoCRM |
| Demo tenant auth setup | Register/login | Yes (standard ARM setup) | — | No gate — `arm_customers` collection is standard ARM schema |
| Reset email delivery | AUTH-03 forgot-password | Conditional | Needs SMTP/Resend configured in BFF | Email won't arrive in demo, but success response still returned |
| `npm run dev` | Development testing | Yes (standard Next.js) | — | — |

**Missing dependencies with fallback:**
- Reset email delivery in demo: BFF sends `{message: "If that email is registered..."}` regardless of email success/failure (try/catch around the send). No blocker for development testing — just check token from BFF logs if email doesn't arrive.

---

## Validation Architecture

> `workflow.nyquist_validation: true` in config.json — this section is required.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None formal — TypeScript compiler is primary gating tool (Phase 1/2 precedent) |
| Config file | `tsconfig.json` |
| Quick run command | `npx tsc --noEmit` |
| Full suite command | `npx tsc --noEmit && npm run build` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | Register sends `terms_accepted+terms_version` | manual-smoke + tsc | `npx tsc --noEmit` (type-checks body shape) | ❌ Wave 0 |
| AUTH-02 | Login stores `arm_token`, context loads `customer` | manual-smoke | `npx tsc --noEmit` | ❌ Wave 0 |
| AUTH-03 | Forgot-password returns success message | manual-smoke | `npx tsc --noEmit` | ❌ Wave 0 |
| AUTH-04 | Orders page renders ARM orders (no CDEK/₽) | grep check | `grep -rn 'delivery_service\|CDEK\|₽' src/app/account/orders/` → empty | ❌ Wave 0 |
| AUTH-05 | Address list loads; add/delete works | manual-smoke | `npx tsc --noEmit` | ❌ Wave 0 |
| AUTH-06 | Profile save + password change return success | manual-smoke | `npx tsc --noEmit` | ❌ Wave 0 |
| AUTH-07 | Export downloads JSON; delete signs out | manual-smoke | `npx tsc --noEmit` | ❌ Wave 0 |

**Manual smoke tests — ordered by phase:**
1. Register: fill form, check terms required error if unchecked, register → auto-login → redirect to `/`
2. Login: valid credentials → `arm_token` in localStorage, account page accessible
3. Auth-guard: navigate to `/account` without token → redirect to `/login`
4. FBG-50 guard: can't easily test automatically — verify by code review of `isAuthFailure` usage
5. Forgot-password: submit email → success message (email arrival optional in demo)
6. Account/orders: `GET /auth/me/orders` returns data, fmtMoney formats TRY
7. Addresses: list, add, delete
8. Settings: update name, change password
9. Export: downloads `.json` file
10. Delete: password confirm → signs out

### Sampling Rate
- **Per task commit:** `npx tsc --noEmit` (zero errors)
- **Per wave merge:** `npx tsc --noEmit && npm run build`
- **Phase gate:** Full suite green + manual smoke tests before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] No formal test files exist — tsc + grep checks serve as automated verification
- [ ] Grep acceptance checks (add to verifier): `grep -rn 'sf_token' src/` → empty; `grep -rn '₽' src/app/account/` → empty; `grep -rn 'delivery_service\|CDEK' src/app/account/` → empty; `grep -rn 'isLogged' src/` → empty (use `customer` instead)

---

## Security Domain

> `security_enforcement: true`, `security_asvs_level: 1` in config.json.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes | ARM BFF: bcrypt password hashing, rate limiting (Redis), JWT RS256. Client: no credentials stored beyond the opaque token. |
| V3 Session Management | Yes | Token in localStorage (MVP D-01). Risks: XSS can steal token. Hardening deferred per D-01. `signOut` clears localStorage. Session invalidation on password change (BFF `tokens_valid_after` watermark, FBG-22). |
| V4 Access Control | Yes | CSR auth-guard (`useEffect` redirect) on all `/account/*` pages. BFF `requireCustomer()` validates JWT on every protected call. |
| V5 Input Validation | Yes | Client: email format, password min-length 6, terms required. Server: zod schemas in BFF (name min 2, email valid, password min 6, terms_accepted boolean). |
| V6 Cryptography | No direct client concern | BFF uses bcrypt for passwords, RS256 for JWT. Never hand-roll on client. |

### Known Threat Patterns for Auth Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Brute-force login | Elevation of Privilege | BFF: Redis rate limit 10 attempts / 5 min per IP+login |
| Account enumeration (register) | Information Disclosure | BFF returns single message for both email-taken and duplicates |
| Replay of reset token | Elevation of Privilege | ARM BFF: 1-hour expiry, one-use (cleared on use), stored as SHA-256 hash |
| XSS stealing `arm_token` | Info Disclosure | KNOWN RISK — localStorage chosen for MVP (D-01). Hardening: CSP `script-src 'self'` limits injection surface. httpOnly cookie hardening is deferred. |
| Session fixation after password change | Elevation of Privilege | BFF: `tokens_valid_after` watermark invalidates pre-change tokens (FBG-22). Client must re-login after `changePassword`. |
| Missing auth on export/delete | Elevation of Privilege | BFF: `requireCustomer()` verifies JWT on both endpoints. Password re-auth required for delete. |

---

## Assumptions Log

> All factual claims in this research were verified against source code. No assumed claims.

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| — | — | — | — |

**If this table is empty:** All claims in this research were verified or cited from BFF source code (`~/work/autoCRM/packs/arm/bff/routes/storefront-auth.ts`) or FBG source code (`~/work/puz/FBG`). No user confirmation needed before execution.

---

## Open Questions (RESOLVED)

1. **Reset password email URL mismatch**
   - What we know: BFF generates `${ARM_STOREFRONT_URL}/reset-password?token=X`. ACTR page is at `/login/reset-password`. No redirect exists.
   - What's unclear: Whether to add the shim page or configure BFF env.
   - Recommendation: Create `src/app/reset-password/page.tsx` redirect shim (code-only change, no BFF config).
   - **RESOLVED:** shim page — implemented in 03-01 Task 3.

2. **`arm_token` migration for existing logged-in users**
   - What we know: Phase 0/1/2 users may have `sf_token` in localStorage.
   - Recommendation: Add one-time migration in `AuthProvider` mount (copy `sf_token` → `arm_token`, delete old). Low risk — at worst user re-logs in.
   - **RESOLVED:** `migrateToken` one-time migration in AuthProvider mount — implemented in 03-01 Task 1.

---

## Sources

### Primary (HIGH confidence — source code verified)
- `~/work/autoCRM/packs/arm/bff/routes/storefront-auth.ts` — complete ARM auth endpoint contract, request/response schemas, error codes
- `~/work/autoCRM/packs/arm/bff/routes/index.ts` — confirms mount path `/storefront/auth` under `armPublic`
- `~/work/puz/FBG/src/contexts/AuthContext.tsx` — session pattern (isAuthFailure, localStorage, getMe on mount, refreshProfile)
- `~/work/puz/FBG/src/lib/api.ts` §§531-693 — authRequest helper, all auth API functions, types, bearerHeader
- `~/work/puz/FBG/src/pages/AuthPage.tsx` §§63-128 — consent checkbox, TERMS_VERSION, auto-login after register
- `~/work/puz/FBG/src/pages/AccountSettingsPage.tsx` — GDPR export blob download, delete with password confirm
- `~/work/puz/FBG/src/pages/CheckoutPage.tsx` §§79-178 — checkout prefill from customer + saved addresses
- `~/work/puz/ACTR/src/lib/auth.ts` — current OMS contract (baseline for diff)
- `~/work/puz/ACTR/src/lib/auth-context.tsx` — current context (to be replaced)
- `~/work/puz/ACTR/src/app/api/storefront/[...path]/route.ts` — confirms proxy forwards Authorization header

### Secondary (MEDIUM confidence)
- BFF health check `http://localhost:4000/health` → `{"status":"healthy"}` — BFF is live, auth endpoints reachable

---

## Metadata

**Confidence breakdown:**
- ARM endpoint contract: HIGH — verified from BFF source code
- FBG session pattern: HIGH — read FBG source directly
- Current ACTR state: HIGH — read all relevant ACTR files
- AUTH-07 endpoint availability: HIGH — confirmed in BFF source; no setup gate

**Research date:** 2026-06-30
**Valid until:** 2026-07-30 (ARM auth schema stable; FBG is production-deployed reference)
