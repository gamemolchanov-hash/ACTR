/**
 * FBG-472 — the Creator Club entry must reach the header, and reach it the way
 * it reaches the footer.
 *
 * Two defects, one per file under test:
 *
 * 1. The header used to be the only piece of chrome behind a Suspense boundary
 *    (`useSearchParams()` needed one). Measured on the shipped code:
 *
 *      - `next build` → `.next/server/app/en.html` had NO `<header>` at all, only
 *        `<!--$!--><template data-dgst="BAILOUT_TO_CLIENT_SIDE_RENDERING">`: on a
 *        prerendered route the hook throws and React drops the whole boundary
 *        from the HTML, leaving the header to be rendered client-side;
 *      - `next dev` → `<!--$?--><template id="B:1">` in place of the header, its
 *        markup delivered at the end of the document and spliced in by React's
 *        `$RC`, i.e. hydrated in a separate later pass — so until that pass runs
 *        the header is inert server markup: publishing the programme does not
 *        render into it, while the footer (inline, no boundary) shows the entry
 *        straight away.
 *
 *    `renderChromeToStaticHtml` pins the prerender half of that, with
 *    `useSearchParams()` throwing exactly as Next makes it throw while
 *    prerendering. It fails on the pre-fix header (that throw escapes the whole
 *    chrome render) and passes once the header stops calling the hook. The
 *    remaining tests then hold the chrome to one hydration pass: the entry
 *    reaches header, drawer and footer off the same answer.
 *
 * 2. The programme is fetched, so it can land DURING hydration. Published into a
 *    hydration render it tears the markup: React reports "Hydration failed
 *    because the server rendered text didn't match the client" on the nav entry
 *    (`/contacts` where the client wants `/rewards`) — the error from the
 *    report. With the header out of the boundary the provider's answer now
 *    arrives after the chrome has hydrated, so the tear needs a consumer that
 *    hydrates later than the provider to show up at all — page-level
 *    `<Suspense>` boundaries still are that, so `hydrateWithDeferredSubtree`
 *    models one. That test fails on the pre-gate provider with the exact message
 *    above.
 *
 * `render()` alone can see neither: it mounts on the client, with no server
 * markup to disagree with and no prerender to bail out of.
 */
import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Suspense, lazy } from 'react';
import { renderToString } from 'react-dom/server';
import { hydrateRoot, type Root } from 'react-dom/client';

const fetchLoyaltyConfig = vi.hoisted(() => vi.fn());
vi.mock('@/lib/loyalty', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/loyalty')>()),
  fetchLoyaltyConfig,
}));

const pathname = vi.hoisted(() => ({ value: '/' }));
/** Set while a "prerender" is running, exactly like Next's static bailout. */
const prerendering = vi.hoisted(() => ({ value: false }));

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
  // Next throws BailoutToCSRError out of this hook while prerendering, which is
  // what emptied the header out of the built HTML. Any caller pays that price.
  useSearchParams: () => {
    if (prerendering.value) throw new Error('BAILOUT_TO_CLIENT_SIDE_RENDERING');
    return new URLSearchParams(window.location.search);
  },
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
import { Link } from '@/i18n/navigation';
import { LoyaltyProgramProvider, useLoyaltyProgram } from '@/providers/LoyaltyProgramProvider';
import { Header } from '../Header';
import { Footer } from '../Footer';

/** The locale layout's chrome, as it now sits under <body>: no boundary. */
const Chrome = () => (
  <div>
    <LoyaltyProgramProvider>
      <Header />
      <Footer />
    </LoyaltyProgramProvider>
  </div>
);

const macrotask = () => new Promise((resolve) => setTimeout(resolve, 10));
/** Let every pending render/effect flush before asserting on a NEGATIVE. */
const settle = async () => {
  for (let i = 0; i < 5; i++) await macrotask();
};
const rewardsIn = (scope: ParentNode | null) =>
  scope ? scope.querySelectorAll('a[href="/rewards"]').length : 0;

let root: Root | null = null;
let container: HTMLDivElement | null = null;
let recoverableErrors: string[] = [];

