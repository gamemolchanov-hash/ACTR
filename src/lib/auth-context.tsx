'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { type Customer, type CustomerAddress, getMe, logout as doLogout, getToken } from './auth';

interface AuthContextValue {
  customer: Customer | null;
  address: CustomerAddress | null;
  isLogged: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  customer: null,
  address: null,
  isLogged: false,
  loading: true,
  refresh: async () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [address, setAddress] = useState<CustomerAddress | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setCustomer(null);
      setAddress(null);
      setLoading(false);
      return;
    }
    try {
      const result = await getMe();
      setCustomer(result?.customer ?? null);
      setAddress(result?.address ?? null);
    } catch {
      setCustomer(null);
      setAddress(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const logout = useCallback(() => {
    setCustomer(null);
    setAddress(null);
    doLogout();
  }, []);

  return (
    <AuthContext.Provider
      value={{ customer, address, isLogged: !!customer, loading, refresh, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
