'use client';

/**
 * Product reviews block (FBG-69).
 *
 * Lists approved reviews + the aggregate rating, and lets a logged-in customer
 * submit a new one. Submitted reviews are moderated server-side (status:draft)
 * and only appear here once approved. Review text is rendered as a plain React
 * text node (auto-escaped) — never via dangerouslySetInnerHTML.
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
import { fetchProductReviews, submitReview } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { useAuth } from '@/lib/auth-context';
import { palette } from '@/lib/theme';

interface Props {
  productId: string;
}

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' });

function extractError(err: unknown): string {
  const e = err as { response?: { data?: { error?: string; message?: string } } };
  return (
    e?.response?.data?.error ||
    e?.response?.data?.message ||
    'Не удалось отправить отзыв. Попробуйте позже.'
  );
}

export function ProductReviews({ productId }: Props) {
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
      setError(extractError(err));
    },
  });

  const reviews = data?.data || [];
  const average = data?.meta.average || 0;
  const total = data?.meta.total || 0;

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
        <Typography variant="h3">Отзывы</Typography>
        {total > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Rating value={average} precision={0.1} readOnly size="small" />
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {average.toFixed(1)} · {total}{' '}
              {total % 10 === 1 && total % 100 !== 11 ? 'отзыв' : 'отзывов'}
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
                  Ваша оценка
                </Typography>
                <Rating
                  value={rating}
                  onChange={(_, v) => setRating(v)}
                  sx={{ mb: 2 }}
                  aria-label="Оценка"
                />
                <TextField
                  fullWidth
                  multiline
                  minRows={3}
                  placeholder="Поделитесь впечатлениями о товаре…"
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
                  {submitMut.isPending ? 'Отправка…' : 'Оставить отзыв'}
                </Button>
              </>
            )}
          </Box>
        ) : (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Чтобы оставить отзыв,{' '}
            <Box component="a" href="/login" sx={{ color: palette.primary, fontWeight: 600 }}>
              войдите в аккаунт
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
          Пока нет отзывов. Будьте первым!
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {reviews.map((r) => (
            <Box key={r.id}>
              <Box
                sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.5 }}
              >
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {r.author || 'Покупатель'}
                </Typography>
                {r.verified_purchase && (
                  <Chip
                    icon={<VerifiedIcon sx={{ fontSize: 16 }} />}
                    label="Покупка подтверждена"
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
