/** @vitest-environment jsdom */

import { afterEach, describe, expect, it } from 'vitest';
import {
  applyTheme,
  resolveTheme,
  systemPrefersDark,
  THEME_ATTRIBUTE,
  THEME_COLORS,
} from './theme';

describe('resolveTheme', () => {
  it('keeps the chosen theme whatever the system prefers', () => {
    expect(resolveTheme('dark', false)).toBe('dark');
    expect(resolveTheme('light', true)).toBe('light');
  });

  it('follows the system when nothing was chosen', () => {
    expect(resolveTheme(null, true)).toBe('dark');
    expect(resolveTheme(null, false)).toBe('light');
  });
});

describe('systemPrefersDark', () => {
  it('is false where matchMedia is missing', () => {
    expect(systemPrefersDark()).toBe(false);
  });
});

describe('applyTheme', () => {
  afterEach(() => {
    document.documentElement.removeAttribute(THEME_ATTRIBUTE);
    document.head.querySelector('meta[name="theme-color"]')?.remove();
  });

  it('writes the theme on <html> and on the theme-color meta', () => {
    const meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    meta.setAttribute('content', '#000000');
    document.head.append(meta);

    applyTheme('dark');
    expect(document.documentElement.getAttribute(THEME_ATTRIBUTE)).toBe('dark');
    expect(meta.getAttribute('content')).toBe(THEME_COLORS.dark);

    applyTheme('light');
    expect(document.documentElement.getAttribute(THEME_ATTRIBUTE)).toBe('light');
    expect(meta.getAttribute('content')).toBe(THEME_COLORS.light);
  });

  it('still sets the attribute when the meta is missing, without creating it', () => {
    expect(() => applyTheme('dark')).not.toThrow();
    expect(document.documentElement.getAttribute(THEME_ATTRIBUTE)).toBe('dark');
    expect(document.querySelector('meta[name="theme-color"]')).toBeNull();
  });
});
