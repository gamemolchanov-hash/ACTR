'use client';

import { useEffect, useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import {
  Box,
  Typography,
  TextField,
  Button,
  Breadcrumbs,
  Link as MuiLink,
  Stack,
  Paper,
  Divider,
  FormControl,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Radio,
  RadioGroup,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import type { SelectChangeEvent } from '@mui/material';
import { Link } from '@/i18n/navigation';
import { useCart } from '@/providers/CartProvider';
import { useAuth } from '@/lib/auth-context';
import { getMyAddresses, deleteMyAddress, type CustomerAddress } from '@/lib/auth';
import {
  validateCart,
  validatePromo,
  fetchShippingRates,
  createOrder,
  createPaymentSession,
  type ValidatedCartItem,
  type PromoValidationResult,
} from '@/lib/api';
import { palette } from '@/lib/theme';
import { imgCart } from '@/lib/image-url';
import { fmtMoney } from '@/lib/money';
import { kdvFromBrutto } from '@/lib/kdv';
import type { ArmShippingRate, ArmPaymentSession } from '@/lib/arm-types';
import { useCurrency, useFormatLocale } from '@/providers/CurrencyProvider';

/* Stripe Embedded Checkout — client-side only */
const StripeEmbeddedCheckout = dynamic(() => import('@/components/StripeEmbeddedCheckout'), {
  ssr: false,
  loading: () => (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
      <CircularProgress sx={{ color: '#334a9f' }} size={32} />
    </Box>
  ),
});

/* ---- Figma design tokens ---- */
const font = '"Futura PT", Helvetica';
const h1Sx = {
  fontFamily: font,
  fontWeight: 500,
  fontSize: { xs: 30, md: 40 },
  lineHeight: { xs: '35px', md: '50px' },
} as const;
const h2Sx = {
  fontFamily: font,
  fontWeight: 500,
  fontSize: { xs: 20, md: 24 },
  lineHeight: { xs: 'normal', md: '31px' },
} as const;
const text = { fontFamily: font, fontWeight: 400, fontSize: 18, lineHeight: '20px' } as const;
const textSm = { fontFamily: font, fontWeight: 400, fontSize: 16 } as const;
const btn = { fontFamily: font, fontWeight: 500, fontSize: 18 } as const;
const info = { fontFamily: font, fontWeight: 300, fontSize: 14, lineHeight: '14px' } as const;

const c = {
  main: palette.primary, // #334a9f
  bg: palette.bgLight, // #f6f9ff
  '20': palette.primaryLight, // #d6dbec
  '40': '#adb7d9',
  red: '#ff002d',
};

/* ---- Input sx shared ---- */
const inputSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '10px',
    height: { xs: '35px', md: '50px' },
    bgcolor: 'white',
    '& fieldset': { borderColor: c.main, borderWidth: '0.5px' },
    '&:hover fieldset': { borderColor: c.main },
    '&.Mui-focused fieldset': { borderColor: c.main },
  },
} as const;

const selectSx = {
  borderRadius: '10px',
  height: { xs: '35px', md: '50px' },
  bgcolor: 'white',
  '& .MuiOutlinedInput-notchedOutline': { borderColor: c.main, borderWidth: '0.5px' },
  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: c.main },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: c.main },
} as const;

const btnSx = {
  mt: 3,
  bgcolor: c.main,
  borderRadius: '10px',
  height: { xs: '40px', md: '50px' },
  ...btn,
  textTransform: 'none',
  '&:hover': { bgcolor: '#2a3d8a' },
  '&.Mui-disabled': { bgcolor: c['20'], color: 'white' },
} as const;

interface FormData {
  email: string;
  name: string;
  phone: string;
  /** ISO-3166-1 alpha-2, default TR */
  country: string;
  city: string;
  street: string;
  building: string;
  block: string;
  apartment: string;
  zip: string;
}

const INITIAL_FORM: FormData = {
  email: '',
  name: '',
  phone: '',
  country: 'TR',
  city: '',
  street: '',
  building: '',
  block: '',
  apartment: '',
  zip: '',
};

