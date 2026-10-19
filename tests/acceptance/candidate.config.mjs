import { defineConfig } from '@playwright/test';
// Explicit packaged-candidate acceptance (L1); not part of npm run check or CI.
// CANDIDATE_ARCHIVE=release/<candidate>.tar.gz [PREVIOUS_ARCHIVE=release/<previous>.tar.gz]
export default defineConfig({ testDir: '.', testMatch: 'candidate.spec.ts', workers: 1, retries: 0, timeout: 120000,
  outputDir: '../../work/acceptance/automated/results',
  globalSetup: './candidate-setup.mjs', globalTeardown: './candidate-summary.mjs',
  use: { viewport: { width: 1440, height: 1100 }, trace: 'off', video: 'off', launchOptions: { args: ['--no-sandbox'] } } });
