import { defineConfig } from '@playwright/test';
// Explicit local acceptance run; not added to general checks or automatic CI.
export default defineConfig({ testDir: '.', testMatch: 'react-cloud.spec.ts', workers: 1, retries: 0, outputDir: '../../work/cloud-react/results', use: { viewport: { width: 1440, height: 1100 }, trace: 'off', video: 'off', launchOptions: { executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] } } });
