import { test, expect } from '@playwright/test';
import { build } from 'esbuild';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { startReactPreview } from '../../src/react-preview/server';
import { createPreviewDocument } from '../../src/react-preview/catalog';

test('React isolated runtime reports component exceptions and ignores malformed/replayed requests', async ({ page }) => {
  const directory = await mkdtemp(join(tmpdir(), 'react-runtime-error-'));
  // Fault injection exists only in this test build. Production has no failure flag,
  // script input, eval, component upload or diagnostic execution endpoint.
  const bundle = await build({ entryPoints: ['src/react-preview/runtime.tsx'], bundle: true, write: false, format: 'iife', platform: 'browser', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"production"' }, plugins: [{ name: 'test-component-exception', setup(build) {
    build.onLoad({ filter: /PluginComponents\.tsx$/ }, async args => ({ contents: (await readFile(args.path, 'utf8')).replace('const [count, setCount]', "throw new Error('Injected component failure'); const [count, setCount]"), loader: 'tsx' }));
  } }] });
  const file = join(directory, 'preview.html');
  await writeFile(file, `<html><head></head><body><div id="root"></div><script>${bundle.outputFiles[0].text.replaceAll('</script', '<\\/script')}</script></body></html>`);
  const host = createServer((_req, res) => res.writeHead(200, { 'Content-Type': 'text/html' }).end('<html><body><h1>Runtime boundary test host</h1></body></html>'));
  host.listen(0, '127.0.0.1'); await once(host, 'listening');
  const origin = `http://127.0.0.1:${(host.address() as { port: number }).port}`;
  const runtime = await startReactPreview(origin, pathToFileURL(file));
  const unexpected: string[] = [];
  page.on('pageerror', e => unexpected.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !m.text().includes('Injected component failure')) unexpected.push(m.text()); });
  try {
    await page.goto(origin);
    await page.evaluate(url => {
      (window as any).responses = [];
      const iframe = document.createElement('iframe'); iframe.sandbox.add('allow-scripts', 'allow-same-origin'); iframe.src = url; iframe.title = 'Boundary fixture';
      window.addEventListener('message', event => { if (event.source === iframe.contentWindow && event.origin === new URL(url).origin) (window as any).responses.push(event.data); });
      document.body.append(iframe);
    }, runtime.url);
    const child = page.frameLocator('iframe');
    await expect(child.locator('#root')).toBeAttached();
    const request = { protocol: 1, type: 'render', sessionId: crypto.randomUUID(), requestId: crypto.randomUUID(), revision: 1, mode: 'interact', viewport: { width: 390, height: 700 }, document: createPreviewDocument() };
    const send = async (data: unknown) => page.evaluate(({ data, url }) => document.querySelector('iframe')!.contentWindow!.postMessage(data, new URL(url).origin), { data, url: runtime.url });
    await send(request);
    await expect(child.getByRole('alert')).toHaveText('Component failed. Restart preview.');
    await expect.poll(() => page.evaluate(() => (window as any).responses.map((r: any) => r.type))).toEqual(['error']);
    const response = await page.evaluate(() => (window as any).responses[0]);
    expect(response).toMatchObject({ protocol: 1, sessionId: request.sessionId, requestId: request.requestId, revision: 1, type: 'error', diagnostics: [{ code: 'component-exception', message: 'Injected component failure' }] });
    await send({ ...request, script: 'alert(1)' });
    await send({ ...request, revision: 0 });
    await send({ ...request, revision: 2, sessionId: crypto.randomUUID() });
    await send(request);
    // A valid subsequent request acts as the barrier: earlier queued messages
    // must be ignored, while the next accepted revision reports its own error.
    await send({ ...request, revision: 2, requestId: crypto.randomUUID() });
    await expect.poll(() => page.evaluate(() => (window as any).responses.length)).toBe(2);
    expect(await page.evaluate(() => (window as any).responses.map((r: any) => r.revision))).toEqual([1, 2]);
    expect(unexpected).toEqual([]);
  } finally { await runtime.close(); host.closeAllConnections(); await new Promise<void>(resolve => host.close(() => resolve())); await rm(directory, { recursive: true, force: true }); }
});
