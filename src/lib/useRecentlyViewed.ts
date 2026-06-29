'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Product } from './api';

const STORAGE_KEY = 'storefront_recently_viewed';
const MAX_ITEMS = 10;

export interface RecentlyViewedProduct {
  id: string;
  slug: string | null;
  categorySlug: string | null;
  name: string;
  price: number;
  bp_available: number | null;
  image: string | null;
  images: string[];
}

export function useRecentlyViewed(excludeId?: string) {
  const [items, setItems] = useState<RecentlyViewedProduct[]>([]);
  const skipPersist = useRef(true);

  // Hydrate from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setItems(JSON.parse(stored));
    } catch {
      /* ignore */
    }
  }, []);

  // Persist after changes (skip initial empty render)
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

  const addViewed = useCallback((product: Product) => {
    const primaryImage = product.images?.sort((a, b) => a.sort - b.sort)[0] ?? null;
    const sortedImages = product.images ? [...product.images].sort((a, b) => a.sort - b.sort) : [];
    const entry: RecentlyViewedProduct = {
      id: product.id,
      slug: product.slug,
      categorySlug: product.category?.slug ?? null,
      name: product.name,
      price: product.price,
      bp_available: product.bp_available,
      image: primaryImage?.file_path ?? null,
      images: sortedImages.map((i) => i.file_path),
    };

    setItems((prev) => {
      const filtered = prev.filter((p) => p.id !== product.id);
      return [entry, ...filtered].slice(0, MAX_ITEMS);
    });
  }, []);

  const filtered = excludeId ? items.filter((p) => p.id !== excludeId) : items;

  return { items: filtered, addViewed };
}
