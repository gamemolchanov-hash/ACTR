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
  },
});
