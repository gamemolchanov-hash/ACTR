'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Box, IconButton, useMediaQuery } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { fetchShippingRates } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { dismissMyBanners, getMyBanners } from '@/lib/auth';
import { lowestFreeShippingThreshold } from '@/lib/checkout';
import { fmtMoneyShort } from '@/lib/money';
import { palette } from '@/lib/theme';
import { useCurrency, useFormatLocale } from '@/providers/CurrencyProvider';

/**
 * Banner slot above the catalog (home, /catalog, /catalog/[slug]) — the ACRU slot
 * (BS-7 / F4) adapted to Turkey, owner 07.10.2026: one slide, "free shipping from
 * <amount>". The artwork is the ACRU delivery banner with its Russian copy and
 * Russian carrier logos removed (public/promo-delivery); the copy is drawn on top
 * as SVG text in the page language, so it stays in next-intl / Tolgee.
 *
 * The amount is the smallest `free_threshold` of the shipping methods ARM offers
 * for Turkey (the same number checkout shows under a paid method) — never
 * hardcoded. No threshold → no banner.
 */

export const DISMISSED_BANNERS_KEY = 'storefront_dismissed_banners';
export const DELIVERY_BANNER_ID = 'delivery';

const MOBILE = '(max-width: 599px)';
/**
 * The rates endpoint needs a destination; the threshold is a property of the
 * method, not of the address, so any Turkish postcode answers the same.
 */
const RATES_PROBE = { country: 'TR', postalCode: '06000', items: [] };

const FONT = 'LiraFix, "Jost", "Jost Fallback", Arial, sans-serif';
const RED = '#EF3D2E';
const NAVY = '#234289';
/** Cap height of Jost as a share of the font size — stacks the right-hand lines. */
const CAP = 0.7;

interface ArtLayout {
  width: number;
  height: number;
  /** Two-line headline on the curtain: left x, baselines, size, max width. */
  headX: number;
  headBaselines: [number, number];
  headSize: number;
  headMax: number;
  /** Amount block right of the truck: centre x, max width, sizes, gap, centre y. */
  blockX: number;
  blockMax: number;
  bigSize: number;
  smallSize: number;
  gap: number;
  blockY: number;
}

/** Coordinates in the pixels of the artwork files (desktop 2880×360, mobile 1280×200). */
const DESKTOP: ArtLayout = {
  width: 2880,
  height: 360,
  headX: 107,
  headBaselines: [190, 322],
  headSize: 134,
  headMax: 715,
  blockX: 2395,
  blockMax: 490,
  bigSize: 118,
  smallSize: 58,
  gap: 30,
  blockY: 180,
};
const MOBILE_ART: ArtLayout = {
  width: 1280,
  height: 200,
  headX: 21,
  headBaselines: [104, 166],
  headSize: 61,
  headMax: 370,
  blockX: 1078,
  blockMax: 200,
  bigSize: 56,
  smallSize: 30,
  gap: 13,
  blockY: 100,
};