/** Countries available in the TR-focused checkout. ISO-2 code + display name. */
const COUNTRIES: { code: string; name: string }[] = [
  { code: 'TR', name: 'Turkey' },
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'IT', name: 'Italy' },
  { code: 'ES', name: 'Spain' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'AE', name: 'United Arab Emirates' },
];

const STORAGE_KEY = 'checkout_form';
const STORAGE_STEP_KEY = 'checkout_step';

function loadFromSession<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveToSession(key: string, value: unknown) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export default function CheckoutPage() {
  const t = useTranslations();
  const currency = useCurrency();
  const formatLocale = useFormatLocale();
  const { items, removeItem } = useCart();
  const { customer } = useAuth();

  const [hydrated, setHydrated] = useState(false);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [validated, setValidated] = useState<ValidatedCartItem[]>([]);
  const [subtotal, setSubtotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Saved addresses (logged-in)
  const [savedAddresses, setSavedAddresses] = useState<CustomerAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [isNewAddress, setIsNewAddress] = useState(false);

  // ARM shipping rates
  const [shippingRates, setShippingRates] = useState<ArmShippingRate[]>([]);
  const [shippingUnavailable, setShippingUnavailable] = useState(false);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [selectedRateId, setSelectedRateId] = useState<string>('');

  // Promo code (restored from sessionStorage, set by basket page)
  const [promoResult, setPromoResult] = useState<PromoValidationResult | null>(null);
  const promoDiscount = promoResult?.valid ? promoResult.discount_amount || 0 : 0;
  const finalTotal = Math.max(0, subtotal - promoDiscount);
  // informational only — KDV portion of the KDV-inclusive subtotal (D-01/D-02)
  const kdvAmount = kdvFromBrutto(subtotal);

  // Compliance consent (D-04/COMP-02) — kept at top level so state survives step navigation
  const [agreedKvkk, setAgreedKvkk] = useState(false);
  const [agreedMesafeli, setAgreedMesafeli] = useState(false);

  // Payment session (Stripe Embedded)
  const [paymentSession, setPaymentSession] = useState<ArmPaymentSession | null>(null);

  // Hydrate from sessionStorage on mount (client only)
  useEffect(() => {
    const saved = loadFromSession<Partial<FormData>>(STORAGE_KEY, {});
    setForm((prev) => ({ ...prev, ...saved }));
    setStep(loadFromSession(STORAGE_STEP_KEY, 1));
    // Restore promo code from basket page
    try {
      const stored = sessionStorage.getItem('checkout_promo');
      if (stored) setPromoResult(JSON.parse(stored));
    } catch {}
    setHydrated(true);
  }, []);

  // Load saved addresses and autofill from logged-in customer (D-05/D-06)
  useEffect(() => {
    if (!hydrated || !customer) return;
    setForm((prev) => ({
      ...prev,
      name: prev.name || customer.name || '',
      email: prev.email || customer.email || '',
      phone: prev.phone || customer.phone || '',
    }));
    getMyAddresses()
      .then(({ data: addrs }) => {
        setSavedAddresses(addrs || []);
        const def = (addrs || []).find((a) => a.is_default) || (addrs || [])[0];
        if (def && !form.city && !form.street) {
          setSelectedAddressId(def.id);
          setForm((prev) => ({
            ...prev,
            city: def.city || '',
            street: def.street || '',
            building: def.building || '',
            block: def.block || '',
            apartment: def.apartment || '',
            zip: def.postal_code || '',
          }));
        }
      })
      .catch(() => {});
  }, [hydrated, customer]);

  // Persist form to sessionStorage (only after hydration)
  useEffect(() => {
    if (hydrated) saveToSession(STORAGE_KEY, form);
  }, [form, hydrated]);
  useEffect(() => {
    if (hydrated) saveToSession(STORAGE_STEP_KEY, step);
  }, [step, hydrated]);

  // Validate cart on mount / items change
  useEffect(() => {
    if (items.length === 0) {
      setValidated([]);
      setSubtotal(0);
      return;
    }
    let cancelled = false;
    setLoading(true);
    validateCart(items)
      .then((res) => {
        if (!cancelled) {
          setValidated(res.data.items);
          setSubtotal(res.data.subtotal);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [items]);

  // Fetch ARM shipping rates when on step 2 with country+zip filled
  useEffect(() => {
    if (!hydrated || step !== 2 || !form.country || !form.zip || items.length === 0) return;
    let cancelled = false;
    setShippingLoading(true);
    setShippingRates([]);
    setShippingUnavailable(false);
    fetchShippingRates({ country: form.country, postalCode: form.zip, items })
      .then((res) => {
        if (cancelled) return;
        if (!res.fedex_configured || !res.rates?.length) {
          setShippingUnavailable(true);
        } else {
          setShippingRates(res.rates);
          // Auto-select first available rate
          if (res.rates.length > 0 && !selectedRateId) {
            setSelectedRateId(res.rates[0].id);
          }
        }
      })
      .catch(() => {
        if (!cancelled) setShippingUnavailable(true);
      })
      .finally(() => {
        if (!cancelled) setShippingLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, form.country, form.zip]);

  const handleField = (name: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [name]: e.target.value }));
  };

  const handleCountry = (e: SelectChangeEvent) => {
    setForm((prev) => ({ ...prev, country: e.target.value }));
  };

  const isStep1Valid = useMemo(() => {
    return !!(
      form.email &&
      form.name &&
      form.phone &&
      form.country &&
      form.city &&
      form.street &&
      form.building &&
      form.zip
    );
  }, [form]);

  const handleStep1Continue = () => {
    if (!isStep1Valid) return;
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const selectedRate = shippingRates.find((r) => r.id === selectedRateId) || null;
  const shippingCost = selectedRate?.price ?? 0;
  const totalWithShipping = Math.max(0, finalTotal + shippingCost);

  const handleSubmit = async () => {
    if (submitting) return;
    // Consent gate (D-04/COMP-02, Pitfall 3 — gate the handler, not only the button)
    if (!agreedKvkk || !agreedMesafeli) {
      setError(t('checkout.consent.required'));
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const addressParts = [
        form.street,
        form.building && `No: ${form.building}`,
        form.block && `Block: ${form.block}`,
        form.apartment && `Apt: ${form.apartment}`,
      ]
        .filter(Boolean)
        .join(', ');

      const orderRes = await createOrder({
        customer: {
          name: form.name,
          phone: form.phone,
          email: form.email || undefined,
        },
        shipping: {
          address: addressParts,
          city: form.city,
          zip: form.zip,
          country: form.country,
          street: form.street || undefined,
          building: form.building || undefined,
          block: form.block || undefined,
          apartment: form.apartment || undefined,
          cost: selectedRate?.price,
          method: selectedRateId || undefined,
        },
        items,
        promoCode: promoResult?.valid ? promoResult.code : undefined,
      });

      const origin = window.location.origin;
      const sessionRes = await createPaymentSession(
        orderRes.data.id,
        `${origin}/checkout/success?order=${orderRes.data.id}`,
        `${origin}/checkout`,
      );

      // Clear session storage (cart cleared on success page after payment)
      sessionStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(STORAGE_STEP_KEY);
      sessionStorage.removeItem('checkout_promo');

      if (sessionRes.data.redirectUrl) {
        // Hosted Stripe Checkout (ui_mode=hosted fallback)
        window.location.assign(sessionRes.data.redirectUrl);
      } else if (sessionRes.data.clientSecret && sessionRes.data.publishableKey) {
        // Embedded Stripe Checkout (ui_mode=embedded)
        setPaymentSession(sessionRes.data);
        setSubmitting(false);
      } else {
        // Fallback: direct redirect to success
        window.location.assign(`${origin}/checkout/success?order=${orderRes.data.id}`);
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        'Error creating order';
      setError(msg);
      setSubmitting(false);
    }
  };

  /* ---- Breadcrumbs ---- */
  const breadcrumbs = (
    <Breadcrumbs
      separator="/"
      sx={{ mb: 1, '& .MuiBreadcrumbs-separator': { color: c['20'], mx: 0.5 } }}
    >
      {[
        { label: 'Home', href: '/' },
        { label: 'Catalog', href: '/catalog' },
        { label: 'Basket', href: '/basket' },
      ].map((b) => (
        <MuiLink
          key={b.href}
          component={Link}
          href={b.href}
          underline="hover"
          sx={{ fontFamily: '"Open Sans", Helvetica', fontSize: 13, color: c['20'] }}
        >
          {b.label}
        </MuiLink>
      ))}
      <Typography sx={{ fontFamily: '"Open Sans", Helvetica', fontSize: 13, color: c['20'] }}>
        Checkout
      </Typography>
    </Breadcrumbs>
  );

  /* ---- Empty cart ---- */
  if (!loading && items.length === 0) {
    return (
      <Box sx={{ maxWidth: 1300, mx: 'auto', px: 2, py: 4 }}>
        {breadcrumbs}
        <Typography sx={{ ...h1Sx, textTransform: 'uppercase', color: c.main, mb: 3 }}>
          Checkout
        </Typography>
        <Typography sx={{ ...textSm, color: c.main }}>
          Your cart is empty.{' '}
          <MuiLink
            component={Link}
            href="/catalog"
            underline="hover"
            sx={{ fontWeight: 700, color: c.main }}
          >
            Go to catalog
          </MuiLink>
        </Typography>
      </Box>
    );
  }

  /* ---- Form field helpers ---- */
  const field = (label: string, name: keyof FormData) => (
    <Box>
      <Typography sx={{ color: c.main, ...textSm, mb: '9px' }}>
        {label}{' '}
        <Box component="span" sx={{ color: c.red }}>
          *
        </Box>
      </Typography>
      <TextField
        fullWidth
        variant="outlined"
        value={form[name]}
        onChange={handleField(name)}
        sx={inputSx}
      />
    </Box>
  );
  const optField = (label: string, name: keyof FormData) => (
    <Box>
      <Typography sx={{ color: c.main, ...textSm, mb: '9px' }}>{label}</Typography>
      <TextField
        fullWidth
        variant="outlined"
        value={form[name]}
        onChange={handleField(name)}
        sx={inputSx}
      />
    </Box>
  );

  /* ---- Stepper visual ---- */
  const stepper = (
    <Box sx={{ mb: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography
          sx={{
            ...h2Sx,
            color: c.main,
            textTransform: 'uppercase',
            fontWeight: step === 1 ? 500 : 400,
          }}
        >
          Customer
        </Typography>
        {step > 1 && (
          <Typography
            onClick={() => setStep(1)}
            sx={{
              color: c['40'],
              ...text,
              cursor: 'pointer',
              '&:hover': { textDecoration: 'underline' },
            }}
          >
            Edit
          </Typography>
        )}
      </Stack>

      {step > 1 && (
        <Stack spacing={'9px'} sx={{ mt: 1, mb: 1 }}>
          {[
            { label: 'Name', value: form.name },
            { label: 'Email', value: form.email },
            { label: 'City', value: form.city },
            { label: 'Phone', value: form.phone },
          ].map((f) => (
            <Typography key={f.label} sx={{ color: c.main, ...text }}>
              {f.value || f.label}
            </Typography>
          ))}
        </Stack>
      )}

      <Divider sx={{ borderColor: c.main, borderWidth: '0.5px', my: 2 }} />

      <Typography
        sx={{
          ...h2Sx,
          color: c.main,
          textTransform: 'uppercase',
          fontWeight: step === 2 ? 500 : 400,
        }}
      >
        Delivery
      </Typography>

      {step < 2 && (
        <>
          <Divider sx={{ borderColor: c.main, borderWidth: '0.5px', my: 2 }} />
          <Typography sx={{ color: c.main, ...text }}>Payment</Typography>
          <Divider sx={{ borderColor: c.main, borderWidth: '0.5px', mt: 2 }} />
        </>
      )}
    </Box>
  );

  /* ---- Step 1: Contact & Address form ---- */
  const step1Content = (
    <>
      <Stack spacing={2.5}>
        {field('Email', 'email')}
        {field('Full Name', 'name')}
        {field('Phone', 'phone')}

        <Box>
          <Typography sx={{ color: c.main, ...textSm, mb: '9px' }}>
            Country{' '}
            <Box component="span" sx={{ color: c.red }}>
              *
            </Box>
          </Typography>
          <FormControl fullWidth>
            <Select
              value={form.country}
              onChange={handleCountry}
              displayEmpty
              renderValue={(selected) =>
                selected ? (
                  <Typography sx={{ color: c.main, fontSize: '16px' }}>
                    {COUNTRIES.find((ct) => ct.code === selected)?.name || selected}
                  </Typography>
                ) : (
                  <Typography sx={{ color: c['20'], fontSize: '16px' }}>Select country</Typography>
                )
              }
              sx={selectSx}
            >
              {COUNTRIES.map((ct) => (
                <MenuItem key={ct.code} value={ct.code}>
                  {ct.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* Saved address cards (logged in, has addresses) */}
        {!!customer && savedAddresses.length > 0 && (
          <Box>
            <Typography sx={{ color: c.main, ...textSm, mb: 1 }}>Delivery address</Typography>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
              {savedAddresses.map((addr) => (
                <Box
                  key={addr.id}
                  onClick={() => {
                    setSelectedAddressId(addr.id);
                    setIsNewAddress(false);
                    setForm((prev) => ({
                      ...prev,
                      city: addr.city || '',
                      street: addr.street || '',
                      building: addr.building || '',
                      block: addr.block || '',
                      apartment: addr.apartment || '',
                      zip: addr.postal_code || '',
                    }));
                  }}
                  sx={{
                    position: 'relative',
                    border: `1.5px solid ${selectedAddressId === addr.id && !isNewAddress ? c.main : c['20']}`,
                    borderRadius: '10px',
                    px: 2,
                    py: 1.5,
                    pr: 4,
                    cursor: 'pointer',
                    bgcolor:
                      selectedAddressId === addr.id && !isNewAddress ? c.main + '08' : 'white',
                    transition: 'all 0.15s',
                    '&:hover': { borderColor: c.main },
                    maxWidth: 280,
                  }}
                >
                  <Box
                    component="span"
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      deleteMyAddress(addr.id)
                        .then(() => {
                          setSavedAddresses((prev) => prev.filter((a) => a.id !== addr.id));
                          if (selectedAddressId === addr.id) {
                            setSelectedAddressId(null);
                            setIsNewAddress(true);
                            setForm((prev) => ({
                              ...prev,
                              city: '',
                              street: '',
                              building: '',
                              block: '',
                              apartment: '',
                              zip: '',
                            }));
                          }
                        })
                        .catch(() => {});
                    }}
                    sx={{
                      position: 'absolute',
                      top: 4,
                      right: 6,
                      width: 20,
                      height: 20,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 14,
                      color: c['40'],
                      borderRadius: '50%',
                      cursor: 'pointer',
                      '&:hover': { color: c.main, bgcolor: c['20'] + '40' },
                    }}
                  >
                    ×
                  </Box>
                  <Typography sx={{ fontSize: 14, fontWeight: 500, color: c.main }}>
                    {addr.city}
                    {addr.city && addr.address ? ', ' : ''}
                    {addr.address}
                  </Typography>
                  {addr.postal_code && (
                    <Typography sx={{ fontSize: 12, color: c['40'] }}>
                      {addr.postal_code}
                    </Typography>
                  )}
                </Box>
              ))}
              <Box
                onClick={() => {
                  setIsNewAddress(true);
                  setSelectedAddressId(null);
                  setForm((prev) => ({
                    ...prev,
                    city: '',
                    street: '',
                    building: '',
                    block: '',
                    apartment: '',
                    zip: '',
                  }));
                }}
                sx={{
                  border: `1.5px dashed ${isNewAddress ? c.main : c['20']}`,
                  borderRadius: '10px',
                  px: 2,
                  py: 1.5,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'all 0.15s',
                  '&:hover': { borderColor: c.main },
                }}
              >
                <Typography sx={{ fontSize: 14, color: c.main }}>+ New address</Typography>
              </Box>
            </Stack>
          </Box>
        )}

        {field('City', 'city')}
        {field('Street', 'street')}
        <Stack direction="row" spacing={1.5}>
          <Box sx={{ flex: 1 }}>{field('Building / No', 'building')}</Box>
          <Box sx={{ flex: 1 }}>{optField('Block', 'block')}</Box>
          <Box sx={{ flex: 1 }}>{optField('Apartment / Office', 'apartment')}</Box>
        </Stack>
        {field('Postal Code', 'zip')}
      </Stack>

      <Button
        variant="contained"
        fullWidth
        disabled={!isStep1Valid}
        onClick={handleStep1Continue}
        sx={btnSx}
      >
        Continue
      </Button>

      {/* Collapsed future steps */}
      <Box sx={{ mt: 4 }}>
        {['Choose delivery', 'Payment'].map((label, idx) => (
          <Box key={label}>
            <Divider sx={{ borderColor: c.main, borderWidth: '0.5px' }} />
            <Typography sx={{ color: c.main, ...text, py: '14px' }}>{label}</Typography>
            {idx === 1 && <Divider sx={{ borderColor: c.main, borderWidth: '0.5px' }} />}
          </Box>
        ))}
      </Box>
    </>
  );

  /* ---- Step 2: ARM Shipping rates selection + Payment ---- */
  const step2Content = (
    <>
      {/* If payment session is active, show Stripe Embedded Checkout */}
      {paymentSession && paymentSession.clientSecret && paymentSession.publishableKey ? (
        <Box sx={{ mt: 2 }}>
          <Typography sx={{ ...h2Sx, color: c.main, textTransform: 'uppercase', mb: 2 }}>
            Payment
          </Typography>
          <StripeEmbeddedCheckout
            clientSecret={paymentSession.clientSecret}
            publishableKey={paymentSession.publishableKey}
          />
        </Box>
      ) : (
        <>
          {/* Shipping rates */}
          {shippingLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress sx={{ color: c.main }} size={28} />
            </Box>
          ) : shippingUnavailable || shippingRates.length === 0 ? (
            <Alert severity="info" sx={{ mb: 2 }}>
              Shipping rates temporarily unavailable. You can still place your order — we will
              contact you to confirm delivery.
            </Alert>
          ) : (
            <RadioGroup
              value={selectedRateId}
              onChange={(e) => setSelectedRateId(e.target.value)}
            >
              {shippingRates.map((rate) => (
                <Stack
                  key={rate.id}
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{ mb: 1 }}
                >
                  <FormControlLabel
                    value={rate.id}
                    control={<Radio sx={{ color: c.main, '&.Mui-checked': { color: c.main } }} />}
                    label={
                      <Box>
                        <Typography sx={{ color: c.main, ...text }}>
                          {rate.name}
                          {rate.carrier ? ` (${rate.carrier})` : ''}
                        </Typography>
                        {(rate.estimated_days_min || rate.estimated_days_max) && (
                          <Typography sx={{ color: c['40'], ...info }}>
                            {rate.estimated_days_min === rate.estimated_days_max
                              ? `${rate.estimated_days_min} days`
                              : `${rate.estimated_days_min}–${rate.estimated_days_max} days`}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                  <Typography sx={{ color: c.main, ...btn, textAlign: 'right', flexShrink: 0 }}>
                    {rate.is_free ? 'Free' : fmtMoney(rate.price, currency, formatLocale)}
                  </Typography>
                </Stack>
              ))}
            </RadioGroup>
          )}

          {/* Compliance consent checkboxes (D-04/D-05/COMP-02) */}
          <FormControlLabel
            control={
              <Checkbox
                checked={agreedKvkk}
                onChange={(e) => setAgreedKvkk(e.target.checked)}
                sx={{ color: c.main, '&.Mui-checked': { color: c.main }, alignSelf: 'flex-start', pt: '2px' }}
              />
            }
            label={
              <Typography sx={{ ...info, color: c.main, lineHeight: '1.5' }}>
                {t('checkout.consent.kvkkPrefix')}{' '}
                <Link href="/legal/kvkk" target="_blank" rel="noopener noreferrer" style={{ color: c.main }}>
                  {t('checkout.consent.kvkkLink')}
                </Link>{' '}
                {t('checkout.consent.kvkkSuffix')}
              </Typography>
            }
            sx={{ alignItems: 'flex-start', mb: 1 }}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={agreedMesafeli}
                onChange={(e) => setAgreedMesafeli(e.target.checked)}
                sx={{ color: c.main, '&.Mui-checked': { color: c.main }, alignSelf: 'flex-start', pt: '2px' }}
              />
            }
            label={
              <Typography sx={{ ...info, color: c.main, lineHeight: '1.5' }}>
                {t('checkout.consent.mesafeliPrefix')}{' '}
                <Link href="/legal/mesafeli-satis" target="_blank" rel="noopener noreferrer" style={{ color: c.main }}>
                  {t('checkout.consent.mesafeliLink')}
                </Link>{' '}
                {t('checkout.consent.mesafeliSuffix')}
              </Typography>
            }
            sx={{ alignItems: 'flex-start', mb: 2 }}
          />

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Button
            variant="contained"
            fullWidth
            disabled={submitting || !agreedKvkk || !agreedMesafeli}
            onClick={handleSubmit}
            sx={btnSx}
          >
            {submitting ? (
              <CircularProgress size={24} sx={{ color: 'white' }} />
            ) : (
              'Proceed to Payment'
            )}
          </Button>
        </>
      )}
    </>
  );

  /* ---- Order Summary (shared between steps) ---- */
  const orderSummary = (
    <Paper
      elevation={0}
      sx={{
        bgcolor: c.bg,
        borderRadius: '20px',
        width: { xs: '100%', md: 551 },
        p: { xs: '20px', md: '43px 57px' },
        flexShrink: 0,
        order: { xs: 1, md: 2 },
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography sx={{ ...h2Sx, color: c.main, textTransform: 'uppercase' }}>
          Your Order
        </Typography>
        <MuiLink
          component={Link}
          href="/basket"
          underline="none"
          sx={{ color: c['40'], ...text, cursor: 'pointer' }}
        >
          Edit
        </MuiLink>
      </Stack>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress sx={{ color: c.main }} size={32} />
        </Box>
      ) : (
        <>
          {validated
            .filter((v) => v.valid)
            .map((item) => (
              <Stack
                key={item.productId}
                direction="row"
                spacing={2}
                alignItems="flex-start"
                sx={{ mb: 2 }}
              >
                <Box
                  sx={{
                    width: 90,
                    height: 90,
                    bgcolor: palette.bgLight,
                    borderRadius: '10px',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                  }}
                >
                  {item.image ? (
                    <Box
                      component="img"
                      src={imgCart(item.image)}
                      alt={item.name || ''}
                      sx={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                  ) : (
                    <Typography sx={{ color: c['40'], fontSize: 11 }}>{item.sku}</Typography>
                  )}
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ ...h2Sx, color: c.main, textTransform: 'uppercase' }}>
                    {item.name}
                  </Typography>
                  <Typography sx={{ color: c.main, ...textSm, mt: 0.5 }}>
                    {item.quantity} pcs
                  </Typography>
                  <Typography sx={{ color: c.main, ...textSm, mt: 0.5 }}>
                    {item.unitPrice != null ? fmtMoney(item.unitPrice, currency, formatLocale) : '—'} /pc
                  </Typography>
                </Box>
                <DeleteOutlineIcon
                  onClick={() => removeItem(item.productId)}
                  sx={{ color: c.main, fontSize: 28, cursor: 'pointer', flexShrink: 0 }}
                />
              </Stack>
            ))}

          <Box sx={{ mb: 2 }}>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 1.5 }}>
              <Typography sx={{ color: c.main, ...text }}>Subtotal:</Typography>
              <Typography sx={{ color: c.main, ...text }}>{fmtMoney(subtotal, currency, formatLocale)}</Typography>
            </Stack>
            {/* informational only — price is already KDV-inclusive (D-01/D-02) */}
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 1.5 }}>
              <Typography sx={{ color: c['40'], ...info }}>
                {t('price.kdvLine')}
              </Typography>
              <Typography sx={{ color: c['40'], ...info }}>
                {fmtMoney(kdvAmount, currency, formatLocale)}
              </Typography>
            </Stack>
            {promoDiscount > 0 && (
              <Stack direction="row" justifyContent="space-between" sx={{ mb: 1.5 }}>
                <Typography sx={{ color: '#2e7d32', ...text }}>
                  Discount{promoResult?.code ? ` (${promoResult.code})` : ''}:
                </Typography>
                <Typography sx={{ color: '#2e7d32', ...text }}>
                  −{fmtMoney(promoDiscount, currency, formatLocale)}
                </Typography>
              </Stack>
            )}
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 1.5 }}>
              <Typography sx={{ color: c.main, ...text }}>Shipping:</Typography>
              <Typography sx={{ color: c.main, ...text }}>
                {step < 2
                  ? '—'
                  : shippingLoading
                    ? '...'
                    : selectedRate
                      ? selectedRate.is_free
                        ? 'Free'
                        : fmtMoney(selectedRate.price, currency, formatLocale)
                      : shippingUnavailable
                        ? 'TBD'
                        : '—'}
              </Typography>
            </Stack>
          </Box>

          <Divider sx={{ borderColor: c.main, borderWidth: '0.5px', mb: 2 }} />

          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography sx={{ ...h2Sx, color: c.main }}>TOTAL:</Typography>
            <Typography sx={{ ...h2Sx, color: c.main }}>
              {fmtMoney(step < 2 ? finalTotal : totalWithShipping, currency, formatLocale)}
            </Typography>
          </Stack>
        </>
      )}
    </Paper>
  );

  return (
    <Box sx={{ maxWidth: 1300, mx: 'auto', px: 2, py: 4 }}>
      {breadcrumbs}

      <Typography sx={{ ...h1Sx, textTransform: 'uppercase', color: c.main, mb: 1.5 }}>
        Checkout
      </Typography>

      {!customer && (
        <Typography sx={{ ...textSm, color: c.main, mb: 4 }}>
          Already have an account?{' '}
          <MuiLink
            component={Link}
            href="/login"
            underline="always"
            sx={{ color: c.main, ...textSm, fontWeight: 'bold' }}
          >
            Sign in
          </MuiLink>{' '}
          or{' '}
          <MuiLink
            component={Link}
            href="/login/register"
            underline="always"
            sx={{ color: c.main, ...textSm, fontWeight: 'bold' }}
          >
            register
          </MuiLink>{' '}
          for faster checkout.
        </Typography>
      )}

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={4} alignItems="flex-start">
        {/* LEFT: Steps */}
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            width: '100%',
            maxWidth: { md: 660 },
            order: { xs: 2, md: 1 },
          }}
        >
          {step === 2 && stepper}
          {step === 1 && step1Content}
          {step === 2 && step2Content}
        </Box>

        {/* RIGHT: Order summary */}
        {orderSummary}
      </Stack>
    </Box>
  );
}
