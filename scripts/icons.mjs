/**
 * Renders the PWA icons from public/favicon.svg with the Chromium bundled with
 * Playwright, so no image library is needed. Run `npm run icons` whenever the
 * favicon changes; the PNG files are committed.
 */
import { chromium } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const outDir = path.join(root, 'public/icons');
const favicon = await readFile(path.join(root, 'public/favicon.svg'), 'utf8');

/** The favicon artwork without the outer <svg> and the rounded background. */
const artwork = favicon
  .replace(/<svg[^>]*>/, '')
  .replace('</svg>', '')
  .replace(/<rect[^>]*\/>/, '')
  .trim();

/**
 * Full-bleed background with the artwork inside the central 80% "safe zone":
 * Android masks the icon into its own shape and iOS rounds the corners itself.
 */
const maskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="#0f766e"/>
  <g transform="translate(32 32) scale(0.8) translate(-32 -32)">${artwork}</g>
</svg>`;

const icons = [
  { file: 'icon-192.png', size: 192, svg: favicon },
  { file: 'icon-512.png', size: 512, svg: favicon },
  { file: 'maskable-512.png', size: 512, svg: maskable },
  { file: 'apple-touch-icon-180.png', size: 180, svg: maskable },
];

const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH;
const browser = await chromium.launch(executablePath ? { executablePath } : {});
try {
  await mkdir(outDir, { recursive: true });
  for (const icon of icons) {
    const page = await browser.newPage({
      viewport: { width: icon.size, height: icon.size },
      deviceScaleFactor: 1,
    });
    const svg = icon.svg.replace(
      '<svg ',
      `<svg width="${icon.size}" height="${icon.size}" style="display:block" `,
    );
    await page.setContent(`<!doctype html><body style="margin:0;background:transparent">${svg}`);
    const png = await page.screenshot({ omitBackground: true, type: 'png' });
    await writeFile(path.join(outDir, icon.file), png);
    await page.close();
    console.log(`${icon.file} (${icon.size}×${icon.size})`);
  }
} finally {
  await browser.close();
}
