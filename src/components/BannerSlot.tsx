'use client';

import { useCallback, useEffect, useState } from 'react';
import { Box, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { dismissMyBanners, getMyBanners } from '@/lib/auth';
import { imgOriginal } from '@/lib/image-url';
import { palette } from '@/lib/theme';

/**
 * Banner slot of the storefront (home, /catalog, /catalog/[slug]). Shows the
 * banners the staff uploaded in the back office ("Banners" section, `GET /banners`):
 * the reply holds only the ones running now, in display order; several banners
 * rotate.
 *
 * Nothing is built into the storefront code: since 12.11.2026 the "free shipping from
 * <amount>" slide is a regular banner of that section (it used to be artwork with
 * the copy and the ARM threshold drawn on top by this component).
 * No banners — the slot is not drawn.
 */
interface UploadedBannerImage {
  /** Image key — served by the same public route as product photos (`imgOriginal`). */
  path: string;
  width: number;
  height: number;
}

/** A back-office banner: the reply holds only the ones active now, in display order. */
interface UploadedBanner {
  id: string;
  alt: string;
  /** Storefront path ("/catalog"), "https://…" or null — a banner without a link. */
  href: string | null;
  desktop: UploadedBannerImage;
  mobile: UploadedBannerImage | null;
  /** ISO, end of the show window. */
  ends_at: string | null;
}

const ROTATE_MS = 5000;
const MOBILE = '(max-width: 599px)';
const SLIDE_STYLE = {
  display: 'block',
  position: 'relative',
  borderRadius: 20,
  overflow: 'hidden',
} as const;

/**
 * Close button: a closed banner stays hidden until the staff publish a new one —
 * the slide id is `banner:<id>`. A guest keeps the choice in localStorage, a
 * signed-in customer on the account (GET/POST /auth/me/banners); the local list is
 * pushed up to the account on sign-in.
 */
export const DISMISSED_BANNERS_KEY = 'storefront_dismissed_banners';
export const uploadedBannerId = (id: string) => `banner:${id}`;

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

/** The `/banners` reply is outside data: an entry without an id or an image is not drawn. */
function isUploadedBanner(v: unknown): v is UploadedBanner {
  if (!v || typeof v !== 'object') return false;
  const { id, desktop } = v as Partial<UploadedBanner>;
  return typeof id === 'string' && !!id && typeof desktop?.path === 'string' && !!desktop.path;
}

/** The show window is still open: a cached reply must not outlive `ends_at`. */
function isLive(banner: UploadedBanner, now: number): boolean {
  if (!banner.ends_at) return true;
  const end = new Date(banner.ends_at).getTime();
  return Number.isNaN(end) || end > now;
}

/**
 * Where a banner leads: a storefront path ("/catalog") or "http(s)://…"; anything
 * else (including "//host" and "javascript:") — a banner without a link.
 */
function bannerHref(href: unknown): { internal: boolean; href: string } | null {
  if (typeof href !== 'string') return null;
  if (/^\/(?![/\\])/.test(href)) return { internal: true, href };
  if (/^https?:\/\//i.test(href)) return { internal: false, href };
  return null;
}

/**
 * Slide of a banner. `width`/`height` come from the reply so the browser reserves
 * the room before the image loads (`<source>` carries its own: the mobile image
 * has another aspect ratio).
 */
function UploadedSlide({ banner }: { banner: UploadedBanner }) {
  const { desktop, mobile } = banner;
  const picture = (
    <picture>
      {mobile?.path && (
        <source
          media={MOBILE}
          srcSet={imgOriginal(mobile.path)}
          width={mobile.width}
          height={mobile.height}
        />
      )}
      <img
        data-testid="sf-banner-uploaded"
        src={imgOriginal(desktop.path)}
        alt={banner.alt ?? ''}
        width={desktop.width}
        height={desktop.height}
        style={{ display: 'block', width: '100%', height: 'auto' }}
      />
    </picture>
  );
  const link = bannerHref(banner.href);
  if (!link) return <div style={SLIDE_STYLE}>{picture}</div>;
  if (link.internal) {
    return (
      <Link href={link.href} style={SLIDE_STYLE}>
        {picture}
      </Link>
    );
  }
  return (
    <a href={link.href} style={SLIDE_STYLE}>
      {picture}
    </a>
  );
}

export function BannerSlot() {
  const t = useTranslations('promo');
  const { token } = useAuth();
  // null — `/banners` has not answered yet: the slot is not drawn
  const [uploaded, setUploaded] = useState<UploadedBanner[] | null>(null);
  const [slide, setSlide] = useState(0);
  // null — the closed list is not read yet (the slot is not drawn until then, no flash)
  const [dismissed, setDismissed] = useState<string[] | null>(null);

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

  // A failed request means "no banners": the slot is not drawn.
  useEffect(() => {
    let alive = true;
    api
      .get<{ data: unknown }>('/banners')
      .then((res) => {
        if (!alive) return;
        const list = res.data?.data;
        setUploaded(Array.isArray(list) ? list.filter(isUploadedBanner) : []);
      })
      .catch(() => {
        if (alive) setUploaded([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  const now = Date.now();
  const slides = (uploaded ?? [])
    .filter((b) => isLive(b, now))
    .map((b) => ({ id: uploadedBannerId(b.id), banner: b }))
    .filter((sl) => !(dismissed ?? []).includes(sl.id));

  useEffect(() => {
    if (slides.length < 2) return;
    const id = setInterval(() => setSlide((s) => (s + 1) % slides.length), ROTATE_MS);
    return () => clearInterval(id);
  }, [slides.length]);

  const close = useCallback(() => {
    // Close everything published now: a new banner = a new id, it shows again.
    const ids = slides.map((sl) => sl.id);
    const next = union(dismissed ?? [], ids);
    setDismissed(next);
    writeLocalDismissed(next);
    if (token) dismissMyBanners(ids).catch(() => undefined);
  }, [slides, dismissed, token]);

  if (dismissed === null || uploaded === null || slides.length === 0) return null;

  // The list may have changed (a banner's window closed) — the index is taken modulo
  // its length.
  const current = slides[slide % slides.length];

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
          // corner keeps it off the banner's copy.
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
      <UploadedSlide key={current.id} banner={current.banner} />
    </Box>
  );
}
