import { defineConfig, devices } from '@playwright/test';

// Docker portal ports
// web-customer : 18080  web-admin : 18081  web-driver : 18082  web-merchant : 18083
export default defineConfig({
  testDir: './e2e',
  timeout: 60000,
  retries: 1,
  reporter: [['list'], ['html', { outputFolder: 'e2e-report', open: 'never' }]],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:18080',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'], browserName: 'chromium' },
    },
  ],
});
