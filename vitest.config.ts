import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  // Next.js tsconfig sets "jsx": "preserve" — plugin-react compiles JSX for tests
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  test: {
    environment: 'jsdom',
    // src app tests + the diff-cover gate's pure-function unit tests (tools/diff-cover.test.mjs)
    include: ['src/**/*.test.{ts,tsx}', 'tools/**/*.test.mjs'],
    server: {
      // next-intl's middleware submodule imports `next/server` with no extension;
      // inline it so vite (not node's ESM resolver) resolves the specifier, which
      // lets middleware.test.ts drive the real createMiddleware(routing) (FBG-428).
      deps: { inline: ['next-intl'] },
    },
  },
});
