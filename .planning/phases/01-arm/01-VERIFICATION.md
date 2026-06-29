---
phase: 01-arm
verified: 2026-06-29T19:30:00Z
status: passed
score: 6/6 must-haves verified
---

# Phase 1: Каталог на ARM Verification Report

**Phase Goal:** Витрина ходит в ARM API и рендерит каталог/категории/карточку товара из ARM (demo-сид).
**Verified:** 2026-06-29T19:30:00Z
**Status:** passed

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Запросы каталога уходят в /public/arm/storefront/* | ✓ VERIFIED | route-handler форвардит на ARM_BASE; проба `/api/storefront/config` 200 ARM |
| 2 | X-Storefront-Key инъектится server-side, нет в бандле | ✓ VERIFIED | `grep <key> .next/static` пусто; ключ из не-NEXT_PUBLIC env только в route.ts/server-api.ts |
| 3 | Листинг каталога рендерит товары из ARM | ✓ VERIFIED | `/api/storefront/products` → 8 товаров; адаптированы в Product; tsc rc=0; компоненты не менялись |
| 4 | Карточка товара рендерится из ARM | ✓ VERIFIED | `/api/storefront/products/<dp.id>` → 200 detail |
| 5 | Категории грузятся из ARM | ✓ VERIFIED | `/api/storefront/categories` → 200 [Styling, Care, Shaving] |
| 6 | Картинки грузятся из ARM | ✓ VERIFIED | `/api/storefront/images/demo-tenant/<fp>?w=400` → 200 image/webp 10.8KB |

**Score:** 6/6 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/app/api/storefront/[...path]/route.ts` | ARM-прокси + server-side key | ✓ EXISTS + SUBSTANTIVE | GET/POST/PUT/PATCH/DELETE; инъекция X-Tenant-ID + X-Storefront-Key |
| `src/lib/arm-adapter.ts` | armToProduct/armToCategory | ✓ EXISTS + SUBSTANTIVE | маппит dp.id, product.*, images, category |
| `src/lib/api.ts` | fetchers на ARM | ✓ WIRED | fetchProducts/Product/Categories мапят через адаптер |

**Artifacts:** 3/3 verified

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| api.ts fetchProducts | /api/storefront/products | axios → route-handler → ARM | ✓ WIRED | проба 200, 8 товаров |
| route.ts | /public/arm/storefront | fetch + X-Storefront-Key | ✓ WIRED | config/products/categories/images 200 |
| image-url.ts | ARM /images/:tenantId | previewUrl(?w=) | ✓ WIRED | image/webp 200 |

**Wiring:** 3/3 connections verified

## Requirements Coverage

| Requirement | Status | Blocking Issue |
|-------------|--------|----------------|
| CAT-01: ARM API + server-side key | ✓ SATISFIED | - |
| CAT-02: листинг из ARM | ✓ SATISFIED | - |
| CAT-03: карточка из ARM | ✓ SATISFIED | - |
| CAT-04: категории из ARM | ✓ SATISFIED | - |
| CAT-05: картинки из ARM | ✓ SATISFIED | - |

**Coverage:** 5/5 requirements satisfied

## Anti-Patterns Found

None — `tsc --noEmit` rc=0, заглушек нет, OMS-rewrite удалён.

## Human Verification Required

### 1. Визуальный спот-чек каталога в браузере
**Test:** Открыть `http://localhost:3003/catalog`, убедиться, что карточки рендерятся и console чистый.
**Expected:** Сетка товаров «Forza Brava» (demo), картинки, без ошибок в консоли.
**Why human:** Закрытие фазы выполнено по решению владельца («закрывай») без in-browser прогона. Данные/картинки/типы проверены на уровне прокси и tsc; пиксельный рендер — спот-чек перед go-live. Не блокер.

## Gaps Summary

**No gaps found.** Цель фазы достигнута на уровне данных и типов. Рекомендуется быстрый визуальный спот-чек `/catalog` при удобном случае (не блокирует Phase 2).

## Verification Metadata

**Verification approach:** Goal-backward (must_haves из 01-01-PLAN.md)
**Automated checks:** прокси-пробы (config/products/detail/categories/image) + tsc + key-leak grep — все прошли
**Human checks required:** 1 (визуальный спот-чек, deferred by owner)

---
*Verified: 2026-06-29*
*Verifier: Claude (inline, manual GSD)*
