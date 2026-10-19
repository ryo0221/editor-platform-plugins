// Packaged-candidate acceptance harness (L1). Runs the exact release archive's
// bundled Node and server; only the OS URL opener is replaced so the browser
// handoff can be captured. It never touches the user's installed plugin or data.
import { expect, type Page } from '@playwright/test';
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { join, resolve, basename } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const execFileAsync = promisify(execFile);
export const hash = (bytes: Uint8Array | string) => createHash('sha256').update(bytes).digest('hex');

export type Candidate = { archive: string; archiveSha256: string; plugin: string; info: any };

// The archive digest must match its sidecar; the extraction is always fresh.
export async function extractCandidate(archivePath: string, into: string): Promise<Candidate> {
  const archive = resolve(archivePath);
  const bytes = await readFile(archive);
  const archiveSha256 = hash(bytes);
  const sidecar = (await readFile(archive + '.sha256', 'utf8')).trim().split(/\s+/);
  expect(sidecar[0], 'archive digest matches its .sha256 sidecar').toBe(archiveSha256);
  expect(sidecar[1]).toBe(basename(archive));
  const snapshot = join(into, 'candidate.tar.gz');
  await writeFile(snapshot, bytes, { mode: 0o600 });
  const extracted = join(into, 'candidate'); await mkdir(extracted);
  await execFileAsync('tar', ['-xzf', snapshot, '-C', extracted]);
  const plugin = join(extracted, 'plugins/editor-platform');
  const info = JSON.parse(await readFile(join(plugin, 'build-info.json'), 'utf8'));
  for (const [file, checksum] of [['runtime/node', info.nodeSha256], ['server/code.mjs', info.codeEntrySha256],
    ['node_modules/editor-platform-code-runtime/index.mjs', info.runtimeSha256],
    ['ui/editor.html', info.uiSha256], ['ui/browser.html', info.browserSha256],
    ['ui/react-preview.html', info.reactPreviewSha256]]) {
    expect(hash(await readFile(join(plugin, file))), `${file} matches build-info`).toBe(checksum);
  }
  return { archive, archiveSha256, plugin, info };
}

export async function workspace(prefix: string) {
  const directory = await mkdtemp(join(tmpdir(), prefix));
  const bin = join(directory, 'bin'); await mkdir(bin);
  // WSL tries wslview first, other Linux xdg-open. Both only record the URL.
  const shim = '#!/bin/sh\numask 077\nprintf "%s" "$1" > "$EDITOR_TEST_URL_FILE"\n';
  for (const name of ['wslview', 'xdg-open']) await writeFile(join(bin, name), shim, { mode: 0o700 });
  return { directory, bin, data: join(directory, 'data'), cleanup: () => rm(directory, { recursive: true, force: true }) };
}

export type Server = Awaited<ReturnType<typeof startServer>>;

export async function startServer(plugin: string, space: { directory: string; bin: string; data: string }, label = 'server') {
  const stderr: string[] = [];
  const client = new Client({ name: 'candidate-acceptance', version: '1' });
  const transport = new StdioClientTransport({ command: join(plugin, 'runtime/node'), args: [join(plugin, 'server/code.mjs')],
    cwd: space.directory, stderr: 'pipe',
    env: { PATH: space.bin, HOME: space.directory, EDITOR_DATA_DIR: space.data, EDITOR_TEST_URL_FILE: join(space.directory, 'url') } });
  transport.stderr?.on('data', (chunk) => stderr.push(`${label}: ${String(chunk).trim()}`));
  try { await client.connect(transport); }
  catch (error) { throw new Error(`${(error as Error).message}; stderr: ${stderr.join(' | ').slice(0, 300)}`); }
  const raw = (name: string, args: Record<string, unknown> = {}) => client.callTool({ name, arguments: args }) as Promise<any>;
  const call = async (name: string, args: Record<string, unknown> = {}) => {
    const reply = await raw(name, args);
    expect(reply.isError, `${name} should succeed: ${JSON.stringify(reply.content)?.slice(0, 300)}`).not.toBe(true);
    return reply.structuredContent as any;
  };
  const url = async () => { await call('open_editor'); return readFile(join(space.directory, 'url'), 'utf8'); };
  return { client, call, raw, url, stderr, close: () => client.close() };
}

export function watchErrors(page: Page, errors: string[], tag = 'page') {
  page.on('pageerror', (error) => errors.push(`${tag}: ${error.message}`));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(`${tag}: ${message.text().replace(/[a-f0-9]{64}/g, '[token]')}`); });
}

export async function openEditor(page: Page, privateUrl: string) {
  await page.goto(privateUrl);
  await expect(page.locator('#status')).toContainText('Claude Codeに接続');
  expect(new URL(page.url()).hash, 'token fragment removed from the address bar').toBe('');
  return page.frameLocator('#editor');
}

export async function openSaved(frame: ReturnType<Page['frameLocator']>, title: string) {
  await frame.getByRole('button', { name: '成果物の一覧', exact: true }).click();
  await frame.locator('.proposal').filter({ hasText: title }).getByRole('button', { name: '開く', exact: true }).click();
}

// Each check writes its own record so a failing check never hides the others.
export async function record(dir: string, id: string, value: Record<string, unknown>) {
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, `${id}.json`), JSON.stringify({ id, ...value }, null, 2) + '\n');
}
