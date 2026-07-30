/**
 * FBG-472 — the Creator Club entry and the header's streamed Suspense boundary.
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
 * header goes, it arrives at the end of the document and React's own `$RC`
 * runtime splices it in. These tests reproduce that mechanically rather than
 * approximating it — the shell comes from `renderToReadableStream` with the
 * header suspended server-side, so the DOM really does carry `<!--$?-->`; the
 * client hydrates with the ordinary `Header` (its code is loaded, as in the
 * browser); and the boundary is completed by appending React's streamed segment
 * and executing React's own `$RC` script. `document.readyState` is 'loading'
 * while the stream is open, because that is what tells React a pending boundary
 * is still coming rather than lost (`isSuspenseInstanceFallback`).
 *
 * Measured that way, against the pre-fix provider:
 *
 *  - before the segment lands: footer has the entry, header does not, no errors.
 *    A dehydrated subtree cannot be rendered into, and a revalidation returning
 *    the same programme string re-renders nothing, so the header simply stays as
 *    the server left it — the reported "footer fine, header without the entry".
 *    It is not a trap, though: an update that does reach the boundary makes
 *    React abandon the streamed markup and render the header on the client, entry
 *    included, which test 1 also pins.
 *  - when the segment lands, React hydrates it against markup written before
 *    `/config` answered and reports "Hydration failed because the server
 *    rendered text didn't match the client" — the error from the report — then
 *    rebuilds the boundary and the entry IS restored. Test 2 replays the
 *    reported sequence end to end on top of that: answer first, boundary
 *    completes (tearing, on the pre-fix provider), then three client navigations
 *    that each re-render the layout and re-read `/config`. The entry is present
 *    after every one, with the pre-fix provider too — so "gone for good after
 *    the mismatch and ≥3 navigations" does not reproduce, and the tear is not
 *    what strands the header. The tear is itself the defect.
 *
 * The hydration gate removes it: test 3 is the one that fails without the fix.
 * `render()` can see none of this — it mounts on the client, with no server
 * markup to disagree with and no boundary to complete.
 */
import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Suspense, use, type ComponentType } from 'react';
import { renderToReadableStream } from 'react-dom/server.browser';
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

/** The locale layout's chrome, under a host element as it sits under <body>. */
const Chrome = ({ header }: { header: ComponentType }) => {
  const HeaderSlot = header;
  return (
    <div>
      <LoyaltyProgramProvider>
        <Suspense>
          <HeaderSlot />
        </Suspense>
        <Footer />
      </LoyaltyProgramProvider>
    </div>
  );
};

const macrotask = () => new Promise((resolve) => setTimeout(resolve, 0));
const rewardsIn = (scope: ParentNode | null) =>
  scope ? scope.querySelectorAll('a[href="/rewards"]').length : 0;

let root: Root | null = null;
let container: HTMLDivElement | null = null;
let streamed: HTMLElement[] = [];
let recoverableErrors: string[] = [];

const headerEntries = () => rewardsIn(container?.querySelector('header') ?? null);
const footerEntries = () => rewardsIn(container?.querySelector('footer') ?? null);
const drawerEntries = () => rewardsIn(document.querySelector('.MuiDrawer-root'));

async function until(what: string, done: () => boolean, ticks = 120) {
  for (let i = 0; i < ticks; i++) {
    if (done()) return;
    // Real time, not just a macrotask: React reveals a completed boundary on a
    // timer (`$RV`), so a busy microtask loop would never see it.
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`timed out waiting for: ${what}`);
}

/** React's streamed-boundary runtime keeps state on the window (`$RC`/`$RB`). */
function resetStreamingRuntime() {
  for (const key of ['$RC', '$RB', '$RV', '$RT', '$RM', '$RX']) {
    Reflect.deleteProperty(globalThis, key);
  }
}

function setReadyState(value: 'loading' | 'complete') {
  Object.defineProperty(document, 'readyState', { get: () => value, configurable: true });
}

const START = Date.parse('2026-07-30T10:00:00Z');
let elapsed = 0;
/** Move past the provider's 30s revalidation throttle. */
function pastThrottle() {
  elapsed += 31_000;
  vi.setSystemTime(new Date(START + elapsed));
}

/**
 * Server-render the chrome with the header suspended, hydrate the streamed
 * shell, and hand back the controls to finish the boundary the way React does.
 */
async function hydrateStreamedShell() {
  let releaseServer: () => void = () => {};
  const serverGate = new Promise<void>((resolve) => {
    releaseServer = resolve;
  });
  const StreamedHeader = () => {
    use(serverGate);
    return <Header />;
  };

  const stream = await renderToReadableStream(<Chrome header={StreamedHeader} />);
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  // Pump continuously — racing read() against a timer silently drops chunks.
  void (async () => {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) return;
      buffer += decoder.decode(value, { stream: true });
    }
  })();
  const settle = async () => {
    let seen = -1;
    while (seen !== buffer.length) {
      seen = buffer.length;
      await new Promise((resolve) => setTimeout(resolve, 60));
    }
    return buffer;
  };

  const shell = await settle();
  // The browser is still parsing the streamed document at this point, which is
  // what keeps React waiting for the boundary instead of writing it off.
  setReadyState('loading');
  container = document.createElement('div');
  container.innerHTML = shell;
  document.body.appendChild(container);

  root = hydrateRoot(container, <Chrome header={Header} />, {
    onRecoverableError: (error) => recoverableErrors.push(String((error as Error).message)),
  });

  /** Deliver the streamed segment and run React's `$RC`, as the parser would. */
  async function completeBoundary() {
    releaseServer();
    const completion = (await settle()).slice(shell.length);
    const holder = document.createElement('div');
    holder.innerHTML = completion;
    const scripts = Array.from(holder.querySelectorAll('script')).map((el) => {
      const code = el.textContent ?? '';
      el.remove();
      return code;
    });
    while (holder.firstChild) {
      const node = document.body.appendChild(holder.firstChild);
      if (node instanceof HTMLElement) streamed.push(node);
    }
    for (const code of scripts) new Function(code)();
    setReadyState('complete');
  }

  return {
    shell,
    completeBoundary,
    // Re-rendering the layout is what a client navigation does.
    navigate: () => root?.render(<Chrome header={Header} />),
  };
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
  streamed = [];
  resetStreamingRuntime();
});

