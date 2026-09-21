'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Checkbox,
  FormControlLabel,
  Divider,
  Select,
  MenuItem,
  CircularProgress,
  Breadcrumbs,
  Link as MuiLink,
  Drawer,
  IconButton,
} from '@mui/material';
import TuneIcon from '@mui/icons-material/Tune';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { fetchProducts, fetchCategories } from '@/lib/api';
import { ProductCard } from '@/components/ProductCard';
import { useCart } from '@/providers/CartProvider';
import { palette } from '@/lib/theme';

const ITEMS_PER_PAGE = 12;
const FILTERS_KEY = 'storefront_catalog_filters';

interface CatalogViewProps {
  categorySlug?: string;
}

export function CatalogView({ categorySlug }: CatalogViewProps) {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const restoredRef = useRef(false);

  // Default = popularity rank (`popular` → ARM adp.sort, seeded from .ru paid-order frequency).
  const sort = searchParams.get('sort') || 'popular';
  const search = searchParams.get('search') || searchParams.get('q') || undefined;
  const inStock = searchParams.get('inStock') || undefined;
  const inStockOnly = inStock === '1';

  // Restore filters from sessionStorage when URL has no params
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    if (searchParams.toString()) return; // URL already has params
    try {
      const saved = sessionStorage.getItem(FILTERS_KEY);
      if (!saved) return;
      const { slug, qs } = JSON.parse(saved) as { slug?: string; qs: string };
      if (slug !== categorySlug) return; // different category — don't restore
      if (!qs) return;
      const base = categorySlug ? `/catalog/${categorySlug}` : '/catalog';
      router.replace(`${base}?${qs}` as any);
    } catch {
      /* ignore */
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist current filters to sessionStorage
  useEffect(() => {
    try {
      const qs = searchParams.toString();
      sessionStorage.setItem(FILTERS_KEY, JSON.stringify({ slug: categorySlug, qs }));
    } catch {
      /* ignore */
    }
  }, [searchParams, categorySlug]);

  const { addItem, items: cartItems = [] } = useCart();
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  });

  // Автоподгрузка при прокрутке вместо пагинации (порт с ACRU 22.09): страницы копятся
  // в useInfiniteQuery, следующая — когда «страж» под сеткой входит в зону видимости.
  const {
    data: productsData,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['products', { category: categorySlug, sort, search, inStock }],
    queryFn: ({ pageParam }) =>
      fetchProducts({ page: pageParam, limit: ITEMS_PER_PAGE, category: categorySlug, sort, search, inStock }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.meta.page < lastPage.meta.totalPages ? lastPage.meta.page + 1 : undefined,
  });

  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasNextPage || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) loadMore();
      },
      { rootMargin: '600px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasNextPage, loadMore, productsData?.pages.length]);

  const categories = categoriesData?.data ?? [];
  const products = productsData?.pages.flatMap((p) => p.data) ?? [];
  const meta = productsData?.pages[0]?.meta;

  const updateParams = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
    // Keep page param but remove it if going to page 1
    if (updates.page === '1' || !updates.page) params.delete('page');
    const qs = params.toString();
    const base = categorySlug ? `/catalog/${categorySlug}` : '/catalog';
    router.push(qs ? (`${base}?${qs}` as any) : (base as any));
  };

  const navigateToCategory = (slug?: string) => {
    const params = new URLSearchParams();
    if (sort !== 'popular') params.set('sort', sort);
    if (inStockOnly) params.set('inStock', '1');
    const qs = params.toString();
    const base = slug ? `/catalog/${slug}` : '/catalog';
    router.push(qs ? (`${base}?${qs}` as any) : (base as any));
  };

  const currentCategory = categorySlug ? categories.find((c) => c.slug === categorySlug) : null;
  const pageTitle = currentCategory ? currentCategory.name : t('catalog.allProducts');

  return (
    <Box sx={{ maxWidth: 1300, mx: 'auto', px: 2, py: 3 }}>
      <Box sx={{ display: 'flex', gap: 4 }}>
        {/* Sidebar: hidden on narrow screens */}
        <Box
          sx={{
            width: 310,
            flexShrink: 0,
            bgcolor: palette.bgLight,
            borderRadius: '20px',
            p: 3,
            alignSelf: 'flex-start',
            position: 'sticky',
            top: 180,
            display: { xs: 'none', md: 'block' },
          }}
        >
          {/* Categories */}
          <Typography variant="h2" sx={{ mb: 2 }}>
            {t('catalog.categories')}
          </Typography>
          <Divider sx={{ borderColor: palette.primary, borderWidth: '0.5px', mb: 2 }} />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 2 }}>
            <MuiLink
              component={Link}
              href="/catalog"
              underline="none"
              sx={{
                fontSize: 18,
                color: palette.primary,
                fontWeight: !categorySlug ? 700 : 400,
                cursor: 'pointer',
              }}
            >
              {t('catalog.allProducts')}
            </MuiLink>
            {categories.map((cat) => (
              <MuiLink
                key={cat.id}
                component={Link}
                href={`/catalog/${cat.slug}`}
                underline="none"
                sx={{
                  fontSize: 18,
                  color: palette.primary,
                  fontWeight: categorySlug === cat.slug ? 700 : 400,
                  cursor: 'pointer',
                }}
              >
                {cat.name}
              </MuiLink>
            ))}
          </Box>

          <Divider sx={{ borderColor: palette.primary, opacity: 0.3, my: 2 }} />

          {/* Filters */}
          <Typography variant="h2" sx={{ mb: 2 }}>
            {t('catalog.filters')}
          </Typography>
          <FormControlLabel
            control={
              <Checkbox
                checked={inStockOnly}
                onChange={(e) =>
                  updateParams({ inStock: e.target.checked ? '1' : undefined, page: '1' })
                }
                sx={{
                  color: palette.primary,
                  '&.Mui-checked': { color: palette.primary },
                  borderRadius: '3px',
                }}
              />
            }
            label={
              <Typography sx={{ fontSize: 18, color: palette.primary }}>
                {t('catalog.inStock')}
              </Typography>
            }
          />
        </Box>

        {/* Right column: breadcrumbs + title + product grid */}
        <Box sx={{ flex: 1 }}>
          {/* Breadcrumbs */}
          <Breadcrumbs
            sx={{
              mb: '-4px',
              '& .MuiBreadcrumbs-separator': { color: palette.primaryLight },
              '& .MuiBreadcrumbs-ol': { marginBottom: 0 },
            }}
          >
            <MuiLink
              component={Link}
              href="/"
              underline="hover"
              sx={{
                fontFamily: '"Open Sans", sans-serif',
                fontSize: 13,
                color: palette.primaryLight,
              }}
            >
              {t('common.home')}
            </MuiLink>
            <MuiLink
              component={Link}
              href="/catalog"
              underline="hover"
              sx={{
                fontFamily: '"Open Sans", sans-serif',
                fontSize: 13,
                color: palette.primaryLight,
              }}
            >
              {t('nav.catalog')}
            </MuiLink>
            {currentCategory && (
              <Typography
                sx={{
                  fontFamily: '"Open Sans", sans-serif',
                  fontSize: 13,
                  color: palette.primary,
                }}
              >
                {currentCategory.name}
              </Typography>
            )}
          </Breadcrumbs>

          {/* Title (wide) / Filter chips (narrow) + Sort */}
          {/* Wide: title text */}
          <Box
            sx={{
              display: { xs: 'none', md: 'flex' },
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 3,
            }}
          >
            <Typography
              sx={{
                fontFamily: 'LiraFix, "Futura PT", "Futura PT Fallback", "Ubuntu", Arial, sans-serif',
                fontWeight: 450,
                fontSize: 30,
                lineHeight: '38px',
                textTransform: 'uppercase',
                color: palette.primary,
              }}
            >
              {pageTitle}
            </Typography>
            <Select
              value={sort}
              onChange={(e) => updateParams({ sort: e.target.value, page: '1' })}
              size="small"
              variant="outlined"
              sx={{
                minWidth: { xs: 140, md: 200 },
                borderRadius: '10px',
                fontSize: 16,
                color: palette.primary,
                '& .MuiOutlinedInput-notchedOutline': { borderColor: palette.primary },
              }}
            >
              <MenuItem value="popular">{t('catalog.sortByPopular')}</MenuItem>
              <MenuItem value="name">{t('catalog.sortByName')}</MenuItem>
              <MenuItem value="-name">{t('catalog.sortByNameDesc')}</MenuItem>
              <MenuItem value="price">{t('catalog.sortByPriceAsc')}</MenuItem>
              <MenuItem value="-price">{t('catalog.sortByPriceDesc')}</MenuItem>
              <MenuItem value="-date_created">{t('catalog.newArrivals')}</MenuItem>
            </Select>
          </Box>

          {/* Narrow: title + filter/sort buttons */}
          <Box sx={{ display: { xs: 'block', md: 'none' }, mb: 3 }}>
            <Typography
              sx={{
                fontFamily: 'LiraFix, "Futura PT", "Futura PT Fallback", "Ubuntu", Arial, sans-serif',
                fontWeight: 450,
                fontSize: 30,
                lineHeight: '38px',
                textTransform: 'uppercase',
                color: palette.primary,
                mb: 1.5,
              }}
            >
              {pageTitle}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'space-between' }}>
              {/* Filter button */}
              <Box
                component="button"
                onClick={() => setFilterDrawerOpen(true)}
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.5,
                  bgcolor: 'white',
                  border: `1px solid ${palette.primary}`,
                  borderRadius: '10px',
                  cursor: 'pointer',
                  px: 2,
                  py: 1,
                  color: palette.primary,
                  fontFamily: 'LiraFix, "Futura PT", "Futura PT Fallback", "Ubuntu", Arial, sans-serif',
                  fontSize: 16,
                  fontWeight: 450,
                }}
              >
                <TuneIcon sx={{ fontSize: 18 }} />
                {t('catalog.filter')}
              </Box>

              {/* Sort select */}
              <Select
                value={sort}
                onChange={(e) => updateParams({ sort: e.target.value, page: '1' })}
                size="small"
                variant="outlined"
                displayEmpty
                renderValue={() => t('catalog.sortBy')}
                sx={{
                  borderRadius: '10px',
                  fontSize: 16,
                  fontWeight: 450,
                  fontFamily: 'LiraFix, "Futura PT", "Futura PT Fallback", "Ubuntu", Arial, sans-serif',
                  color: palette.primary,
                  height: 40,
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: palette.primary },
                  '& .MuiSelect-icon': { color: palette.primary },
                }}
              >
                <MenuItem value="popular">{t('catalog.sortByPopular')}</MenuItem>
                <MenuItem value="name">{t('catalog.sortByName')}</MenuItem>
                <MenuItem value="-name">{t('catalog.sortByNameDesc')}</MenuItem>
                <MenuItem value="price">{t('catalog.sortByPriceAsc')}</MenuItem>
                <MenuItem value="-price">{t('catalog.sortByPriceDesc')}</MenuItem>
                <MenuItem value="-date_created">{t('catalog.newArrivals')}</MenuItem>
              </Select>
            </Box>

            {/* Filter Drawer */}
            <Drawer
              anchor="left"
              open={filterDrawerOpen}
              onClose={() => setFilterDrawerOpen(false)}
              PaperProps={{
                sx: { width: 310, p: 3, bgcolor: palette.bgLight },
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 2,
                }}
              >
                <Typography variant="h2">{t('catalog.categories')}</Typography>
                <IconButton onClick={() => setFilterDrawerOpen(false)}>
                  <CloseIcon sx={{ color: palette.primary }} />
                </IconButton>
              </Box>
              <Divider sx={{ borderColor: palette.primary, borderWidth: '0.5px', mb: 2 }} />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 2 }}>
                <MuiLink
                  component="button"
                  underline="none"
                  onClick={() => {
                    navigateToCategory(undefined);
                    setFilterDrawerOpen(false);
                  }}
                  sx={{
                    fontSize: 18,
                    color: palette.primary,
                    fontWeight: !categorySlug ? 700 : 400,
                    cursor: 'pointer',
                    textAlign: 'left',
                    background: 'none',
                    border: 'none',
                    p: 0,
                  }}
                >
                  {t('catalog.allProducts')}
                </MuiLink>
                {categories.map((cat) => (
                  <MuiLink
                    key={cat.id}
                    component="button"
                    underline="none"
                    onClick={() => {
                      navigateToCategory(cat.slug);
                      setFilterDrawerOpen(false);
                    }}
                    sx={{
                      fontSize: 18,
                      color: palette.primary,
                      fontWeight: categorySlug === cat.slug ? 700 : 400,
                      cursor: 'pointer',
                      textAlign: 'left',
                      background: 'none',
                      border: 'none',
                      p: 0,
                    }}
                  >
                    {cat.name}
                  </MuiLink>
                ))}
              </Box>

              <Divider sx={{ borderColor: palette.primary, opacity: 0.3, my: 2 }} />

              <Typography variant="h2" sx={{ mb: 2 }}>
                {t('catalog.filters')}
              </Typography>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={inStockOnly}
                    onChange={(e) =>
                      updateParams({ inStock: e.target.checked ? '1' : undefined, page: '1' })
                    }
                    sx={{
                      color: palette.primary,
                      '&.Mui-checked': { color: palette.primary },
                    }}
                  />
                }
                label={
                  <Typography sx={{ fontSize: 18, color: palette.primary }}>
                    {t('catalog.inStock')}
                  </Typography>
                }
              />
            </Drawer>
          </Box>
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress sx={{ color: palette.primary }} />
            </Box>
          ) : products.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography sx={{ fontSize: 20, color: palette.primaryLight }}>
                {t('catalog.noProducts')}
              </Typography>
            </Box>
          ) : (
            <>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
                  gap: { xs: 2, lg: 3 },
                  mb: 4,
                }}
              >
                {products.map((product, i) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    index={i}
                    onAddToCart={addItem}
                    inCartQuantity={cartItems.find((c) => c.productId === product.id)?.quantity ?? 0}
                  />
                ))}
              </Box>

              {hasNextPage && (
                <Box
                  ref={sentinelRef}
                  data-testid="sf-catalog-load-more"
                  sx={{ display: 'flex', justifyContent: 'center', py: 3, minHeight: 56 }}
                >
                  {isFetchingNextPage && <CircularProgress size={28} sx={{ color: palette.primary }} />}
                </Box>
              )}
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
}
