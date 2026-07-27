import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

/**
 * Global test teardown: unmount every rendered React root after each test.
 *
 * The Vitest config runs with `test.globals` off, so @testing-library's own
 * auto-cleanup is never registered. A test file that renders a component but
 * forgets a local `afterEach(cleanup)` therefore leaves its root mounted past
 * the test. React's concurrent scheduler can then flush a queued MessageChannel
 * task (`performWorkUntilDeadline`) *after* Vitest tears down the jsdom
 * environment — at which point `window` is gone and react-dom throws
 * "window is not defined" as an unhandled error, failing the whole run (rc=1)
 * even though every assertion passed (seen from ProductDetail.i18n.test.tsx,
 * which mounts an async React Query client component without cleanup).
 *
 * Registering cleanup here covers every test file uniformly, so no individual
 * file can reintroduce the leak. It is idempotent, so files that also keep their
 * own `afterEach(cleanup)` are unaffected.
 */
afterEach(() => {
  cleanup();
});
