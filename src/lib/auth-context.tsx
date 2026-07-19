'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import {
  getMe,
  isAuthFailure,
  migrateToken,
  TOKEN_KEY,
  type AuthCustomer,
  type LoyaltyData,
} from './auth';

// ---------------------------------------------------------------------------
// Context type — FBG pattern (D-03)
// ---------------------------------------------------------------------------

interface AuthContextType {
  customer: AuthCustomer | null;
  loyalty: LoyaltyData | null; // Creator Club loyalty snapshot from /auth/me (rendered by FBG-384 loyalty page)
  token: string | null;
  loading: boolean;
  setAuth: (token: string, customer: AuthCustomer, loyalty?: LoyaltyData | null) => void;
  signOut: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

// ---------------------------------------------------------------------------
// Provider — mirrors FBG AuthContext (adapted for Next.js App Router SSR)
// ---------------------------------------------------------------------------

export function AuthProvider({ children }: { children: ReactNode }) {
  // Lazy init: read localStorage only after hydration (prevents SSR mismatch).
  // Also runs one-time sf_token → arm_token migration (D-02 / Pitfall 2).
  const [token, setTokenState] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    migrateToken();
    return localStorage.getItem(TOKEN_KEY);
  });

  const [customer, setCustomer] = useState<AuthCustomer | null>(null);
  const [loyalty, setLoyalty] = useState<LoyaltyData | null>(null);
  const [loading, setLoading] = useState(!!token); // true only if we have a token to validate

  // setAuth — called by login/register pages after successful auth
  const setAuth = useCallback(
    (t: string, c: AuthCustomer, l?: LoyaltyData | null) => {
      localStorage.setItem(TOKEN_KEY, t);
      setTokenState(t);
      setCustomer(c);
      if (l !== undefined) setLoyalty(l ?? null);
    },
    [],
  );

  // signOut — state + localStorage only; NO window.location redirect (caller's responsibility)
  const signOut = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setTokenState(null);
    setCustomer(null);
    setLoyalty(null);
  }, []);

  // refreshProfile — reload customer data; only 401/403 drops session (FBG-50 / D-04)
  const refreshProfile = useCallback(async () => {
    if (!token) return;
    try {
      const { customer: c, loyalty: l } = await getMe();
      setCustomer(c);
      setLoyalty(l ?? null);
    } catch (e) {
      if (isAuthFailure(e)) signOut();
      // network/5xx: keep session intact (FBG-50 / D-04)
    }
  }, [token, signOut]);

  // On mount: if token exists, validate it via getMe(); only 401/403 clears session
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    getMe()
      .then(({ customer: c, loyalty: l }) => {
        setCustomer(c);
        setLoyalty(l ?? null);
        setLoading(false);
      })
      .catch((e) => {
        if (isAuthFailure(e)) signOut();
        // network/5xx: preserve session — user stays logged in
        setLoading(false);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AuthContext.Provider
      value={{ customer, loyalty, token, loading, setAuth, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}
