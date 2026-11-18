import { defineConfig } from '@playwright/test';

const baseURL = 'http://127.0.0.1:4173';

export default defineConfig({
  testDir: './browser',
  use: {
    baseURL,
    channel: process.env.A2PAGE_CHROME === '1' ? 'chrome' : undefined,
  },
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
    url: baseURL,
  },
});
