// Test-only browser opener. Never used by the distributed runtime.
import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { startCode } from '../src/claude-code/runtime.ts';
await startCode(process.env.EDITOR_TEST_BUNDLE ? pathToFileURL(process.env.EDITOR_TEST_BUNDLE + '/') : new URL('../dist-code-test/', import.meta.url), async (url) => {
  await writeFile(process.env.EDITOR_TEST_URL_FILE, url, { mode: 0o600 });
});