afterEach(() => {
  root?.unmount();
  container?.remove();
  streamed.forEach((node) => node.remove());
  root = null;
  container = null;
  Reflect.deleteProperty(document, 'readyState');
  vi.useRealTimers();
});

describe('Creator Club entry — streamed header boundary (FBG-472)', () => {
  it('leaves the entry out of the header while its boundary is still streaming', async () => {
    answers(CASHBACK_WALLET_PROGRAM);
    const { shell, navigate } = await hydrateStreamedShell();

    // The header really is a pending boundary, and the programme is never known
    // server-side, so the shell carries neither the header nor the entry.
    expect(shell).toContain('<!--$?-->');
    expect(shell).not.toContain('/rewards');

    // The footer, hydrated with the provider, picks the entry up at once.
    await until('the footer to show the entry', () => footerEntries() > 0);
    expect(headerEntries()).toBe(0);

    // Coming back to the tab re-reads /config, but the answer is the same string
    // React already holds, so nothing re-renders and the header stays as it is:
    // a dehydrated subtree cannot be rendered into. This is the reported state.
    pastThrottle();
    window.dispatchEvent(new Event('focus'));
    await until('the refocus to be re-read', () => fetchLoyaltyConfig.mock.calls.length > 1);
    expect(headerEntries()).toBe(0);
    expect(footerEntries()).toBeGreaterThan(0);
    // Nothing has torn: the boundary has not been hydrated at all.
    expect(recoverableErrors).toEqual([]);

    // An update that actually reaches the boundary is a different matter — React
    // gives up on the streamed markup and renders the header on the client, entry
    // included. So the state above is not a trap the page cannot leave.
    pathname.value = '/catalog';
    pastThrottle();
    navigate();
    await until('the navigation to client-render the header', () => headerEntries() > 0);
  });

  it('keeps the entry through the reported sequence, tear and navigations included', async () => {
    answers(CASHBACK_WALLET_PROGRAM);
    const { completeBoundary, navigate } = await hydrateStreamedShell();

    // The reported order: /config answers first, the header's segment lands
    // after — which is where the pre-fix provider tears the boundary.
    await until('the footer to show the entry', () => footerEntries() > 0);
    await completeBoundary();
    await until('the header entry to appear', () => headerEntries() > 0);
    expect(headerEntries()).toBeGreaterThan(0);

    // Then the rest of the report: three client navigations in a row. Each one
    // re-renders the layout and re-reads /config, which answers with the SAME
    // programme string — a state React does not re-render for. The entry is
    // still expected after every one of them (acceptance criterion 2).
    const errorsBeforeNavigating = recoverableErrors.length;
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
    }
    // Navigating must not introduce a tear of its own either. (Scoped to the
    // loop, so the assertion holds with and without the gate: the pre-fix tear
    // happens above, at completeBoundary.)
    expect(recoverableErrors).toHaveLength(errorsBeforeNavigating);
  });

  it('completes the boundary without tearing when /config answered first', async () => {
    answers(CASHBACK_WALLET_PROGRAM);
    const { completeBoundary } = await hydrateStreamedShell();
    await until('the footer to show the entry', () => footerEntries() > 0);

    await completeBoundary();
    await until('the header entry to appear', () => headerEntries() > 0);

    // Without the hydration gate this is where React reports "server rendered
    // text didn't match the client" on the nav entry and rebuilds the header.
    expect(recoverableErrors).toEqual([]);

    // The mobile drawer maps the same NAV_ITEMS, so it follows the desktop bar.
    container?.querySelector<HTMLElement>('button.MuiIconButton-root')?.click();
    await until('the drawer to open with the entry', () => drawerEntries() > 0);
  });

  it('leaves header and footer link-free for a dormant programme (FBG-469)', async () => {
    answers('points_discount');
    const { completeBoundary } = await hydrateStreamedShell();
    await until('the dormant answer', () => fetchLoyaltyConfig.mock.calls.length > 0);

    await completeBoundary();
    await until('the header to arrive', () => !!container?.querySelector('header'));

    expect(recoverableErrors).toEqual([]);
    expect(headerEntries()).toBe(0);
    expect(footerEntries()).toBe(0);
  });

  it('leaves header and footer link-free when /config is unreachable', async () => {
    fetchLoyaltyConfig.mockRejectedValue(new Error('BFF down'));
    const { completeBoundary } = await hydrateStreamedShell();
    await until('the failed read', () => fetchLoyaltyConfig.mock.calls.length > 0);

    await completeBoundary();
    await until('the header to arrive', () => !!container?.querySelector('header'));

    expect(recoverableErrors).toEqual([]);
    expect(headerEntries()).toBe(0);
    expect(footerEntries()).toBe(0);
  });
});
