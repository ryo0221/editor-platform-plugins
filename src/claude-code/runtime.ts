import { randomBytes } from 'node:crypto';
import { once } from 'node:events';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { DeckStore } from '../server/decks';
import { launchBrowser, browserHandoffReport, type BrowserHandoff } from './browser-opener';
import { createEditorServer } from '../server/mcp';
import { startHttp } from '../server/main';
import { desktopDataDirectory } from '../desktop/storage';
import { lockWorkspace } from './lock';
import { startReactPreview } from '../react-preview/server';

export function codeDataDirectory(env: NodeJS.ProcessEnv = process.env) {
  // Reuse the OS path policy, but never mix Code and Desktop workspaces.
  return env.EDITOR_DATA_DIR
    ? desktopDataDirectory(env)
    : join(desktopDataDirectory({ ...env, EDITOR_DATA_DIR: undefined }), '..', 'ClaudeCode');
}
export async function startCode(bundleRoot: URL, openBrowser: (url: string) => Promise<BrowserHandoff | void> = launchBrowser) {
  const directory = codeDataDirectory();
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const unlock = await lockWorkspace(directory);
  const store = new DeckStore(directory);
  const token = randomBytes(32).toString('hex');
  const html = new URL('ui/editor.html', bundleRoot);
  // An ephemeral port avoids collisions. Only this process owns the store.
  const httpOptions = { host: '127.0.0.1', port: 0, token, store, html,
    browserHtml: new URL('ui/browser.html', bundleRoot), reactPreviewUrl: '' };
  const http = startHttp(httpOptions);
  try { await once(http, 'listening'); } catch (error) { await unlock(); throw error; }
  const address = `http://127.0.0.1:${(http.address() as { port: number }).port}`;
  let preview: Awaited<ReturnType<typeof startReactPreview>>;
  try {
    preview = await startReactPreview(address, new URL('ui/react-preview.html', bundleRoot));
    httpOptions.reactPreviewUrl = preview.url;
  } catch (error) {
    http.closeAllConnections(); await new Promise<void>(resolve => http.close(() => resolve()));
    await unlock(); throw error;
  }
  const server = createEditorServer(store, html, { modelOnly: true, openEditor: async () => {
    return browserHandoffReport(await openBrowser(`${address}/browser#${token}`));
  } });
  let closed = false;
  const close = async () => {
    if (closed) return;
    closed = true; await preview.close(); http.closeAllConnections();
    await new Promise<void>((resolve) => http.close(() => resolve()));
    await server.close(); await unlock();
  };
  server.server.onclose = () => { void close(); };
  process.once('SIGINT', () => { void close(); }); process.once('SIGTERM', () => { void close(); });
  try { await server.connect(new StdioServerTransport()); }
  catch (error) { await close(); throw error; }
  return { server, http, close, directory };
}
