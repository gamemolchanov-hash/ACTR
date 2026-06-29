'use client';

import { useMemo } from 'react';
import { Box } from '@mui/material';
import { loadStripe } from '@stripe/stripe-js';
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js';

interface Props {
  clientSecret: string;
  publishableKey: string;
}

/**
 * Stripe Embedded Checkout (ui_mode=embedded).
 * Loaded client-side only via next/dynamic ssr:false.
 * `loadStripe` is memoised on publishableKey so the Stripe iframe
 * is not remounted on every parent re-render.
 */
export default function StripeEmbeddedCheckout({ clientSecret, publishableKey }: Props) {
  const stripePromise = useMemo(() => loadStripe(publishableKey), [publishableKey]);

  return (
    <Box sx={{ width: '100%' }}>
      <EmbeddedCheckoutProvider stripe={stripePromise} options={{ clientSecret }}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </Box>
  );
}
