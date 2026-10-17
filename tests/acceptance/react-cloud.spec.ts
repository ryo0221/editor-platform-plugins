import { test, expect } from '@playwright/test';
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { unzipSync, strFromU8 } from 'fflate';
import { build } from 'esbuild';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const expectedCommit = '0c17336a125659dda85af90153c9b84e651679ae';
const expectedArchiveSha256 = '0d902935e49c2d66f95060bc993be3bd061442df867d8a8b3e29ac6514ee1647';

const hash = (bytes: Uint8Array | string) => createHash('sha256').update(bytes).digest('hex');
test('main 0c17336 packaged React browser acceptance from Codex shell (not Claude)', async ({ page }) => {
  test.setTimeout(120000);
  const evidence = resolve('work/cloud-react/evidence'); await mkdir(evidence, { recursive: true });
  const archive = resolve('release/editor-platform-claude-code-0.1.3-linux-x64.tar.gz');
  // Hash and extract the same snapshot, never a separately prepared directory.
  const archiveBytes = await readFile(archive);
  const archiveSha256 = hash(archiveBytes);
  expect(archiveSha256).toBe(expectedArchiveSha256);
  const directory = await mkdtemp(join(tmpdir(), 'cloud-react-acceptance-'));
  const extracted = join(directory, 'candidate');
  const plugin = join(extracted, 'plugins/editor-platform');
  const bin = join(directory, 'bin'); await mkdir(bin);
  await writeFile(join(bin, 'xdg-open'), '#!/bin/sh\numask 077\nprintf "%s" "$1" > "$EDITOR_TEST_URL_FILE"\n', { mode: 0o700 });
  let client: Client | undefined;
  const stderr: string[] = [], browserErrors: string[] = [];
  let phase = 'startup';
  page.on('pageerror', () => browserErrors.push('unexpected page error'));
  page.on('console', m => { if (m.type() === 'error') browserErrors.push(phase + ': ' + m.text().replace(/https?:\/\/\S+/g, '[URL omitted]').replace(/[a-f0-9]{64}/g, '[redacted]')); });
  const connect = async () => {
    client = new Client({ name: 'codex-shell-package-acceptance', version: '1' });
    const transport = new StdioClientTransport({ command: join(plugin, 'runtime/node'), args: [join(plugin, 'server/code.mjs')], cwd: directory, env: { PATH: bin, EDITOR_DATA_DIR: join(directory, 'data'), EDITOR_TEST_URL_FILE: join(directory, 'url') }, stderr: 'pipe' });
    transport.stderr?.on('data', () => stderr.push('unexpected server stderr'));
    await client.connect(transport);
  };
  const call = async (name: string, args: Record<string, unknown>) => {
    const reply = await client!.callTool({ name, arguments: args });
    expect(reply.isError, 'MCP operation should succeed (body deliberately omitted)').not.toBe(true);
    return reply.structuredContent as any;
  };
  let previewUrl = '';
  let resultSummary: Record<string, unknown> = {};
  try {
    const snapshot = join(directory, 'candidate.tar.gz');
    await writeFile(snapshot, archiveBytes, { mode: 0o600 });
    expect(hash(await readFile(snapshot))).toBe(expectedArchiveSha256);
    await mkdir(extracted);
    await execFileAsync('tar', ['-xzf', snapshot, '-C', extracted]);
    const info = JSON.parse(await readFile(join(plugin, 'build-info.json'), 'utf8'));
    expect(info.sourceCommit).toBe(expectedCommit); expect(info.sourceDirty).toBe(false);
    const executableSha256: Record<string, string> = {};
    for (const [file, checksum] of [
      ['runtime/node', info.nodeSha256],
      ['node_modules/editor-platform-code-runtime/index.mjs', info.runtimeSha256],
      ['ui/editor.html', info.uiSha256], ['ui/browser.html', info.browserSha256],
      ['ui/react-preview.html', info.reactPreviewSha256],
    ]) {
      executableSha256[file] = hash(await readFile(join(plugin, file)));
      expect(executableSha256[file]).toBe(checksum);
    }
    // This launcher has no separate build-info checksum. Its bytes are bound by
    // the fixed archive digest; record their digest explicitly alongside runtime.
    executableSha256['server/code.mjs'] = hash(await readFile(join(plugin, 'server/code.mjs')));
    await connect();
    phase = 'assemble';
    const guide = await call('get_editor_guide', { kind: 'react-ui' });
    const empty = { ...guide.exampleContent, roots: [], nodes: [] };
    const { artifact } = await call('create_artifact', { kind: 'react-ui', title: 'Cloud fictional React acceptance', content: empty });
    const openBrowser = async () => {
      await call('open_editor', {});
      const privateUrl = await readFile(join(directory, 'url'), 'utf8');
      // Do not attach/log this capability. Production shell removes its fragment.
      try { await page.goto(privateUrl); } catch { throw new Error('Browser navigation failed (capability redacted)'); }
      await expect(page.locator('#status')).toContainText('Claude Codeに接続');
      expect(new URL(page.url()).hash).toBe('');
    };
    await openBrowser();
    const editor = page.frameLocator('#editor');
    const openArtifact = async () => {
      await editor.getByRole('button', { name: '成果物の一覧', exact: true }).click();
      await editor.locator('.proposal').filter({ hasText: 'Cloud fictional React acceptance' }).getByRole('button', { name: '開く', exact: true }).click();
      await expect(editor.getByText('Preview ready', { exact: true })).toBeVisible();
    };
    await openArtifact();
    const preview = editor.frameLocator('iframe[title="React component preview"]');
    await editor.getByRole('button', { name: 'Insert Panel', exact: true }).click();
    await editor.getByLabel('Prop title', { exact: true }).fill('Cloud fictional panel');
    await expect(preview.getByRole('heading', { name: 'Cloud fictional panel' })).toBeVisible();
    const target = (await editor.getByLabel('Target slot').locator('option').allTextContents()).find(v => v.endsWith(' / content'))!;
    expect(target).toBeTruthy();
    await editor.getByLabel('Target slot').selectOption({ label: target });
    await editor.getByRole('button', { name: 'Insert Text', exact: true }).click();
    await editor.getByLabel('Prop text', { exact: true }).fill('Fictional cloud component content');
    await expect(preview.getByText('Fictional cloud component content', { exact: true })).toBeVisible();
    await editor.getByRole('button', { name: 'Insert Counter', exact: true }).click();
    await editor.getByLabel('Prop label', { exact: true }).fill('Cloud counter');
    await editor.getByLabel('Prop initial', { exact: true }).fill('2');
    await editor.getByRole('button', { name: 'Interact', exact: true }).click();
    await expect(editor.getByText('Preview ready', { exact: true })).toBeVisible();
    await preview.getByRole('button', { name: 'Cloud counter: 2', exact: true }).click();
    await expect(preview.getByRole('button', { name: 'Cloud counter: 3', exact: true })).toBeVisible();
    await editor.getByRole('button', { name: '保存', exact: true }).click();
    await expect(editor.locator('.save-state')).toContainText('v2');
    const saved = (await call('read_artifact', { artifactId: artifact.id })).artifact;
    expect(saved.content.nodes).toHaveLength(3); expect(saved.content.roots).toHaveLength(1);
    const panel = saved.content.nodes.find((n: any) => n.component.componentId === 'Panel');
    const counter = saved.content.nodes.find((n: any) => n.component.componentId === 'Counter');
    expect(panel.slots.content).toHaveLength(2); expect(counter.props.initial).toBe(2);
    await editor.getByRole('button', { name: '保存先から再読込', exact: true }).click();
    await expect(editor.getByText('Preview ready', { exact: true })).toBeVisible();
    await expect(preview.getByRole('button', { name: 'Cloud counter: 2', exact: true })).toBeVisible();
    await expect(preview.getByText('Fictional cloud component content', { exact: true })).toBeVisible();
    const download = page.waitForEvent('download');
    await editor.getByRole('button', { name: 'Export React TSX', exact: true }).click();
    const output = await download; expect(output.suggestedFilename()).toBe('react-screen.zip');
    const zipPath = join(evidence, 'react-screen.zip'); await output.saveAs(zipPath);
    const zip = await readFile(zipPath), files = unzipSync(zip);
    expect(Object.keys(files).sort()).toEqual(['PluginComponents.tsx', 'README.md', 'Screen.css', 'Screen.tsx', 'composition.json', 'manifest.json'].sort());
    expect(JSON.parse(strFromU8(files['composition.json']))).toEqual(saved.content);
    const source = await readFile(join(plugin, 'source/editor-platform-plugins/src/react-preview/PluginComponents.tsx'), 'utf8');
    expect(strFromU8(files['PluginComponents.tsx'])).toBe(source);
    const registrationHash = hash(JSON.stringify(source));
    const manifest = JSON.parse(strFromU8(files['manifest.json']));
    expect(manifest.registrations).toHaveLength(3);
    for (const registration of manifest.registrations) expect(registration.ref.implementationHash).toBe(registrationHash);
    expect(strFromU8(files['Screen.tsx'])).toContain('Fictional cloud component content');
    const exported = join(evidence, 'exported'); await mkdir(exported, { recursive: true });
    for (const [name, data] of Object.entries(files)) await writeFile(join(exported, name), data);
    await build({ entryPoints: [join(exported, 'Screen.tsx')], bundle: true, write: false, outfile: join(exported, 'app.js'), jsx: 'automatic', external: ['react', 'react/jsx-runtime'] });
    for (let i = 0; i < 2; i++) { await preview.getByRole('button', { name: 'Cloud counter: 2', exact: true }).click(); await expect(preview.getByRole('button', { name: 'Cloud counter: 3', exact: true })).toBeVisible(); await editor.getByRole('button', { name: 'Restart preview', exact: true }).click(); await expect(editor.getByText('Preview ready', { exact: true })).toBeVisible(); await expect(preview.getByRole('button', { name: 'Cloud counter: 2', exact: true })).toBeVisible(); }
    await page.reload(); await expect(page.locator('#status')).toContainText('Claude Codeに接続'); await openArtifact();
    await expect(preview.getByRole('heading', { name: 'Cloud fictional panel' })).toBeVisible();
    const child = page.frames().find(f => f.url().endsWith('/react-preview.html'))!; previewUrl = child.url();
    const isolated = await child.evaluate(() => {
      let parentDenied = false, storageDenied = false;
      try { void parent.document.body; } catch { parentDenied = true; }
      try { void top!.sessionStorage.getItem('editor-browser-token'); } catch { storageDenied = true; }
      return { parentDenied, storageDenied, noToken: sessionStorage.getItem('editor-browser-token') === null };
    });
    expect(isolated).toEqual({ parentDenied: true, storageDenied: true, noToken: true });
    await page.screenshot({ path: join(evidence, 'react-packaged-browser.png'), fullPage: true });
    await page.goto('about:blank');
    phase = 'server-shutdown';
    await client!.close(); client = undefined;
    await expect.poll(async () => { try { await fetch(previewUrl); return false; } catch { return true; } }).toBe(true);
    phase = 'server-restart';
    await connect();
    expect((await call('read_artifact', { artifactId: artifact.id })).artifact.content).toEqual(saved.content);
    await openBrowser(); await openArtifact();
    await expect(preview.getByRole('button', { name: 'Cloud counter: 2', exact: true })).toBeVisible();
    previewUrl = page.frames().find(f => f.url().endsWith('/react-preview.html'))!.url();
    expect(browserErrors).toEqual([]); expect(stderr).toEqual([]);
    resultSummary = { sourceCommit: info.sourceCommit, sourceDirty: info.sourceDirty, archiveSha256, candidateProvenance: 'SHA-pinned archive bytes snapshotted and freshly extracted by this harness; all process/UI paths use that extraction', executableSha256, exportZipSha256: hash(zip), previewSha256: info.reactPreviewSha256, uiSha256: info.uiSha256, exportedFileNames: Object.keys(files).sort(), compositionNodeCount: saved.content.nodes.length, savedRevision: saved.revision, componentStateEphemeral: true, serverRestartRetention: true, parentDomDenied: true, parentCredentialStorageDenied: true, browserErrors: 0, serverErrors: 0, result: 'PASS', execution: 'Codex shell -> bundled Node/server -> Chromium; OS opener captured; no Claude process or login' };
  } finally {
    await page.goto('about:blank');
    await client?.close();
    if (previewUrl) await expect.poll(async () => { try { await fetch(previewUrl); return false; } catch { return true; } }).toBe(true);
    await rm(directory, { recursive: true, force: true });
  }
  expect(browserErrors).toEqual([]); expect(stderr).toEqual([]);
  await writeFile(join(evidence, 'result.json'), JSON.stringify(resultSummary, null, 2) + '\n');
});
