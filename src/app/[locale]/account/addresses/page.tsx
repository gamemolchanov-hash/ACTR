'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Checkbox,
  Grid,
  IconButton,
  Snackbar,
  Alert,
} from '@mui/material';
import { ArrowBack, Add, Delete, LocationOn } from '@mui/icons-material';
import { Link } from '@/i18n/navigation';
import { useRouter } from '@/i18n/navigation';
import { palette } from '@/lib/theme';
import { useAuth } from '@/lib/auth-context';
import {
  getMyAddresses,
  addMyAddress,
  deleteMyAddress,
  type CustomerAddress,
} from '@/lib/auth';
import { useTranslations } from 'next-intl';

const fontMain = 'LiraFix, "Futura PT", Helvetica, sans-serif';
const fontBody = '"Open Sans", Helvetica, sans-serif';

const emptyForm = {
  label: '',
  city: '',
  address: '',
  street: '',
  building: '',
  apartment: '',
  postal_code: '',
  contact_name: '',
  contact_phone: '',
  is_default: false,
};

type AddressForm = typeof emptyForm;

export default function AddressesPage() {
  const t = useTranslations('account');
  const tCommon = useTranslations('common');

  const { customer, loading: authLoading } = useAuth();
  const router = useRouter();

  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<AddressForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  useEffect(() => {
    if (!authLoading && !customer) router.replace('/login');
  }, [authLoading, customer, router]);

  useEffect(() => {
    if (!customer) return;
    setLoading(true);
    getMyAddresses()
      .then(({ data }) => setAddresses(data || []))
      .catch(() => setAddresses([]))
      .finally(() => setLoading(false));
  }, [customer]);

  const handleOpenDialog = () => {
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    if (saving) return;
    setDialogOpen(false);
  };

  const handleFormChange = (field: keyof AddressForm) => (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const value = field === 'is_default' ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAdd = async () => {
    if (!form.city && !form.address) {
      setSnack({ open: true, message: 'Please enter at least a city or address.', severity: 'error' });
      return;
    }
    setSaving(true);
    try {
      const payload: Partial<CustomerAddress> = {
        label: form.label || null,
        city: form.city || null,
        address: form.address || null,
        street: form.street || null,
        building: form.building || null,
        apartment: form.apartment || null,
        postal_code: form.postal_code || null,
        contact_name: form.contact_name || null,
        contact_phone: form.contact_phone || null,
        is_default: form.is_default,
      };
      const { data: newAddr } = await addMyAddress(payload);
      setAddresses((prev) =>
        form.is_default
          ? [newAddr, ...prev.map((a) => ({ ...a, is_default: false }))]
          : [...prev, newAddr],
      );
      setDialogOpen(false);
      setSnack({ open: true, message: 'Address added.', severity: 'success' });
    } catch {
      setSnack({ open: true, message: 'Failed to add address. Please try again.', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    // Optimistic removal
    setAddresses((prev) => prev.filter((a) => a.id !== id));
    try {
      await deleteMyAddress(id);
    } catch {
      // Restore if delete failed — refetch
      if (customer) {
        getMyAddresses()
          .then(({ data }) => setAddresses(data || []))
          .catch(() => {});
      }
      setSnack({ open: true, message: 'Failed to delete address.', severity: 'error' });
    }
  };

  if (authLoading) return null;

  return (
    <Box sx={{ overflow: 'hidden' }}>
      <Box sx={{ maxWidth: 1300, mx: 'auto', px: { xs: 2.5, md: 2 }, mt: { xs: 2, md: 3 } }}>
        <Typography
          sx={{ fontFamily: fontBody, fontSize: 13, color: palette.primaryLight, mb: 0.5 }}
        >
          <Link href="/" style={{ color: palette.primaryLight, textDecoration: 'none' }}>
            {tCommon('home')}
          </Link>
          {' / '}
          <Link href="/account" style={{ color: palette.primaryLight, textDecoration: 'none' }}>
            {t('breadcrumb')}
          </Link>
          {` / ${t('addresses')}`}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button
              component={Link}
              href="/account"
              sx={{ minWidth: 'auto', p: 0.5, color: palette.primary }}
            >
              <ArrowBack />
            </Button>
            <Typography
              variant="h1"
              sx={{ fontSize: { xs: 24, md: 40 }, fontWeight: 450, letterSpacing: { xs: 2, md: 0 } }}
            >
              {t('addressesTitle')}
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleOpenDialog}
            sx={{
              bgcolor: palette.primary,
              borderRadius: '10px',
              textTransform: 'none',
              fontFamily: fontMain,
              fontSize: 15,
              px: 3,
              whiteSpace: 'nowrap',
            }}
          >
            {t('addAddress')}
          </Button>
        </Box>
      </Box>

      <Box sx={{ maxWidth: 1300, mx: 'auto', px: { xs: 2.5, md: 2 }, mb: { xs: 4, md: 7 } }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
            <CircularProgress sx={{ color: palette.primary }} />
          </Box>
        ) : addresses.length === 0 ? (
          <Box sx={{ bgcolor: palette.bgLight, borderRadius: '20px', p: 4, textAlign: 'center' }}>
            <LocationOn sx={{ fontSize: 48, color: palette.primaryLight, mb: 1 }} />
            <Typography sx={{ fontFamily: fontMain, fontSize: 18, color: palette.primary, mb: 2 }}>
              No delivery addresses yet
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={handleOpenDialog}
              sx={{
                bgcolor: palette.primary,
                borderRadius: '10px',
                textTransform: 'none',
                fontFamily: fontMain,
                px: 4,
              }}
            >
              Add Address
            </Button>
          </Box>
        ) : (
          <Grid container spacing={3}>
            {addresses.map((addr) => (
              <Grid item xs={12} sm={6} md={4} key={addr.id}>
                <Card
                  sx={{
                    bgcolor: palette.bgLight,
                    borderRadius: '20px',
                    border: addr.is_default ? `2px solid ${palette.primary}` : 'none',
                    boxShadow: 'none',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <CardContent sx={{ p: 3, flex: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                      <Typography
                        sx={{ fontFamily: fontMain, fontSize: 16, fontWeight: 500, color: palette.primary }}
                      >
                        {addr.label || 'Address'}
                      </Typography>
                      {addr.is_default && (
                        <Chip
                          label="Default"
                          size="small"
                          sx={{
                            bgcolor: palette.primary,
                            color: 'white',
                            fontFamily: fontBody,
                            fontSize: 11,
                            height: 22,
                          }}
                        />
                      )}
                    </Box>
                    {[
                      addr.contact_name,
                      addr.contact_phone,
                      [addr.street, addr.building, addr.apartment]
                        .filter(Boolean)
                        .join(', ') || addr.address,
                      [addr.city, addr.postal_code].filter(Boolean).join(' '),
                    ]
                      .filter(Boolean)
                      .map((line, i) => (
                        <Typography
                          key={i}
                          sx={{ fontFamily: fontBody, fontSize: 14, color: palette.primaryLight, lineHeight: 1.6 }}
                        >
                          {line}
                        </Typography>
                      ))}
                  </CardContent>
                  <CardActions sx={{ px: 2, pb: 2, pt: 0, justifyContent: 'flex-end' }}>
                    <IconButton
                      onClick={() => handleDelete(addr.id)}
                      size="small"
                      sx={{ color: palette.primaryLight, '&:hover': { color: 'error.main' } }}
                      aria-label="Delete address"
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

      {/* Add Address Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: '20px' } }}
      >
        <DialogTitle sx={{ fontFamily: fontMain, fontSize: 20, fontWeight: 500, color: palette.primary }}>
          Add Delivery Address
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField
                label="Label (e.g. Home, Work)"
                value={form.label}
                onChange={handleFormChange('label')}
                fullWidth
                size="small"
                inputProps={{ maxLength: 50 }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Contact Name"
                value={form.contact_name}
                onChange={handleFormChange('contact_name')}
                fullWidth
                size="small"
                inputProps={{ maxLength: 100 }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Contact Phone"
                value={form.contact_phone}
                onChange={handleFormChange('contact_phone')}
                fullWidth
                size="small"
                inputProps={{ maxLength: 30 }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="City *"
                value={form.city}
                onChange={handleFormChange('city')}
                fullWidth
                size="small"
                inputProps={{ maxLength: 100 }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Street / Address"
                value={form.address}
                onChange={handleFormChange('address')}
                fullWidth
                size="small"
                inputProps={{ maxLength: 200 }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Building"
                value={form.building}
                onChange={handleFormChange('building')}
                fullWidth
                size="small"
                inputProps={{ maxLength: 20 }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Apartment / Unit"
                value={form.apartment}
                onChange={handleFormChange('apartment')}
                fullWidth
                size="small"
                inputProps={{ maxLength: 20 }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Postal Code"
                value={form.postal_code}
                onChange={handleFormChange('postal_code')}
                fullWidth
                size="small"
                inputProps={{ maxLength: 20 }}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={form.is_default}
                    onChange={handleFormChange('is_default')}
                    sx={{ color: palette.primaryLight, '&.Mui-checked': { color: palette.primary } }}
                  />
                }
                label={
                  <Typography sx={{ fontFamily: fontBody, fontSize: 14, color: palette.primary }}>
                    Set as default address
                  </Typography>
                }
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            onClick={handleCloseDialog}
            disabled={saving}
            sx={{ fontFamily: fontMain, color: palette.primaryLight, textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAdd}
            disabled={saving}
            variant="contained"
            sx={{
              bgcolor: palette.primary,
              borderRadius: '10px',
              textTransform: 'none',
              fontFamily: fontMain,
              px: 3,
            }}
          >
            {saving ? 'Saving…' : 'Save Address'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnack((s) => ({ ...s, open: false }))}
          severity={snack.severity}
          sx={{ fontFamily: fontBody }}
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
