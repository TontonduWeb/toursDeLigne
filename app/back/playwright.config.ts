import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60000, // 60 secondes par test
  fullyParallel: false, // Tests en série pour éviter conflits DB
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // 1 seul worker pour tests séquentiels
  reporter: 'html',
  
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: [
    {
      command: 'cd ../back && npm start',
      url: 'http://localhost:8082/api/health',
      timeout: 120000,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'cd ../front && npm start',
      url: 'http://localhost:3000',
      timeout: 120000,
      reuseExistingServer: !process.env.CI,
    },
  ],
});