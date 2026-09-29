import { defineConfig, devices } from '@playwright/test';

const port = 4173;

/** Lets a machine with a pre-installed Chromium run the suite without downloading browsers. */
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH;
const launchOptions = executablePath ? { executablePath } : {};

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${port}`,
    trace: 'retain-on-failure',
    // The interface follows the browser language: the suite runs in Italian
    // and switches to English only where it tests the English interface.
    locale: 'it-IT',
  },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'], launchOptions } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], launchOptions } },
  ],
  webServer: {
    command: `npm run dev -- --port ${port} --strictPort`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
