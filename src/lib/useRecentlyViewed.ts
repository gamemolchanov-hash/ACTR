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

/**
 * Пути картинок ARM — `<uuid товара>/<hash>.<ext>` в бакете витрины. Витрина OMS
 * (american-creator.ru до 06.09.2026) хранила под тем же ключом Bitrix-пути `iblock/...`
 * и цену строкой: таких файлов у ARM нет (404 «Image not found»), а строка цены
 * рендерится с копейками. Такие записи — мусор прошлой витрины, не история просмотров.
 */
export function isArmRecentlyViewed(value: unknown): value is RecentlyViewedProduct {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  if (typeof v.id !== 'string' || typeof v.name !== 'string') return false;
  if (typeof v.price !== 'number' || !Number.isFinite(v.price)) return false;
  const paths = [
    ...(typeof v.image === 'string' ? [v.image] : []),
    ...(Array.isArray(v.images) ? v.images : []),
  ];
  return paths.every((fp) => typeof fp === 'string' && !fp.startsWith('iblock/'));
}

export function sanitizeStoredItems(parsed: unknown): RecentlyViewedProduct[] {
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(isArmRecentlyViewed).slice(0, MAX_ITEMS);
}

export function useRecentlyViewed(excludeId?: string) {
  const [items, setItems] = useState<RecentlyViewedProduct[]>([]);
  const skipPersist = useRef(true);

  // Hydrate from localStorage. Записи чужого формата (старая витрина OMS на этом же
  // домене писала тот же ключ) отбрасываются и тут же вычищаются из хранилища.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return;
      const parsed: unknown = JSON.parse(stored);
      const valid = sanitizeStoredItems(parsed);
      if (!Array.isArray(parsed) || valid.length !== parsed.length) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(valid));
      }
      if (valid.length) setItems(valid);
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