function readLocalDismissed(): string[] {
  try {
    const raw = localStorage.getItem(DISMISSED_BANNERS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

function writeLocalDismissed(ids: string[]) {
  try {
    localStorage.setItem(DISMISSED_BANNERS_KEY, JSON.stringify(ids));
  } catch {
    /* ignore */
  }
}

const union = (a: string[], b: string[]) => Array.from(new Set([...a, ...b]));

/**
 * SVG text that shrinks to `maxWidth` when a translation or an amount is longer
 * than the room the artwork leaves (measured after the web fonts load).
 */
function FitText({
  maxWidth,
  fontSize,
  children: text,
  ...rest
}: {
  x: number;
  y: number;
  maxWidth: number;
  fontSize: number;
  fill: string;
  fontWeight: number;
  textAnchor?: 'start' | 'middle';
  children: string;
}) {
  const ref = useRef<SVGTextElement>(null);
  const [size, setSize] = useState(fontSize);

  useLayoutEffect(() => {
    let alive = true;
    const fit = () => {
      const el = ref.current;
      // no SVG layout (jsdom, very old engines) → keep the design size
      if (!alive || !el || typeof el.getComputedTextLength !== 'function') return;
      el.setAttribute('font-size', String(fontSize));
      const len = el.getComputedTextLength();
      setSize(len > maxWidth ? (fontSize * maxWidth) / len : fontSize);
    };
    fit();
    document.fonts?.ready.then(fit).catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [fontSize, maxWidth, text]);

  return (
    <text ref={ref} fontSize={size} fontFamily={FONT} {...rest}>
      {text}
    </text>
  );
}

interface BlockLine {
  text: string;
  big: boolean;
}

function DeliveryArt({
  art,
  headline,
  lines,
}: {
  art: ArtLayout;
  headline: [string, string];
  lines: BlockLine[];
}) {
  const sizes = lines.map((l) => (l.big ? art.bigSize : art.smallSize));
  const height = sizes.reduce((sum, s) => sum + s * CAP, 0) + art.gap * (lines.length - 1);
  let baseline = art.blockY - height / 2;
  const placed = lines.map((line, i) => {
    baseline += sizes[i] * CAP;
    const y = baseline;
    baseline += art.gap;
    return { ...line, y, size: sizes[i] };
  });

  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${art.width} ${art.height}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
    >
      {headline.map((word, i) => (
        <FitText
          key={`h${i}`}
          x={art.headX}
          y={art.headBaselines[i]}
          maxWidth={art.headMax}
          fontSize={art.headSize}
          fontWeight={400}
          fill={RED}
        >
          {word}
        </FitText>
      ))}
      {placed.map((line, i) => (
        <FitText
          key={`l${i}`}
          x={art.blockX}
          y={line.y}
          textAnchor="middle"
          maxWidth={art.blockMax}
          fontSize={line.size}
          fontWeight={line.big ? 500 : 400}
          fill={NAVY}
        >
          {line.text}
        </FitText>
      ))}
    </svg>
  );
}

export function BannerSlot() {
  const t = useTranslations('promo');
  const { token } = useAuth();
  const currency = useCurrency();
  const formatLocale = useFormatLocale();
  const mobile = useMediaQuery(MOBILE, { noSsr: true });
  // null — the closed list is not read yet (the slot is not drawn until then, no flash)
  const [dismissed, setDismissed] = useState<string[] | null>(null);

  const { data: threshold } = useQuery({
    queryKey: ['free-shipping-threshold', currency],
    queryFn: async () => lowestFreeShippingThreshold((await fetchShippingRates(RATES_PROBE)).rates),
    staleTime: 10 * 60 * 1000,
  });

  // Local list first; with a token — the account list, local ids are pushed up to it.
  useEffect(() => {
    const local = readLocalDismissed();
    setDismissed(local);
    if (!token) return;
    let alive = true;
    getMyBanners()
      .then((server) => {
        if (!alive) return;
        const merged = union(server, local);
        setDismissed(merged);
        writeLocalDismissed(merged);
        const missing = local.filter((id) => !server.includes(id));
        if (missing.length) dismissMyBanners(missing).catch(() => undefined);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [token]);

  const close = useCallback(() => {
    const next = union(dismissed ?? [], [DELIVERY_BANNER_ID]);
    setDismissed(next);
    writeLocalDismissed(next);
    if (token) dismissMyBanners([DELIVERY_BANNER_ID]).catch(() => undefined);
  }, [dismissed, token]);

  if (dismissed === null || dismissed.includes(DELIVERY_BANNER_ID) || threshold == null) return null;

  const amount = fmtMoneyShort(threshold, currency, formatLocale);
  // The line that carries the amount is set large; which line it is depends on
  // the language ("ORDERS FROM / ₺3.000" vs "₺3.000 / VE ÜZERİ").
  const lines: BlockLine[] = (['deliveryLine1', 'deliveryLine2'] as const).map((key) => ({
    text: t(key, { amount }),
    big: String(t.raw(key)).includes('{amount}'),
  }));

  return (
    <Box
      data-testid="sf-banner-slot"
      sx={{ maxWidth: 1300, mx: 'auto', px: 2, pt: 2, pb: { xs: 1, md: 2 }, position: 'relative' }}
    >
      <IconButton
        aria-label={t('close')}
        data-testid="sf-banner-close"
        onClick={close}
        size="small"
        sx={{
          position: 'absolute',
          // On a phone the banner is ~56 px tall: a smaller × tucked into the
          // corner keeps it off the amount.
          top: { xs: 19, sm: 24 },
          right: { xs: 19, sm: 24 },
          zIndex: 2,
          width: { xs: 22, sm: 28 },
          height: { xs: 22, sm: 28 },
          bgcolor: 'rgba(255,255,255,0.85)',
          color: palette.primary,
          '&:hover': { bgcolor: 'white' },
        }}
      >
        <CloseIcon sx={{ fontSize: { xs: 15, sm: 18 } }} />
      </IconButton>
      <Link
        href="/delivery"
        data-testid="sf-banner-delivery"
        style={{ display: 'block', position: 'relative', borderRadius: 20, overflow: 'hidden' }}
        aria-label={t('deliveryAlt', { amount })}
      >
        <picture>
          <source media={MOBILE} srcSet="/promo-delivery/banner-mobile.png" />
          <img
            src="/promo-delivery/banner-desktop.png"
            alt={t('deliveryAlt', { amount })}
            style={{ display: 'block', width: '100%', height: 'auto' }}
          />
        </picture>
        <DeliveryArt
          art={mobile ? MOBILE_ART : DESKTOP}
          headline={[t('deliveryHeadline1'), t('deliveryHeadline2')]}
          lines={lines}
        />
      </Link>
    </Box>
  );
}
