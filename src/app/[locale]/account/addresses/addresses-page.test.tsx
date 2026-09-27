/**
 * Account address book — province (il) select saved as `state`, list line
 * shows "district / province" (see tr-provinces.ts for the "why").
 */
import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';

const routerSpy = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
const authApi = vi.hoisted(() => ({
  getMyAddresses: vi.fn(),
  addMyAddress: vi.fn(),
  deleteMyAddress: vi.fn(),
}));

vi.mock('next-intl', () => ({
  useTranslations: (namespace?: string) => (key: string) =>
    namespace ? `${namespace}.${key}` : key,
}));

vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, ...props }: { children?: ReactNode; [k: string]: unknown }) => (
    <a {...props}>{children}</a>
  ),
  useRouter: () => routerSpy,
}));

vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({
    customer: { id: 'c1', name: 'Ada', email: 'ada@example.com', phone: null },
    loading: false,
  }),
}));

vi.mock('@/lib/auth', () => ({
  getMyAddresses: authApi.getMyAddresses,
  addMyAddress: authApi.addMyAddress,
  deleteMyAddress: authApi.deleteMyAddress,
}));

import AddressesPage from './page';

beforeEach(() => {
  vi.clearAllMocks();
  authApi.addMyAddress.mockResolvedValue({ data: { id: 'new1', is_default: false } });
  authApi.deleteMyAddress.mockResolvedValue({});
});

afterEach(() => {
  cleanup();
});

describe('address list', () => {
  it('shows district / province with the postal code, dropping a missing one', async () => {
    authApi.getMyAddresses.mockResolvedValue({
      data: [
        {
          id: 'a1',
          label: null,
          country: 'TR',
          state: 'istanbul',
          city: 'Kadıköy',
          address: null,
          street: null,
          building: null,
          apartment: null,
          postal_code: '34710',
          contact_name: null,
          contact_phone: null,
          is_default: true,
        },
        {
          id: 'a2',
          label: null,
          country: 'TR',
          state: 'Anadolu Yakası',
          city: 'Konak',
          address: null,
          street: null,
          building: null,
          apartment: null,
          postal_code: null,
          contact_name: null,
          contact_phone: null,
          is_default: false,
        },
      ],
    });

    render(<AddressesPage />);

    expect(await screen.findByText('Kadıköy / İstanbul 34710')).toBeDefined();
    expect(screen.getByText('Konak / Anadolu Yakası')).toBeDefined();
  });
});

describe('add dialog — province and district', () => {
  const pick = (comboName: RegExp, option: string) => {
    fireEvent.mouseDown(screen.getByRole('combobox', { name: comboName }));
    fireEvent.click(screen.getByRole('option', { name: option }));
  };

  it('saves the picked district as city and the picked province as state', async () => {
    authApi.getMyAddresses.mockResolvedValue({ data: [] });
    render(<AddressesPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'account.addressAdd' }));

    pick(/addressProvince/, 'İzmir');
    pick(/addressDistrict/, 'Konak');

    fireEvent.click(screen.getByRole('button', { name: 'account.addressSave' }));

    await waitFor(() => expect(authApi.addMyAddress).toHaveBeenCalledTimes(1));
    const payload = authApi.addMyAddress.mock.calls[0][0];
    expect(payload.city).toBe('Konak');
    expect(payload.state).toBe('İzmir');
  });

  it('offers only the districts of the picked province', async () => {
    authApi.getMyAddresses.mockResolvedValue({ data: [] });
    render(<AddressesPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'account.addressAdd' }));
    pick(/addressProvince/, 'Ankara');

    fireEvent.mouseDown(screen.getByRole('combobox', { name: /addressDistrict/ }));
    expect(screen.getByRole('option', { name: 'Çankaya' })).toBeDefined();
    expect(screen.queryByRole('option', { name: 'Konak' })).toBeNull();
  });

  it('blocks the save and asks for a province when none is picked', async () => {
    authApi.getMyAddresses.mockResolvedValue({ data: [] });
    render(<AddressesPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'account.addressAdd' }));
    fireEvent.click(screen.getByRole('button', { name: 'account.addressSave' }));

    await waitFor(() => expect(screen.getByText('account.addressNeedProvince')).toBeDefined());
    expect(authApi.addMyAddress).not.toHaveBeenCalled();
  });

  it('blocks the save and asks for a district when only the province is picked', async () => {
    authApi.getMyAddresses.mockResolvedValue({ data: [] });
    render(<AddressesPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'account.addressAdd' }));
    pick(/addressProvince/, 'İzmir');
    fireEvent.click(screen.getByRole('button', { name: 'account.addressSave' }));

    await waitFor(() => expect(screen.getByText('account.addressNeedDistrict')).toBeDefined());
    expect(authApi.addMyAddress).not.toHaveBeenCalled();
  });
});
