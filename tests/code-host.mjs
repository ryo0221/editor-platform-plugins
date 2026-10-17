// Test-only browser opener. Never used by the distributed runtime.
import { writeFile, mkdir, cp } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { startCode } from '../src/claude-code/runtime.ts';
if (!process.env.EDITOR_TEST_BUNDLE) {
  await mkdir('dist-code-test/ui', { recursive: true });
  await cp('dist-react-preview/react-preview.html', 'dist-code-test/ui/react-preview.html');
}
await startCode(process.env.EDITOR_TEST_BUNDLE ? pathToFileURL(process.env.EDITOR_TEST_BUNDLE + '/') : new URL('../dist-code-test/', import.meta.url), async (url) => {
  await writeFile(process.env.EDITOR_TEST_URL_FILE, url, { mode: 0o600 });
  return process.env.EDITOR_TEST_HANDOFF === 'unconfirmed' ? 'unconfirmed' : 'handoff_requested';
});
