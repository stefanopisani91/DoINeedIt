import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.ts';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: true,
      // Pure logic runs in Node; files that need the DOM opt in with a
      // `@vitest-environment jsdom` docblock.
      environment: 'node',
      // Each file gets fresh module state (the zustand stores are singletons).
      isolate: true,
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}', 'netlify/**/*.test.ts'],
      exclude: ['tests/e2e/**', 'node_modules/**'],
    },
  }),
);
