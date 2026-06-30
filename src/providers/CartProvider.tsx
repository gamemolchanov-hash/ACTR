'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { Dialog, DialogContent, Typography, Box, Button, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import type { CartItem } from '@/lib/api';
import { palette } from '@/lib/theme';

interface CartContextValue {
  items: CartItem[];
  totalQuantity: number;
  addItem: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

const STORAGE_KEY = 'storefront_cart';

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const skipPersist = useRef(true);
  const router = useRouter();
  const t = useTranslations();

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setItems(JSON.parse(stored));
    } catch {
      /* ignore */
    }
  }, []);

  // Persist to localStorage — skip the very first run (items=[])
  useEffect(() => {
    if (skipPersist.current) {
      skipPersist.current = false;
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* ignore */
    }
  }, [items]);

  const addItem = useCallback((productId: string, quantity: number) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === productId);
      if (existing) {
        return prev.map((i) =>
          i.productId === productId ? { ...i, quantity: i.quantity + quantity } : i,
        );
      }
      return [...prev, { productId, quantity }];
    });
    setModalOpen(true);
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    setItems((prev) => prev.map((i) => (i.productId === productId ? { ...i, quantity } : i)));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const totalQuantity = useMemo(() => items.reduce((sum, i) => sum + i.quantity, 0), [items]);

  const value = useMemo<CartContextValue>(
    () => ({ items, totalQuantity, addItem, removeItem, updateQuantity, clearCart }),
    [items, totalQuantity, addItem, removeItem, updateQuantity, clearCart],
  );

  return (
    <CartContext.Provider value={value}>
      {children}
      <Dialog
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        PaperProps={{
          sx: {
            maxWidth: 720,
            width: '100%',
            borderRadius: '20px',
            py: 4,
            px: 3,
            position: 'relative',
            m: 2,
          },
        }}
        slotProps={{
          backdrop: {
            sx: {
              backgroundColor: 'rgba(51, 74, 159, 0.2)',
              backdropFilter: 'blur(2.5px)',
            },
          },
        }}
      >
        <IconButton
          onClick={() => setModalOpen(false)}
          sx={{ position: 'absolute', top: 12, right: 12, color: palette.primary }}
        >
          <CloseIcon />
        </IconButton>

        <DialogContent sx={{ textAlign: 'center', p: 0, overflow: 'visible' }}>
          <Typography
            variant="h2"
            sx={{ fontWeight: 450, textTransform: 'uppercase', color: palette.primary, mb: 1.5 }}
          >
            {t('cart.added')}
          </Typography>

          <Typography sx={{ fontSize: 18, color: palette.primary, mb: 4 }}>
            {t('cart.total', { count: totalQuantity })}
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button
              variant="outlined"
              onClick={() => setModalOpen(false)}
              sx={{
                flex: 1,
                maxWidth: 280,
                bgcolor: palette.bgLight,
                borderColor: palette.primary,
                color: palette.primary,
                borderRadius: '10px',
                py: 1.5,
                fontSize: 18,
                fontWeight: 450,
                textTransform: 'none',
                '&:hover': { bgcolor: palette.primaryLight, borderColor: palette.primary },
              }}
            >
              {t('cart.continueShopping')}
            </Button>

            <Button
              variant="contained"
              onClick={() => {
                setModalOpen(false);
                router.push('/basket');
              }}
              sx={{
                flex: 1,
                maxWidth: 280,
                bgcolor: palette.primary,
                color: palette.white,
                borderRadius: '10px',
                py: 1.5,
                fontSize: 18,
                fontWeight: 450,
                textTransform: 'none',
                '&:hover': { bgcolor: '#2a3d85' },
              }}
            >
              {t('cart.checkout')}
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
