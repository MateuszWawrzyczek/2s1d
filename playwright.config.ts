import { defineConfig, devices } from '@playwright/test';

const port = process.env.PLAYWRIGHT_PORT ?? '5173';
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL,
    viewport: { width: 1440, height: 1200 },
    trace: 'on-first-retry',
  },
  webServer: {
    command: `npx vite --host 127.0.0.1 --port ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
          ? {
              executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
            }
          : undefined,
      },
    },
  ],
});
