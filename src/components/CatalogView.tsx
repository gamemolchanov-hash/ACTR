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
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { fetchProducts, fetchCategories, fetchColorGroups } from '@/lib/api';
import { CategoryChips } from '@/components/CategoryChips';
import { ColorSwatchFilter } from '@/components/ColorSwatchFilter';
import { ProductCard } from '@/components/ProductCard';
import { useCustomerId } from '@/lib/auth-context';
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
  // Фильтр по цвету (паритет с .ru BS-10) — только внутри категории.
  const colorGroup = (categorySlug && searchParams.get('colorGroup')) || undefined;

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

  // Creator Club: участнику каталог отдаёт member-цены (запрос с JWT) — ключ
  // включает покупателя, чтобы гость и участник не делили кеш.
  const customerId = useCustomerId();
  // Автоподгрузка при прокрутке вместо пагинации (владелец 21.09.2026): страницы
  // копятся в useInfiniteQuery, следующая запрашивается, когда «страж» под сеткой
  // входит в зону видимости (IntersectionObserver с запасом ~600 px). `?page=` в URL
  // больше не используется — фильтры/сортировка сбрасывают список на первую страницу.
  const {
    data: productsData,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['products', { category: categorySlug, sort, search, inStock, colorGroup, customerId }],
    queryFn: ({ pageParam }) =>
      fetchProducts({
        page: pageParam,
        limit: ITEMS_PER_PAGE,
        category: categorySlug,
        sort,
        search,
        inStock,
        colorGroup,
      }),
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

  // Фасеты цвета текущей категории: пустой список — фильтр не рендерится.
  const { data: colorGroupsData } = useQuery({
    queryKey: ['color-groups', { category: categorySlug, inStock }],
    queryFn: () => fetchColorGroups({ category: categorySlug, inStock }),
    enabled: !!categorySlug,
  });
  const colorGroups = colorGroupsData?.data ?? [];

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
            // Липкая колонка не выше видимой области — длинный список категорий прокручивается внутри.
            maxHeight: 'calc(100vh - 196px)',
            overflowY: 'auto',
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
        {/* minWidth 0 — иначе ряд чипов с прокруткой растягивает колонку и страницу вширь */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {/* Breadcrumbs */}
          <Breadcrumbs
            sx={{
              // На телефоне крошек и заголовка нет (владелец 21.09): сразу чипы категорий.
              display: { xs: 'none', md: 'flex' },
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
                fontFamily: 'LiraFix, "Jost", "Jost Fallback", "Ubuntu", Arial, sans-serif',
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

          {/* Narrow: компактный заголовок + чипы категорий + свотчи цвета + счётчик/сортировка
              (мобильный каталог по образцу forza-brava.com, владелец 21.09.2026) */}
          <Box sx={{ display: { xs: 'block', md: 'none' }, mb: 2, mt: 0.5 }}>
            <CategoryChips
              categories={categories}
              activeSlug={categorySlug}
              allLabel={t('catalog.allShort')}
              onSelect={(slug) => navigateToCategory(slug)}
            />
            <ColorSwatchFilter
              groups={colorGroups}
              value={colorGroup}
              onChange={(key) => updateParams({ colorGroup: key, page: '1' })}
            />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2, flexWrap: 'wrap' }}>
              <Typography
                data-testid="sf-catalog-count"
                sx={{
                  fontFamily: '"Open Sans", Helvetica, sans-serif',
                  fontSize: 12,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: palette.primaryLight,
                  whiteSpace: 'nowrap',
                }}
              >
                {t('catalog.productsCount', { count: meta?.total ?? products.length })}
              </Typography>
              <Box sx={{ flex: 1 }} />
              <Box
                component="button"
                type="button"
                data-testid="sf-catalog-instock-chip"
                aria-pressed={inStockOnly}
                onClick={() => updateParams({ inStock: inStockOnly ? undefined : '1', page: '1' })}
                sx={{
                  height: 32,
                  px: 1.25,
                  borderRadius: '999px',
                  border: `1px solid ${inStockOnly ? palette.primary : 'rgba(51,74,159,0.3)'}`,
                  bgcolor: inStockOnly ? palette.primary : 'white',
                  color: inStockOnly ? 'white' : palette.primary,
                  fontFamily: 'LiraFix, "Jost", "Jost Fallback", "Ubuntu", Arial, sans-serif',
                  fontSize: 13,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {t('catalog.inStock')}
              </Box>
              <Select
                value={sort}
                onChange={(e) => updateParams({ sort: e.target.value, page: '1' })}
                size="small"
                variant="outlined"
                data-testid="sf-catalog-sort"
                sx={{
                  borderRadius: '999px',
                  fontSize: 13,
                  fontFamily: 'LiraFix, "Jost", "Jost Fallback", "Ubuntu", Arial, sans-serif',
                  color: palette.primary,
                  height: 32,
                  '& .MuiSelect-select': { py: 0, pl: 1.5 },
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(51,74,159,0.3)' },
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
          </Box>

          {/* Desktop: свотчи цвета над сеткой (владелец 22.09: чипы «Цвет» внизу липкого
              сайдбара на экранах 768 px не доскролливались — сайдбар выше видимой области). */}
          <Box sx={{ display: { xs: 'none', md: 'block' }, mb: 3 }}>
            <ColorSwatchFilter
              groups={colorGroups}
              value={colorGroup}
              onChange={(key) => updateParams({ colorGroup: key, page: '1' })}
            />
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
                  // Телефон 2 в ряд, планшет (от 600 px) 3 в ряд, как у forza-brava.com (21.09).
                  gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)' },
                  gap: { xs: 1.5, sm: 2, lg: 3 },
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

              {/* Страж автоподгрузки + индикатор: пока есть следующая страница, наблюдатель
                  подгружает её при приближении к концу списка. */}
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
