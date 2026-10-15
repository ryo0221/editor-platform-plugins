import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser',
  workers: 1,
  retries: 0,
  use: { baseURL: 'http://127.0.0.1:8789', viewport: { width: 1440, height: 1100 },
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE, args: process.env.EDITOR_BROWSER_SINGLE_PROCESS === '1' ? ['--no-sandbox', '--single-process', '--no-zygote', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : ['--no-sandbox'] } },
  webServer: { command: 'npm start', url: 'http://127.0.0.1:8789/health', reuseExistingServer: false,
    env: { PORT: '8789', EDITOR_ENABLE_DEMO: '1', EDITOR_DATA_DIR: 'work/e2e-data' } },
});
