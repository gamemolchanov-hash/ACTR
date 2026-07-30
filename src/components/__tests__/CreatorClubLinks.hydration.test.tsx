/**
 * FBG-472 — the Creator Club entry and the header's Suspense boundary.
 *
 * The locale layout renders `<Suspense><Header/></Suspense>` (the header needs a
 * boundary for `useSearchParams`) but the `<Footer/>` bare, and the programme
 * they both gate on is fetched, so it is never in the server HTML — it is
 * published by `LoyaltyProgramProvider` about a second into the page's life.
 *
 * What `next dev` actually serves for that layout, measured on /en:
 *
 *     <!--$?--><template id="B:0"></template><!--/$-->     <- header boundary
 *     ...<footer …>…</footer>…                             <- inline, no boundary
 *     <div hidden id="S:0"><header class="…MuiAppBar…">…    <- streamed later
 *
 * The header is a *pending* streamed boundary: its markup is not where the
 * header goes, it arrives at the end of the document and React splices it in.
 * So the header's subtree is dehydrated for as long as that takes and hydrates
 * in its own later pass, while the footer hydrates with the provider. That is
 * the shape these tests reproduce — the boundary's content withheld until the
 * test releases it — against the REAL header/footer, because `render()` cannot
 * see any of it: it mounts on the client, with no server HTML to disagree with.
 *
 * Two consequences, both pinned below:
 *
 *  1. While the boundary is dehydrated the header is inert markup. React cannot
 *     render into a subtree it has not hydrated, so the entry the footer already
 *     shows cannot reach the header, and no client navigation, tab refocus or
 *     revalidation changes that. This is a property of the boundary, not of the
 *     gate — it holds before and after the fix.
 *  2. When the boundary does hydrate it hydrates against markup written before
 *     the answer arrived. Ungated, the header renders an entry the server never
 *     wrote — "server rendered text didn't match the client" on the nav item —
 *     and React throws the boundary away and rebuilds it. Measured against the
 *     pre-fix provider, that rebuild RESTORES the entry (test 2 asserts the
 *     post-`onRecoverableError` state, and it holds with and without the fix),
 *     so the tear does not leave the header permanently without the entry. The
 *     tear itself is the defect, and the hydration gate is what removes it:
 *     test 3 is the one that fails without the fix.
 */
import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Suspense, lazy, type ComponentType } from 'react';
import { renderToString } from 'react-dom/server';
import { hydrateRoot, type Root } from 'react-dom/client';

const fetchLoyaltyConfig = vi.hoisted(() => vi.fn());
vi.mock('@/lib/loyalty', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/loyalty')>()),
  fetchLoyaltyConfig,
}));

const pathname = vi.hoisted(() => ({ value: '/' }));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'en',
}));
vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, ...props }: { children?: ReactNode; [k: string]: unknown }) => (
    <a {...props}>{children}</a>
  ),
  usePathname: () => pathname.value,
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));
vi.mock('@/providers/CartProvider', () => ({ useCart: () => ({ totalQuantity: 0 }) }));
vi.mock('@/providers/CookieConsentProvider', () => ({
  useConsent: () => ({ openPreferences: vi.fn() }),
}));
vi.mock('@/providers/CurrencyProvider', () => ({
  useCurrency: () => 'TRY',
  useFormatLocale: () => 'tr-TR',
}));
vi.mock('@/lib/auth-context', () => ({ useAuth: () => ({ customer: null, signOut: vi.fn() }) }));
vi.mock('@/lib/api', () => ({ fetchProducts: vi.fn().mockResolvedValue({ data: [] }) }));

import { CASHBACK_WALLET_PROGRAM } from '@/lib/loyalty';
import { LoyaltyProgramProvider } from '@/providers/LoyaltyProgramProvider';
import { Header } from '../Header';
import { Footer } from '../Footer';

/** The locale layout's chrome: header behind a boundary, footer without one. */
const Chrome = ({ header }: { header: ComponentType }) => {
  const HeaderSlot = header;
  return (
    <LoyaltyProgramProvider>
      <Suspense>
        <HeaderSlot />
      </Suspense>
      <Footer />
    </LoyaltyProgramProvider>
  );
};

const macrotask = () => new Promise((resolve) => setTimeout(resolve, 0));
const rewardsIn = (scope: ParentNode | null) =>
  scope ? scope.querySelectorAll('a[href="/rewards"]').length : 0;

let root: Root | null = null;
let container: HTMLDivElement | null = null;
let recoverableErrors: string[] = [];

const headerEntries = () => rewardsIn(container?.querySelector('header') ?? null);
const footerEntries = () => rewardsIn(container?.querySelector('footer') ?? null);
const drawerEntries = () => rewardsIn(document.querySelector('.MuiDrawer-root'));

/** Let React work through its queue until `done`, rather than for a fixed time. */
async function until(what: string, done: () => boolean, ticks = 60) {
  for (let i = 0; i < ticks; i++) {
    if (done()) return;
    await macrotask();
  }
  throw new Error(`timed out waiting for: ${what}`);
}

const START = Date.parse('2026-07-30T10:00:00Z');
/** Move past the provider's 30s revalidation throttle. */
let elapsed = 0;
function pastThrottle() {
  elapsed += 31_000;
  vi.setSystemTime(new Date(START + elapsed));
}

/**
 * Server-render the chrome, then hydrate it with the header still behind a chunk
 * that has not arrived — so the boundary is provably dehydrated while `/config`
 * is answered, which is the race itself.
 */
