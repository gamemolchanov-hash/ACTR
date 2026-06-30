'use client';

import { useEffect } from 'react';
import { Box, Typography, Button, Card, CardContent, Grid } from '@mui/material';
import { ShoppingBag, Person, Lock, ExitToApp, LocationOn } from '@mui/icons-material';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { palette } from '@/lib/theme';
import { useAuth } from '@/lib/auth-context';

const fontMain = '"Futura PT", Helvetica, sans-serif';
const fontBody = '"Open Sans", Helvetica, sans-serif';

const menuItems = [
  {
    label: 'Мои заказы',
    description: 'История и статус заказов',
    href: '/account/orders',
    icon: ShoppingBag,
  },
  {
    label: 'Адреса доставки',
    description: 'Управление адресами для доставки',
    href: '/account/addresses',
    icon: LocationOn,
  },
  {
    label: 'Личные данные',
    description: 'Имя, телефон, email',
    href: '/account/settings',
    icon: Person,
  },
  {
    label: 'Сменить пароль',
    description: 'Обновить пароль для входа',
    href: '/account/settings#password',
    icon: Lock,
  },
];

export default function AccountPage() {
  const { customer, loading, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !customer) router.replace('/login');
  }, [loading, customer, router]);

  if (loading || !customer) return null;

  return (
    <Box sx={{ overflow: 'hidden' }}>
      <Box sx={{ maxWidth: 1300, mx: 'auto', px: { xs: 2.5, md: 2 }, mt: { xs: 2, md: 3 } }}>
        <Typography
          sx={{ fontFamily: fontBody, fontSize: 13, color: palette.primaryLight, mb: 0.5 }}
        >
          <Link href="/" style={{ color: palette.primaryLight, textDecoration: 'none' }}>
            Главная
          </Link>
          {' / Личный кабинет'}
        </Typography>

        <Typography
          variant="h1"
          sx={{ fontSize: { xs: 24, md: 40 }, fontWeight: 450, letterSpacing: { xs: 2, md: 0 } }}
        >
          ЛИЧНЫЙ КАБИНЕТ
        </Typography>

        <Typography
          sx={{ fontFamily: fontMain, fontSize: { xs: 16, md: 20 }, color: palette.primary, mt: 1 }}
        >
          Здравствуйте, {customer.name}!
        </Typography>
      </Box>

      <Box
        sx={{
          maxWidth: 1300,
          mx: 'auto',
          px: { xs: 2.5, md: 2 },
          mt: { xs: 3, md: 4 },
          mb: { xs: 4, md: 7 },
        }}
      >
        <Grid container spacing={3}>
          {menuItems.map(({ label, description, href, icon: Icon }) => (
            <Grid item xs={12} sm={6} md={4} key={label}>
              <Card
                component={Link}
                href={href}
                sx={{
                  textDecoration: 'none',
                  bgcolor: palette.bgLight,
                  borderRadius: '20px',
                  border: 'none',
                  boxShadow: 'none',
                  height: '100%',
                  transition: 'transform 0.15s',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 16px rgba(43,54,116,0.1)',
                  },
                }}
              >
                <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Icon sx={{ fontSize: 36, color: palette.primary }} />
                  <Typography
                    sx={{
                      fontFamily: fontMain,
                      fontSize: 20,
                      fontWeight: 500,
                      color: palette.primary,
                    }}
                  >
                    {label}
                  </Typography>
                  <Typography
                    sx={{ fontFamily: fontBody, fontSize: 14, color: palette.primaryLight }}
                  >
                    {description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Box sx={{ mt: 4 }}>
          <Button
            onClick={() => {
              signOut();
              router.push('/');
            }}
            startIcon={<ExitToApp />}
            variant="outlined"
            sx={{
              borderColor: palette.primaryLight,
              color: palette.primaryLight,
              borderRadius: '10px',
              fontFamily: fontMain,
              fontSize: 16,
              textTransform: 'none',
              px: 3,
              py: 1,
            }}
          >
            Выйти из аккаунта
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