const headerEntries = () => rewardsIn(container?.querySelector('header') ?? null);
const footerEntries = () => rewardsIn(container?.querySelector('footer') ?? null);
const drawerEntries = () => rewardsIn(document.querySelector('.MuiDrawer-root'));

async function until(what: string, done: () => boolean, ticks = 120) {
  for (let i = 0; i < ticks; i++) {
    if (done()) return;
    await macrotask();
  }
  throw new Error(`timed out waiting for: ${what}`);
}

/** Render the chrome the way a prerendered route does (dynamic hooks bail out). */
function renderChromeToStaticHtml(): string {
  prerendering.value = true;
  try {
    return renderToString(<Chrome />);
  } finally {
    prerendering.value = false;
  }
}

/**
 * Server-render the chrome BEFORE `/config` answers (as the real server does —
 * the programme is client-fetched, so the HTML never carries it), then hydrate
 * that HTML. The mocked answer resolves while hydration is under way, which is
 * the sequence from the report.
 */
function hydrateChrome() {
  const html = renderToString(<Chrome />);
  container = document.createElement('div');
  container.innerHTML = html;
  document.body.appendChild(container);

  root = hydrateRoot(container, <Chrome />, {
    onRecoverableError: (error) => recoverableErrors.push(String((error as Error).message)),
  });

  return {
    html,
    // Re-rendering the persistent layout is what a client navigation does.
    navigate: () => root?.render(<Chrome />),
  };
}

function answers(program: string) {
  fetchLoyaltyConfig.mockResolvedValue({ program, tiers: [], walletCap: null });
}

/**
 * A programme consumer, minus the chrome: renders the same conditional nav entry
 * the header does — `/rewards` for a live programme, `/contacts` otherwise.
 */
const Consumer = () => {
  const entry =
    useLoyaltyProgram() === CASHBACK_WALLET_PROGRAM
      ? { href: '/rewards', label: 'rewards.navLabel' }
      : { href: '/contacts', label: 'nav.contacts' };
  return (
    <nav>
      <Link href={entry.href}>{entry.label}</Link>
    </nav>
  );
};

/**
 * Server HTML with the consumer inside a boundary, hydrated by a client tree
 * whose subtree only becomes hydratable when `releaseSubtree()` is called — the
 * shape of a `<Suspense>` boundary whose chunk lands after the page is already
 * running (page-level boundaries still do this: the catalogue pages have one).
 * The programme is published in between, i.e. INTO a hydration render, which is
 * where the reported "server rendered text didn't match the client" comes from.
 */
function hydrateWithDeferredSubtree() {
  let releaseSubtree: () => void = () => {};
  const Deferred = lazy(
    () =>
      new Promise<{ default: typeof Consumer }>((resolve) => {
        releaseSubtree = () => resolve({ default: Consumer });
      }),
  );
  const tree = (Inner: typeof Consumer | typeof Deferred) => (
    <div>
      <LoyaltyProgramProvider>
        <Suspense>
          <Inner />
        </Suspense>
      </LoyaltyProgramProvider>
    </div>
  );

  container = document.createElement('div');
  container.innerHTML = renderToString(tree(Consumer));
  document.body.appendChild(container);
  root = hydrateRoot(container, tree(Deferred), {
    onRecoverableError: (error) => recoverableErrors.push(String((error as Error).message)),
  });
  return { releaseSubtree: () => releaseSubtree() };
}

const START = Date.parse('2026-07-30T10:00:00Z');
let elapsed = 0;
/** Move past the provider's 30s revalidation throttle. */
function pastThrottle() {
  elapsed += 31_000;
  vi.setSystemTime(new Date(START + elapsed));
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  elapsed = 0;
  vi.setSystemTime(new Date(START));
  fetchLoyaltyConfig.mockReset();
  pathname.value = '/';
  prerendering.value = false;
  recoverableErrors = [];
  window.history.replaceState(null, '', '/');
});

afterEach(() => {
  root?.unmount();
  container?.remove();
  root = null;
  container = null;
  vi.useRealTimers();
});