function hydrateChromeWithPendingHeader() {
  let landHeaderChunk: () => void = () => {};
  const chunk = new Promise<void>((resolve) => {
    landHeaderChunk = resolve;
  });
  const LazyHeader = lazy(() => chunk.then(() => ({ default: Header })));

  const html = renderToString(<Chrome header={Header} />);
  container = document.createElement('div');
  container.innerHTML = html;
  document.body.appendChild(container);

  root = hydrateRoot(container, <Chrome header={LazyHeader} />, {
    onRecoverableError: (error) => recoverableErrors.push(String((error as Error).message)),
  });
  // Re-rendering the layout is what a client navigation does.
  return { html, landHeaderChunk, navigate: () => root?.render(<Chrome header={LazyHeader} />) };
}

function answers(program: string) {
  fetchLoyaltyConfig.mockResolvedValue({ program, tiers: [], walletCap: null });
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  elapsed = 0;
  vi.setSystemTime(new Date(START));
  fetchLoyaltyConfig.mockReset();
  pathname.value = '/';
  recoverableErrors = [];
});

afterEach(() => {
  root?.unmount();
  container?.remove();
  root = null;
  container = null;
  vi.useRealTimers();
});

describe('Creator Club entry — /config resolving mid-hydration (FBG-472)', () => {
  it('cannot reach the header while its boundary is dehydrated, by any route', async () => {
    answers(CASHBACK_WALLET_PROGRAM);
    const { html, landHeaderChunk, navigate } = hydrateChromeWithPendingHeader();
    // The programme is never known server-side — the HTML is the no-link variant.
    expect(html).not.toContain('/rewards');

    // The footer, hydrated with the provider, picks the entry up at once.
    await until('the footer to show the entry', () => footerEntries() > 0);
    expect(headerEntries()).toBe(0);

    // A client navigation re-renders the layout and re-reads /config...
    pathname.value = '/catalog';
    pastThrottle();
    navigate();
    await until('the navigation to be re-read', () => fetchLoyaltyConfig.mock.calls.length > 1);
    expect(headerEntries()).toBe(0);

    // ...and so does coming back to the tab. Neither can render into a subtree
    // React has not hydrated: this is the reported "stuck header" state, and it
    // lasts exactly as long as the header's chunk does.
    pastThrottle();
    window.dispatchEvent(new Event('focus'));
    await until('the refocus to be re-read', () => fetchLoyaltyConfig.mock.calls.length > 2);
    expect(headerEntries()).toBe(0);
    expect(footerEntries()).toBeGreaterThan(0);

    // Only hydrating the boundary can move it.
    landHeaderChunk();
    await until('the header entry to appear', () => headerEntries() > 0);
  });

  it('keeps the entry once the boundary has hydrated, rebuilt or not', async () => {
    answers(CASHBACK_WALLET_PROGRAM);
    const { landHeaderChunk, navigate } = hydrateChromeWithPendingHeader();

    await until('the footer to show the entry', () => footerEntries() > 0);
    landHeaderChunk();
    await until('the header entry to appear', () => headerEntries() > 0);

    // The state the report called permanent, asserted directly: once the header
    // has hydrated — without the gate that means after React reported the
    // mismatch and regenerated the boundary — the entry IS there. So the tear
    // does not strand the header without it; this assertion holds both with and
    // without the fix, which is why the tear is treated as the defect and not as
    // a cause of a permanently entry-less header.
    expect(headerEntries()).toBeGreaterThan(0);

    // And it survives client navigations, whose revalidations write the same
    // programme string back (an identical state React does not re-render for).
    for (const next of ['/catalog', '/contacts', '/']) {
      pathname.value = next;
      pastThrottle();
      navigate();
      for (let i = 0; i < 5; i++) await macrotask();
      expect(headerEntries()).toBeGreaterThan(0);
    }
  });

  it('hydrates the header without tearing when /config answered first', async () => {
    answers(CASHBACK_WALLET_PROGRAM);
    const { landHeaderChunk } = hydrateChromeWithPendingHeader();

    // The answer is published while the header is still server HTML...
    await until('the footer to show the entry', () => footerEntries() > 0);
    // ...and only then does the boundary hydrate, against older markup.
    landHeaderChunk();
    await until('the header entry to appear', () => headerEntries() > 0);

    // Without the hydration gate React reports "server rendered text didn't
    // match the client" here and rebuilds the whole header.
    expect(recoverableErrors).toEqual([]);

    // The mobile drawer maps the same NAV_ITEMS, so it follows the desktop bar.
    container?.querySelector<HTMLElement>('button.MuiIconButton-root')?.click();
    await until('the drawer to open with the entry', () => drawerEntries() > 0);
  });

  it('leaves header and footer link-free for a dormant programme (FBG-469)', async () => {
    answers('points_discount');
    const { landHeaderChunk } = hydrateChromeWithPendingHeader();

    await until('the dormant answer', () => fetchLoyaltyConfig.mock.calls.length > 0);
    landHeaderChunk();
    await until('the header to hydrate', () => !!container?.querySelector('header nav, header a'));
    for (let i = 0; i < 5; i++) await macrotask();

    expect(recoverableErrors).toEqual([]);
    expect(headerEntries()).toBe(0);
    expect(footerEntries()).toBe(0);
  });

  it('leaves header and footer link-free when /config is unreachable', async () => {
    fetchLoyaltyConfig.mockRejectedValue(new Error('BFF down'));
    const { landHeaderChunk } = hydrateChromeWithPendingHeader();

    await until('the failed read', () => fetchLoyaltyConfig.mock.calls.length > 0);
    landHeaderChunk();
    await until('the header to hydrate', () => !!container?.querySelector('header nav, header a'));
    for (let i = 0; i < 5; i++) await macrotask();

    expect(recoverableErrors).toEqual([]);
    expect(headerEntries()).toBe(0);
    expect(footerEntries()).toBe(0);
  });
});
