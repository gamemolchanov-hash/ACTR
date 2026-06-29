'use client';

import { useEffect, useState, useMemo } from 'react';
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
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import type { SelectChangeEvent } from '@mui/material';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '@/providers/CartProvider';
import { useAuth } from '@/lib/auth-context';
import { getMyAddresses, deleteMyAddress, type CustomerAddress } from '@/lib/auth';
import {
  validateCart,
  createOrder,
  searchCdekCities,
  fetchCdekPoints,
  type ValidatedCartItem,
  type CdekCity,
  type CdekPoint,
  type PromoValidationResult,
} from '@/lib/api';
import { palette } from '@/lib/theme';
import { imgCart } from '@/lib/image-url';

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

const fmt = (n: number) => new Intl.NumberFormat('ru-RU').format(n) + ' \u20BD';

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
  country: string;
  city: string;
  region: string;
  district: string;
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
  country: '',
  city: '',
  region: '',
  district: '',
  street: '',
  building: '',
  block: '',
  apartment: '',
  zip: '',
};

const STORAGE_KEY = 'checkout_form';
const STORAGE_STEP_KEY = 'checkout_step';
const STORAGE_DELIVERY_KEY = 'checkout_delivery';
const STORAGE_POINT_KEY = 'checkout_point';

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

const COUNTRIES = ['Россия', 'Беларусь', 'Казахстан'];

/** Guess country from region/address string */
function guessCountry(
  region?: string | null,
  address?: string | null,
  city?: string | null,
): string {
  const text = [region, address, city].filter(Boolean).join(' ').toLowerCase();
  if (/беларус|минск|гомель|брест|гродно|витебск|могилёв|могилев/.test(text)) return 'Беларусь';
  if (/казахстан|алматы|астана|нур-султан|шымкент|караганд/.test(text)) return 'Казахстан';
  return 'Россия';
}

// СДЭК delivery options (all free) — tariff codes for BetaPro
interface CdekDeliveryOption {
  id: string;
  name: string;
  tariff: string;
  needsPoint: boolean;
  pointType?: 'PVZ' | 'POSTAMAT';
}

const CDEK_OPTIONS: CdekDeliveryOption[] = [
  { id: 'cdek_courier', name: 'СДЭК Доставка курьером', tariff: '137', needsPoint: false },
  {
    id: 'cdek_postamat',
    name: 'СДЭК Постамат',
    tariff: '136',
    needsPoint: true,
    pointType: 'POSTAMAT',
  },
  {
    id: 'cdek_pvz',
    name: 'СДЭК Пункт выдачи заказов',
    tariff: '136',
    needsPoint: true,
    pointType: 'PVZ',
  },
];

