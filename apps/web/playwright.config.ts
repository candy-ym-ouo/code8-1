import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '../../e2e',
  fullyParallel: false,
  use: { baseURL: 'http://127.0.0.1:5173', trace: 'on-first-retry' },
  webServer: [
    { command: 'npm run dev -w @paper-book-traces/api', port: 3000, reuseExistingServer: true },
    { command: 'npm run dev -w @paper-book-traces/web', port: 5173, reuseExistingServer: true }
  ],
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }]
});
