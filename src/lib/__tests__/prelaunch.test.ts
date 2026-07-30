/**
 * NEXT_PUBLIC_PRELAUNCH → PRELAUNCH parsing (FBG-416 follow-up, 2026-07-30).
 *
 * The gate must FAIL CLOSED: any value except the explicit opt-outs
 * ('false' / '0') keeps the store in pre-launch mode, including unset and
 * garbage. The module reads env at import time, so each case re-imports it
 * with a fresh module registry.
 */
import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';

const KEY = 'NEXT_PUBLIC_PRELAUNCH';
const saved = process.env[KEY];

async function loadPrelaunch(value: string | undefined): Promise<boolean> {
  if (value === undefined) delete process.env[KEY];
  else process.env[KEY] = value;
  return (await import('@/lib/prelaunch')).PRELAUNCH;
}

describe('PRELAUNCH env toggle', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterAll(() => {
    if (saved === undefined) delete process.env[KEY];
    else process.env[KEY] = saved;
  });

  it('unset → true (safe default: store closed for orders)', async () => {
    expect(await loadPrelaunch(undefined)).toBe(true);
  });

  it("'false' → false (store open)", async () => {
    expect(await loadPrelaunch('false')).toBe(false);
  });

  it("'0' → false (store open)", async () => {
    expect(await loadPrelaunch('0')).toBe(false);
  });

  it("'true' and garbage → true (fail closed)", async () => {
    expect(await loadPrelaunch('true')).toBe(true);
    vi.resetModules();
    expect(await loadPrelaunch('yes please')).toBe(true);
  });
});