export default function CheckoutPage() {
  const { items, removeItem, clearCart } = useCart();
  const router = useRouter();
  const { customer, address: savedAddress, isLogged } = useAuth();

  const [hydrated, setHydrated] = useState(false);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [validated, setValidated] = useState<ValidatedCartItem[]>([]);
  const [subtotal, setSubtotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Saved addresses
  const [savedAddresses, setSavedAddresses] = useState<CustomerAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [isNewAddress, setIsNewAddress] = useState(false);

  // Step 2 state
  const [selectedDelivery, setSelectedDelivery] = useState<string>('');
  const [cdekCityCode, setCdekCityCode] = useState<number | null>(null);
  const [cdekPoints, setCdekPoints] = useState<CdekPoint[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<string>('');
  const [pointsLoading, setPointsLoading] = useState(false);

  // Promo code (restored from sessionStorage, set by basket page)
  const [promoResult, setPromoResult] = useState<PromoValidationResult | null>(null);
  const promoDiscount = promoResult?.valid ? promoResult.discount_amount || 0 : 0;
  const customerDiscountPercent = (customer as any)?.discount_percent
    ? parseFloat((customer as any).discount_percent)
    : 0;
  const afterPromo = subtotal - promoDiscount;
  const customerDiscount =
    customerDiscountPercent > 0 ? Math.round(afterPromo * customerDiscountPercent) / 100 : 0;
  const finalTotal = Math.max(0, afterPromo - customerDiscount);

  // Hydrate from sessionStorage on mount (client only)
  useEffect(() => {
    setForm(loadFromSession(STORAGE_KEY, INITIAL_FORM));
    setStep(loadFromSession(STORAGE_STEP_KEY, 1));
    setSelectedDelivery(loadFromSession(STORAGE_DELIVERY_KEY, ''));
    setSelectedPoint(loadFromSession(STORAGE_POINT_KEY, ''));
    // Restore promo code from basket page
    try {
      const stored = sessionStorage.getItem('checkout_promo');
      if (stored) setPromoResult(JSON.parse(stored));
    } catch {}
    setHydrated(true);
  }, []);

  // Load saved addresses and autofill from logged-in customer
  useEffect(() => {
    if (!hydrated || !isLogged || !customer) return;
    setForm((prev) => ({
      ...prev,
      name: prev.name || customer.name || '',
      email: prev.email || customer.email || '',
      phone: prev.phone || customer.phone || '',
    }));
    // Load addresses
    getMyAddresses()
      .then((addrs) => {
        setSavedAddresses(addrs);
        // Auto-select default address
        const def = addrs.find((a) => a.is_default) || addrs[0];
        if (def && !form.city && !form.street) {
          setSelectedAddressId(def.id);
          setForm((prev) => ({
            ...prev,
            city: def.city || '',
            region: def.region || '',
            district: def.district || '',
            street: def.street || '',
            building: def.building || '',
            block: def.block || '',
            apartment: def.apartment || '',
            zip: def.postal_code || '',
            country: prev.country || guessCountry(def.region, def.address, def.city),
          }));
        }
      })
      .catch(() => {});
  }, [hydrated, isLogged, customer]);

  // Persist to sessionStorage (only after hydration to avoid overwriting with defaults)
  useEffect(() => {
    if (hydrated) saveToSession(STORAGE_KEY, form);
  }, [form, hydrated]);
  useEffect(() => {
    if (hydrated) saveToSession(STORAGE_STEP_KEY, step);
  }, [step, hydrated]);
  useEffect(() => {
    if (hydrated) saveToSession(STORAGE_DELIVERY_KEY, selectedDelivery);
  }, [selectedDelivery, hydrated]);
  useEffect(() => {
    if (hydrated) saveToSession(STORAGE_POINT_KEY, selectedPoint);
  }, [selectedPoint, hydrated]);

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

  // Resolve CDEK city code when entering step 2
  useEffect(() => {
    if (!hydrated || step !== 2 || !form.city) return;
    let cancelled = false;
    searchCdekCities(form.city)
      .then((res) => {
        if (cancelled || !res.data.length) return;
        setCdekCityCode(res.data[0].code);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [step, form.city]);

  // Fetch CDEK points when delivery option with points is selected
  const selectedOption = CDEK_OPTIONS.find((o) => o.id === selectedDelivery);
  useEffect(() => {
    if (!hydrated) return; // wait for sessionStorage hydration
    if (!selectedOption?.needsPoint) {
      setCdekPoints([]);
      setSelectedPoint('');
      return;
    }
    if (!cdekCityCode) return; // wait for city code, don't clear point
    let cancelled = false;
    setPointsLoading(true);
    fetchCdekPoints(cdekCityCode, selectedOption.pointType || 'ALL')
      .then((res) => {
        if (!cancelled) setCdekPoints(res.data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setPointsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedDelivery, cdekCityCode, selectedOption?.needsPoint, selectedOption?.pointType]);

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
      form.region &&
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

  const isStep2Valid = useMemo(() => {
    if (!selectedDelivery) return false;
    const opt = CDEK_OPTIONS.find((o) => o.id === selectedDelivery);
    if (opt?.needsPoint && !selectedPoint) return false;
    return true;
  }, [selectedDelivery, selectedPoint]);

  const handleSubmit = async () => {
    if (!isStep2Valid || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const opt = CDEK_OPTIONS.find((o) => o.id === selectedDelivery)!;

      // Compose display address from structured fields
      const addressParts = [
        form.street,
        form.building && `д. ${form.building}`,
        form.block && `к. ${form.block}`,
        form.apartment && `${form.apartment}`,
      ]
        .filter(Boolean)
        .join(', ');

      const res = await createOrder({
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
          region: form.region || undefined,
          district: form.district || undefined,
          street: form.street || undefined,
          building: form.building || undefined,
          block: form.block || undefined,
          apartment: form.apartment || undefined,
          delivery_type: opt.name,
          delivery_cost: 0,
          delivery_tariff_type: opt.tariff,
          pickup_point_code: opt.needsPoint ? selectedPoint : undefined,
        },
        items,
        payment_method: 'card_online',
        promo_code: promoResult?.valid ? promoResult.code : undefined,
      });
      clearCart();
      sessionStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(STORAGE_STEP_KEY);
      sessionStorage.removeItem(STORAGE_DELIVERY_KEY);
      sessionStorage.removeItem(STORAGE_POINT_KEY);
      sessionStorage.removeItem('checkout_promo');

      // Submit POST form to PayKeeper for payment
      if (res.data.paymentUrl && res.data.paymentFields) {
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = res.data.paymentUrl;
        form.acceptCharset = 'utf-8';
        for (const [key, value] of Object.entries(
          res.data.paymentFields as Record<string, string>,
        )) {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = key;
          input.value = value;
          form.appendChild(input);
        }
        document.body.appendChild(form);
        form.submit();
      } else {
        router.push(`/checkout/success?order=${res.data.number}&total=${res.data.total}`);
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        'Ошибка при создании заказа';
      setError(msg);
    } finally {
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
        { label: 'Главная', href: '/' },
        { label: 'Каталог', href: '/catalog' },
        { label: 'Корзина', href: '/basket' },
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
        Оформление заказа
      </Typography>
    </Breadcrumbs>
  );

  /* ---- Empty cart ---- */
  if (!loading && items.length === 0) {
    return (
      <Box sx={{ maxWidth: 1300, mx: 'auto', px: 2, py: 4 }}>
        {breadcrumbs}
        <Typography sx={{ ...h1Sx, textTransform: 'uppercase', color: c.main, mb: 3 }}>
          Оформление заказа
        </Typography>
        <Typography sx={{ ...textSm, color: c.main }}>
          Корзина пуста.{' '}
          <MuiLink
            component={Link}
            href="/catalog"
            underline="hover"
            sx={{ fontWeight: 700, color: c.main }}
          >
            Перейти в каталог
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
      {/* Step 1: ПОКУПАТЕЛЬ */}
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography
          sx={{
            ...h2Sx,
            color: c.main,
            textTransform: 'uppercase',
            fontWeight: step === 1 ? 500 : 400,
          }}
        >
          Покупатель
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
            Изменить
          </Typography>
        )}
      </Stack>

      {/* Step 1 summary (when on step 2) */}
      {step > 1 && (
        <Stack spacing={'9px'} sx={{ mt: 1, mb: 1 }}>
          {[
            { label: 'ФИО', value: form.name },
            { label: 'Email', value: form.email },
            { label: 'Город', value: form.city },
            { label: 'Телефон', value: form.phone },
          ].map((f) => (
            <Typography key={f.label} sx={{ color: c.main, ...text }}>
              {f.value || f.label}
            </Typography>
          ))}
        </Stack>
      )}

      <Divider sx={{ borderColor: c.main, borderWidth: '0.5px', my: 2 }} />

      {/* Step 2: ДОСТАВКА */}
      <Typography
        sx={{
          ...h2Sx,
          color: c.main,
          textTransform: 'uppercase',
          fontWeight: step === 2 ? 500 : 400,
        }}
      >
        Доставка
      </Typography>

      {step < 2 && (
        <>
          <Divider sx={{ borderColor: c.main, borderWidth: '0.5px', my: 2 }} />
          <Typography sx={{ color: c.main, ...text }}>Оплата</Typography>
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
        {field('ФИО', 'name')}
        {field('Телефон', 'phone')}

        <Box>
          <Typography sx={{ color: c.main, ...textSm, mb: '9px' }}>
            Страна, регион{' '}
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
                  <Typography sx={{ color: c.main, fontSize: '16px' }}>{selected}</Typography>
                ) : (
                  <Typography sx={{ color: c['20'], fontSize: '16px' }}>Выберите страну</Typography>
                )
              }
              sx={selectSx}
            >
              {COUNTRIES.map((country) => (
                <MenuItem key={country} value={country}>
                  {country}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* Saved address cards (logged in, has addresses) */}
        {isLogged && savedAddresses.length > 0 && (
          <Box>
            <Typography sx={{ color: c.main, ...textSm, mb: 1 }}>Адрес доставки</Typography>
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
                      region: addr.region || '',
                      district: addr.district || '',
                      street: addr.street || '',
                      building: addr.building || '',
                      block: addr.block || '',
                      apartment: addr.apartment || '',
                      zip: addr.postal_code || '',
                      country: guessCountry(addr.region, addr.address, addr.city),
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
                              region: '',
                              district: '',
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
                    region: '',
                    district: '',
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
                <Typography sx={{ fontSize: 14, color: c.main }}>+ Новый адрес</Typography>
              </Box>
            </Stack>
          </Box>
        )}

        {field('Город (населённый пункт)', 'city')}
        {field('Область / регион', 'region')}
        {optField('Район', 'district')}
        {field('Улица', 'street')}
        <Stack direction="row" spacing={1.5}>
          <Box sx={{ flex: 1 }}>{field('Дом', 'building')}</Box>
          <Box sx={{ flex: 1 }}>{optField('Корпус', 'block')}</Box>
          <Box sx={{ flex: 1 }}>{optField('Квартира / офис', 'apartment')}</Box>
        </Stack>
        {field('Индекс', 'zip')}
      </Stack>

      <Button
        variant="contained"
        fullWidth
        disabled={!isStep1Valid}
        onClick={handleStep1Continue}
        sx={btnSx}
      >
        Продолжить
      </Button>

      {/* Collapsed future steps */}
      <Box sx={{ mt: 4 }}>
        {['Выбор доставки', 'Оплата'].map((label, idx) => (
          <Box key={label}>
            <Divider sx={{ borderColor: c.main, borderWidth: '0.5px' }} />
            <Typography sx={{ color: c.main, ...text, py: '14px' }}>{label}</Typography>
            {idx === 1 && <Divider sx={{ borderColor: c.main, borderWidth: '0.5px' }} />}
          </Box>
        ))}
      </Box>
    </>
  );

  /* ---- Step 2: Delivery selection ---- */
  const step2Content = (
    <>
      <RadioGroup
        value={selectedDelivery}
        onChange={(e) => {
          setSelectedDelivery(e.target.value);
          setSelectedPoint('');
        }}
      >
        {CDEK_OPTIONS.map((opt) => (
          <Stack
            key={opt.id}
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ mb: 1 }}
          >
            <FormControlLabel
              value={opt.id}
              control={<Radio sx={{ color: c.main, '&.Mui-checked': { color: c.main } }} />}
              label={<Typography sx={{ color: c.main, ...text }}>{opt.name}</Typography>}
            />
            <Typography sx={{ color: c.main, ...btn, textAlign: 'right' }}>0{'\u20BD'}</Typography>
          </Stack>
        ))}
      </RadioGroup>

      {/* CDEK points dropdown (shown for Постамат / ПВЗ) */}
      {selectedOption?.needsPoint && (
        <Box sx={{ mt: 2 }}>
          <FormControl fullWidth>
            <Select
              displayEmpty
              value={selectedPoint}
              onChange={(e: SelectChangeEvent) => setSelectedPoint(e.target.value)}
              sx={selectSx}
              MenuProps={{ PaperProps: { sx: { maxHeight: 300 } } }}
              renderValue={(val) => {
                if (!val)
                  return (
                    <Typography sx={{ color: c['20'], fontSize: '16px' }}>
                      {pointsLoading
                        ? 'Загрузка пунктов...'
                        : `Выберите ${selectedOption?.pointType === 'POSTAMAT' ? 'постамат' : 'пункт выдачи'}`}
                    </Typography>
                  );
                const pt = cdekPoints.find((p) => p.code === val);
                return (
                  <Typography sx={{ color: c.main, fontSize: '14px' }} noWrap>
                    {pt?.name || val}
                  </Typography>
                );
              }}
            >
              <MenuItem value="" disabled>
                <Typography sx={{ color: c['20'], fontSize: '16px' }}>
                  {pointsLoading
                    ? 'Загрузка пунктов...'
                    : `Выберите ${selectedOption.pointType === 'POSTAMAT' ? 'постамат' : 'пункт выдачи'}`}
                </Typography>
              </MenuItem>
              {cdekPoints.map((pt) => (
                <MenuItem key={pt.code} value={pt.code}>
                  <Box>
                    <Typography sx={{ fontSize: 14, color: c.main }}>{pt.name}</Typography>
                    <Typography sx={{ fontSize: 12, color: c['40'] }}>
                      {pt.location.address_full || pt.location.address}
                    </Typography>
                    {pt.work_time && (
                      <Typography sx={{ fontSize: 11, color: c['40'] }}>{pt.work_time}</Typography>
                    )}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      )}

      <Button
        variant="contained"
        fullWidth
        disabled={!isStep2Valid || submitting}
        onClick={handleSubmit}
        sx={btnSx}
      >
        {submitting ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'Перейти к оплате'}
      </Button>
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
          Ваш заказ
        </Typography>
        <MuiLink
          component={Link}
          href="/basket"
          underline="none"
          sx={{ color: c['40'], ...text, cursor: 'pointer' }}
        >
          Изменить
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
                    {item.quantity} шт
                  </Typography>
                  <Typography sx={{ color: c.main, ...textSm, mt: 0.5 }}>
                    {item.unitPrice != null ? fmt(item.unitPrice) : '—'} /шт
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
              <Typography sx={{ color: c.main, ...text }}>Стоимость товара:</Typography>
              <Typography sx={{ color: c.main, ...text }}>{fmt(subtotal)}</Typography>
            </Stack>
            {promoDiscount > 0 && (
              <Stack direction="row" justifyContent="space-between" sx={{ mb: 1.5 }}>
                <Typography sx={{ color: '#2e7d32', ...text }}>
                  Скидка{promoResult?.code ? ` (${promoResult.code})` : ''}:
                </Typography>
                <Typography sx={{ color: '#2e7d32', ...text }}>−{fmt(promoDiscount)}</Typography>
              </Stack>
            )}
            {customerDiscount > 0 && (
              <Stack direction="row" justifyContent="space-between" sx={{ mb: 1.5 }}>
                <Typography sx={{ color: '#2e7d32', ...text }}>
                  Персональная скидка ({customerDiscountPercent}%):
                </Typography>
                <Typography sx={{ color: '#2e7d32', ...text }}>−{fmt(customerDiscount)}</Typography>
              </Stack>
            )}
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 1.5 }}>
              <Typography sx={{ color: c.main, ...text }}>Стоимость доставки:</Typography>
              <Typography sx={{ color: c.main, ...text }}>0 {'\u20BD'}</Typography>
            </Stack>
          </Box>

          <Divider sx={{ borderColor: c.main, borderWidth: '0.5px', mb: 2 }} />

          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography sx={{ ...h2Sx, color: c.main }}>ИТОГО:</Typography>
            <Typography sx={{ ...h2Sx, color: c.main }}>{fmt(finalTotal)}</Typography>
          </Stack>

          <Typography sx={{ color: c.main, ...info, mt: 1 }}>*Доставка бесплатная</Typography>
        </>
      )}
    </Paper>
  );

  return (
    <Box sx={{ maxWidth: 1300, mx: 'auto', px: 2, py: 4 }}>
      {breadcrumbs}

      <Typography sx={{ ...h1Sx, textTransform: 'uppercase', color: c.main, mb: 1.5 }}>
        Оформление заказа
      </Typography>

      {!isLogged && (
        <Typography sx={{ ...textSm, color: c.main, mb: 4 }}>
          Уже есть аккаунт?{' '}
          <MuiLink
            component={Link}
            href="/login"
            underline="always"
            sx={{ color: c.main, ...textSm, fontWeight: 'bold' }}
          >
            Войдите
          </MuiLink>{' '}
          или{' '}
          <MuiLink
            component={Link}
            href="/login/register"
            underline="always"
            sx={{ color: c.main, ...textSm, fontWeight: 'bold' }}
          >
            зарегистрируйтесь
          </MuiLink>{' '}
          для быстрого оформления.
        </Typography>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
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