describe('Creator Club entry — header renders and hydrates with the chrome (FBG-472)', () => {
  it('renders the whole header into a prerender, where dynamic hooks bail out', () => {
    answers(CASHBACK_WALLET_PROGRAM);
    const html = renderChromeToStaticHtml();

    // Pre-fix this threw BAILOUT_TO_CLIENT_SIDE_RENDERING out of the header and
    // the built /en.html shipped without a <header> at all.
    expect(html).toContain('<header');
    expect(html).toContain('<footer');
    // Fail-closed is unchanged: the programme is never known server-side.
    expect(html).not.toContain('/rewards');
  });

  it('publishes the entry to header, drawer and footer without tearing hydration', async () => {
    answers(CASHBACK_WALLET_PROGRAM);
    const { html } = hydrateChrome();
    expect(html).not.toContain('/rewards');

    await until('the entry to reach the header', () => headerEntries() > 0);
    // Both surfaces flip on the same answer — the footer is not ahead any more,
    // which is the whole point of the header leaving the boundary. (The gate's
    // own regression is the deferred-subtree test below; in this shape the
    // answer lands after the chrome has hydrated, so nothing can tear.)
    expect(footerEntries()).toBeGreaterThan(0);
    expect(recoverableErrors).toEqual([]);

    // The mobile drawer maps the same NAV_ITEMS, so it follows the desktop bar.
    container?.querySelector<HTMLElement>('button.MuiIconButton-root')?.click();
    await until('the drawer to open with the entry', () => drawerEntries() > 0);
  });

  it('keeps the entry through three client navigations in a row', async () => {
    answers(CASHBACK_WALLET_PROGRAM);
    const { navigate } = hydrateChrome();
    await until('the entry to reach the header', () => headerEntries() > 0);

    for (const next of ['/catalog', '/contacts', '/']) {
      const readsBefore = fetchLoyaltyConfig.mock.calls.length;
      pathname.value = next;
      pastThrottle();
      navigate();
      await until(
        `the navigation to ${next} to re-read /config`,
        () => fetchLoyaltyConfig.mock.calls.length > readsBefore,
      );
      expect(headerEntries()).toBeGreaterThan(0);
      expect(footerEntries()).toBeGreaterThan(0);
    }
    expect(recoverableErrors).toEqual([]);
  });

  it('prefills the search box from the URL without needing useSearchParams', async () => {
    answers(CASHBACK_WALLET_PROGRAM);
    window.history.replaceState(null, '', '/catalog?search=gel%20polish');
    hydrateChrome();

    await until(
      'the search box to prefill',
      () =>
        !!Array.from(container?.querySelectorAll('input') ?? []).some(
          (input) => input.value === 'gel polish',
        ),
    );
    // The prefill happens after mount, so it can never disagree with the HTML.
    expect(recoverableErrors).toEqual([]);
  });

  it('does not tear a consumer that hydrates after the programme is published', async () => {
    answers(CASHBACK_WALLET_PROGRAM);
    const { releaseSubtree } = hydrateWithDeferredSubtree();

    // The programme lands while that subtree is still server markup...
    await until('the programme to be published', () => fetchLoyaltyConfig.mock.calls.length > 0);
    await settle();
    expect(rewardsIn(container)).toBe(0);

    // ...and its hydration pass runs afterwards. Without the gate in
    // useLoyaltyProgram() React reports "Hydration failed because the server
    // rendered text didn't match the client" right here, on that nav entry.
    releaseSubtree();
    await until('the deferred subtree to show the entry', () => rewardsIn(container) > 0);
    expect(recoverableErrors).toEqual([]);
  });

  it('leaves header and footer link-free for a dormant programme (FBG-469)', async () => {
    answers('points_discount');
    hydrateChrome();
    await until('the dormant answer', () => fetchLoyaltyConfig.mock.calls.length > 0);
    await settle();

    expect(headerEntries()).toBe(0);
    expect(footerEntries()).toBe(0);
    expect(recoverableErrors).toEqual([]);
  });

  it('leaves header and footer link-free when /config is unreachable', async () => {
    fetchLoyaltyConfig.mockRejectedValue(new Error('BFF down'));
    hydrateChrome();
    await until('the failed read', () => fetchLoyaltyConfig.mock.calls.length > 0);
    await settle();

    expect(headerEntries()).toBe(0);
    expect(footerEntries()).toBe(0);
    expect(recoverableErrors).toEqual([]);
  });
});
