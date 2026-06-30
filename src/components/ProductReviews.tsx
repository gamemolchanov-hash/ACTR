'use client';

/**
 * Product reviews block (FBG-69).
 *
 * Lists approved reviews + the aggregate rating, and lets a logged-in customer
 * submit a new one. Submitted reviews are moderated server-side (status:draft)
 * and only appear here once approved. Review text is rendered as a plain React
 * text node (auto-escaped) — never via dangerouslySetInnerHTML.
 *
 * WR-02: Dates use Intl.DateTimeFormat(locale) — no ru-RU hardcode.
 *        Review count uses ICU plural t('product.reviewCount',{count}).
 */

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Rating,
  TextField,
  Typography,
} from '@mui/material';
import VerifiedIcon from '@mui/icons-material/Verified';
import { useTranslations, useLocale } from 'next-intl';
import { fetchProductReviews, submitReview } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { useAuth } from '@/lib/auth-context';
import { palette } from '@/lib/theme';

interface Props {
  productId: string;
}

function extractError(err: unknown): string | null {
  const e = err as { response?: { data?: { error?: string; message?: string } } };
  return e?.response?.data?.error || e?.response?.data?.message || null;
}

export function ProductReviews({ productId }: Props) {
  const t = useTranslations('product');
  const locale = useLocale();
  const bcp47 = locale === 'tr' ? 'tr-TR' : 'en-US';

  // Locale-aware date formatter (WR-02)
  const fmtDate = (d: string | null | undefined) => {
    if (!d) return '';
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat(bcp47, {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(date);
  };

  const { customer } = useAuth();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['product-reviews', productId],
    queryFn: () => fetchProductReviews(productId),
    enabled: !!productId,
  });

  const [rating, setRating] = useState<number | null>(5);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [thanks, setThanks] = useState<string | null>(null);

  const submitMut = useMutation({
    mutationFn: () => {
      const token = getToken();
      if (!token) throw new Error('no-token');
      return submitReview(
        { product: productId, rating: rating || 5, text: text.trim() || undefined },
        token,
      );
    },
    onSuccess: (res) => {
      setThanks(res.message);
      setText('');
      setRating(5);
      setError(null);
      qc.invalidateQueries({ queryKey: ['product-reviews', productId] });
    },
    onError: (err) => {
      setThanks(null);
      setError(extractError(err) || t('sendError'));
    },
  });

  const reviews = data?.data || [];
  const average = data?.meta?.average || 0;
  const total = data?.meta?.total || 0;

  return (
    <Box
      sx={{
        mt: 4,
        mb: 4,
        px: { xs: 2, md: 4 },
        py: 4,
        bgcolor: palette.bgLight,
        borderRadius: '20px',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2, flexWrap: 'wrap', mb: 3 }}>
        <Typography variant="h3">{t('reviews')}</Typography>
        {total > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Rating value={average} precision={0.1} readOnly size="small" />
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {/* WR-02: ICU plural — no Russian one/few/many pluralization */}
              {average.toFixed(1)} · {t('reviewCount', { count: total })}
            </Typography>
          </Box>
        )}
      </Box>

      {/* Submit form / login prompt */}
      <Box sx={{ mb: 4 }}>
        {!!customer ? (
          <Box sx={{ maxWidth: 560 }}>
            {thanks ? (
              <Alert severity="success" onClose={() => setThanks(null)}>
                {thanks}
              </Alert>
            ) : (
              <>
                {error && (
                  <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                    {error}
                  </Alert>
                )}
                <Typography variant="body2" sx={{ mb: 1 }}>
                  {t('yourRating')}
                </Typography>
                <Rating
                  value={rating}
                  onChange={(_, v) => setRating(v)}
                  sx={{ mb: 2 }}
                  aria-label={t('ratingAriaLabel')}
                />
                <TextField
                  fullWidth
                  multiline
                  minRows={3}
                  placeholder={t('sharePlaceholder')}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  inputProps={{ maxLength: 2000 }}
                  sx={{ mb: 2, bgcolor: palette.white }}
                />
                <Button
                  variant="contained"
                  disabled={submitMut.isPending || !rating}
                  onClick={() => submitMut.mutate()}
                >
                  {submitMut.isPending ? t('submitting') : t('submitReview')}
                </Button>
              </>
            )}
          </Box>
        ) : (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('loginPromptText')}{' '}
            <Box component="a" href="/login" sx={{ color: palette.primary, fontWeight: 600 }}>
              {t('loginLink')}
            </Box>
            .
          </Typography>
        )}
      </Box>

      <Divider sx={{ mb: 3 }} />

      {/* Reviews list */}
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={28} />
        </Box>
      ) : reviews.length === 0 ? (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('noReviews')}
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {reviews.map((r) => (
            <Box key={r.id}>
              <Box
                sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.5 }}
              >
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {r.author || t('customer')}
                </Typography>
                {r.verified_purchase && (
                  <Chip
                    icon={<VerifiedIcon sx={{ fontSize: 16 }} />}
                    label={t('verifiedPurchase')}
                    size="small"
                    color="success"
                    variant="outlined"
                  />
                )}
                <Typography variant="caption" sx={{ color: 'text.secondary', ml: 'auto' }}>
                  {fmtDate(r.date_created)}
                </Typography>
              </Box>
              <Rating value={r.rating} readOnly size="small" sx={{ mb: 0.5 }} />
              {r.text && (
                <Typography
                  variant="body2"
                  sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                >
                  {r.text}
                </Typography>
              )}
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
