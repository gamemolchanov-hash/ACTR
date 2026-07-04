/**
 * FBG-228 — UI image delivery budget.
 *
 * Lighthouse mobile /tr/catalog flagged four oversized chrome assets (est. 62 KiB):
 * the trending-topic flame (512² shown at 17px), both logos (served far above
 * their @2x display size) and the 207 KB payment sprite that shipped ~270 brand
 * icons to render just Visa + Mastercard.
 *
 * This locks in the optimised weights/dimensions so a future re-export can't
 * silently reintroduce the bloat, and pins the sprite contract the Footer's
 * pixel-offset backgrounds depend on (1276×320 canvas + the two brand fills).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const PUBLIC = resolve(__dirname, '../../../public');

/** Read a PNG's intrinsic size straight from its IHDR chunk. */
function pngSize(buf: Buffer) {
  // 8-byte signature, then IHDR: length(4) + "IHDR"(4) + width(4) + height(4).
  expect(buf.subarray(12, 16).toString('ascii')).toBe('IHDR');
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

describe('FBG-228 raster budgets', () => {
  // [file, maxBytes, maxW, maxH] — ceilings sit above the optimised files but
  // below the originals (44 KB / 512², 14.7 KB / 720², 10.4 KB / 480²).
  const cases: [string, number, number, number][] = [
    ['icons/trending-topic.png', 4_000, 64, 64],
    ['logo.png', 6_000, 512, 130],
    ['icons/logo-white.png', 6_000, 440, 120],
  ];

  it.each(cases)('%s stays within the weight + size budget', (rel, maxBytes, maxW, maxH) => {
    const buf = readFileSync(resolve(PUBLIC, rel));
    expect(buf.length).toBeLessThanOrEqual(maxBytes);
    const { width, height } = pngSize(buf);
    expect(width).toBeLessThanOrEqual(maxW);
    expect(height).toBeLessThanOrEqual(maxH);
  });
});

describe('FBG-228 payment sprite', () => {
  const svg = readFileSync(resolve(PUBLIC, 'icons/payment-sprite.svg'), 'utf8');

  it('collapses from 207 KB to a few KB', () => {
    expect(Buffer.byteLength(svg)).toBeLessThanOrEqual(8_000);
  });

  it('keeps the 1276×320 canvas the Footer positions against', () => {
    expect(svg).toContain('width="1276"');
    expect(svg).toContain('height="320"');
    expect(svg).toContain('viewBox="0 0 1276 320"');
  });

  it('retains only the Visa + Mastercard marks the Footer renders', () => {
    // svgo lower-cases hex; these are the Visa card body and Mastercard red disc.
    const lc = svg.toLowerCase();
    expect(lc).toContain('#1470b0');
    expect(lc).toContain('#e70025');
    // Every other brand's paths were dropped — a handful remain, not ~270.
    const paths = svg.match(/<path\b/g) ?? [];
    expect(paths.length).toBeGreaterThan(0);
    expect(paths.length).toBeLessThanOrEqual(8);
  });
});
