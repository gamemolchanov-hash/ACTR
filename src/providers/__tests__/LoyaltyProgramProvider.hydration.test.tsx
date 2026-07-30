/**
 * FBG-472 — the Creator Club nav entry must survive the hydration race.
 *
 * `<Header>` sits inside a Suspense boundary (it needs one for
 * `useSearchParams`), so its subtree hydrates in a separate, later pass than the
 * provider that feeds it. When `/config` answered in between — a ~1s fetch
 * against a tree that takes longer than that to hydrate — the header hydrated
 * against server HTML that no longer matched, React reported "server rendered
 * text didn't match the client" on the nav entry itself and threw the boundary
 * away. `<Footer>` has no boundary and was never affected, which is why the
 * footer showed the link and the header did not. And because every later
 * revalidation writes the SAME programme string, React bailed out of the
 * identical state and nothing re-rendered the chrome again: the header kept the
 * no-link markup for the rest of the session.
 *
 * The race is reproduced deterministically here: the header is reached through a
 * `lazy()` chunk that only lands after `/config` has already been published, so
 * the boundary is provably still dehydrated at that moment. Before the fix this
 * file failed on `recoverableErrors` — React logged the mismatch and rebuilt the
 * boundary. `render()`-based tests cannot catch it: they mount on the client,
 * where there is no server HTML to disagree with.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Suspense, lazy, type ComponentType } from 'react';
import { renderToString } from 'react-dom/server';
import { hydrateRoot, type Root } from 'react-dom/client';

const fetchLoyaltyConfig = vi.hoisted(() => vi.fn());
vi.mock('@/lib/loyalty', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/loyalty')>()),
  fetchLoyaltyConfig,
}));

vi.mock('@/i18n/navigation', () => ({ usePathname: () => '/' }));

import { CASHBACK_WALLET_PROGRAM } from '@/lib/loyalty';
import { LoyaltyProgramProvider, useLoyaltyProgram } from '../LoyaltyProgramProvider';

/** Renders of each nav, so a test can wait for a subtree to actually hydrate. */
const renders: Record<string, number> = {};

/** Stand-in for the header/footer nav: one entry gated on the live programme. */
function Nav({ id }: { id: string }) {
  const program = useLoyaltyProgram();
  renders[id] = (renders[id] ?? 0) + 1;
  const items = [
    'catalog',
    'new',
    ...(program === CASHBACK_WALLET_PROGRAM ? ['rewards'] : []),
    'contacts',
  ];
  return (
    <nav data-testid={id}>
      {items.map((item) => (
        <a key={item} href={`/${item}`}>
          {item}
        </a>
      ))}
    </nav>
  );
}

const HeaderNav = () => <Nav id="header" />;

/** Header inside a Suspense boundary (as in the locale layout), footer outside. */
const Chrome = ({ header }: { header: ComponentType }) => {
  const Header = header;
  return (
    <LoyaltyProgramProvider>
      <Suspense>
        <Header />
      </Suspense>
      <Nav id="footer" />
    </LoyaltyProgramProvider>
  );
};

const macrotask = () => new Promise((resolve) => setTimeout(resolve, 0));
const rewardsLinks = (id: string) =>
  document.querySelectorAll(`[data-testid="${id}"] a[href="/rewards"]`).length;

/** Let React work through its queue until `done`, rather than for a fixed time. */
async function until(what: string, done: () => boolean, ticks = 50) {
  for (let i = 0; i < ticks; i++) {
    if (done()) return;
    await macrotask();
  }
  throw new Error(`timed out waiting for: ${what}`);
}

let root: Root | null = null;
let container: HTMLDivElement | null = null;
let recoverableErrors: string[] = [];

/**
 * Server-render the chrome, then hydrate it with the header behind a chunk that
 * has not arrived yet. Returns the handle that lets the chunk land.
 */
function hydrateWithPendingHeader() {
  let landChunk: () => void = () => {};
  const chunk = new Promise<void>((resolve) => {
    landChunk = resolve;
  });
  const LazyHeader = lazy(() => chunk.then(() => ({ default: HeaderNav })));

  const html = renderToString(<Chrome header={HeaderNav} />);
  container = document.createElement('div');
  container.innerHTML = html;
  document.body.appendChild(container);

  root = hydrateRoot(container, <Chrome header={LazyHeader} />, {
    onRecoverableError: (error) => recoverableErrors.push(String((error as Error).message)),
  });
  return { html, landChunk };
}

beforeEach(() => {
  fetchLoyaltyConfig.mockReset();
  recoverableErrors = [];
  for (const key of Object.keys(renders)) delete renders[key];
});

afterEach(() => {
  root?.unmount();
  container?.remove();
  root = null;
  container = null;
});

describe('LoyaltyProgramProvider — /config resolving mid-hydration (FBG-472)', () => {
  it('adds the header entry without a hydration mismatch when /config lands first', async () => {
    fetchLoyaltyConfig.mockResolvedValue({
      program: CASHBACK_WALLET_PROGRAM,
      tiers: [],
      walletCap: null,
    });

    const { html, landChunk } = hydrateWithPendingHeader();
    // The programme is never known server-side: the HTML is always the no-link
    // variant, which is what the hydration render has to reproduce.
    expect(html).not.toContain('/rewards');

    // The answer lands while the header boundary is still dehydrated — the exact
    // window the bug was reported from: footer linked, header not yet.
    await until('the footer to pick up the live programme', () => rewardsLinks('footer') === 1);
    expect(rewardsLinks('header')).toBe(0);

    // Only now does the header chunk arrive and the boundary hydrate.
    landChunk();
    await until('the header to hydrate past its first render', () => (renders.header ?? 0) > 1);

    // Hydrating against HTML written before the answer must not tear.
    expect(recoverableErrors).toEqual([]);
    // ...and the entry still arrives, though the header missed the one state
    // transition that published it.
    await until('the header entry to appear', () => rewardsLinks('header') === 1);
  });

  it('keeps both navs link-free for a dormant programme (FBG-469 stays green)', async () => {
    fetchLoyaltyConfig.mockResolvedValue({
      program: 'points_discount',
      tiers: [],
      walletCap: null,
    });

    const { landChunk } = hydrateWithPendingHeader();
    await until('the dormant programme to be published', () =>
      fetchLoyaltyConfig.mock.calls.length > 0,
    );
    landChunk();
    await until('the header to hydrate past its first render', () => (renders.header ?? 0) > 1);

    expect(recoverableErrors).toEqual([]);
    expect(rewardsLinks('header')).toBe(0);
    expect(rewardsLinks('footer')).toBe(0);
  });

  it('keeps both navs link-free when /config is unreachable', async () => {
    fetchLoyaltyConfig.mockRejectedValue(new Error('BFF down'));

    const { landChunk } = hydrateWithPendingHeader();
    await until('the failed read to settle', () => fetchLoyaltyConfig.mock.calls.length > 0);
    landChunk();
    await until('the header to hydrate past its first render', () => (renders.header ?? 0) > 1);

    expect(recoverableErrors).toEqual([]);
    expect(rewardsLinks('header')).toBe(0);
    expect(rewardsLinks('footer')).toBe(0);
  });
});
