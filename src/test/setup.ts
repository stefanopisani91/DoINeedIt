import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Only files that opt in to jsdom have a DOM to clean up.
afterEach(() => {
  if (typeof window === 'undefined') return;
  cleanup();
  window.localStorage.clear();
});
