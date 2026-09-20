import { defineConfig, devices } from '@playwright/test';

const PORT = 5179;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: /viewport-smoke\.spec\.ts/,
    },
    {
      name: 'viewport-360',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 360, height: 800 },
      },
      testMatch: /viewport-smoke\.spec\.ts/,
    },
    {
      name: 'viewport-390',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 390, height: 844 },
      },
      testMatch: /viewport-smoke\.spec\.ts/,
    },
    {
      name: 'viewport-768',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 768, height: 1024 },
      },
      testMatch: /viewport-smoke\.spec\.ts/,
    },
  ],
  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 120 * 1000,
    env: {
      ...process.env,
      BASELCAL_DISABLE_STUDENT_CONFIG: '1',
    },
  },
});
