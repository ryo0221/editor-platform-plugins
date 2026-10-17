import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { codeDataDirectory } from '../src/claude-code/runtime';
import { lockWorkspace } from '../src/claude-code/lock';

const root = fileURLToPath(new URL('../', import.meta.url));
test('Code workspace is outside installation and refuses concurrent owners', async () => {
  assert.match(codeDataDirectory({ XDG_DATA_HOME: '/private/data' }), /EditorPlatform\/ClaudeCode$/);
  assert.equal(codeDataDirectory({ EDITOR_DATA_DIR: '/private/custom' }), '/private/custom');
  assert.throws(() => codeDataDirectory({ EDITOR_DATA_DIR: 'relative' }), /absolute/);
  const directory = await mkdtemp(join(tmpdir(), 'code-lock-'));
  try {
    const unlock = await lockWorkspace(directory);
    await assert.rejects(lockWorkspace(directory), /another Claude Code session/);
    await unlock(); await (await lockWorkspace(directory))();
  } finally { await rm(directory, { recursive: true, force: true }); }
});
test('Code stdio omits human-only tools; isolated browser auth, saved revisions and shutdown', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'code-runtime-'));
  const urlFile = join(directory, 'browser-url');
  const client = new Client({ name: 'code-model-test', version: '1' });
  const browser = new Client({ name: 'code-browser-test', version: '1' });
  const transport = new StdioClientTransport({ command: process.execPath,
    args: ['--import', 'tsx', join(root, 'tests/code-host.mjs')], cwd: root,
    env: { ...process.env, EDITOR_DATA_DIR: directory, EDITOR_TEST_URL_FILE: urlFile, EDITOR_TEST_HANDOFF: 'unconfirmed' } as Record<string, string>, stderr: 'pipe' });
  let url: URL | undefined;
  try {
    await client.connect(transport);
    const names = (await client.listTools()).tools.map((tool) => tool.name);
    assert.ok(names.includes('open_editor'));
    for (const name of ['save_slide_draft', 'apply_slide_proposal', 'reject_slide_proposal', 'save_artifact_draft', 'apply_artifact_proposal', 'reject_artifact_proposal', 'set_artifact_selection', 'set_slide_selection']) {
      assert.ok(!names.includes(name), name);
      const denied = await client.callTool({ name, arguments: {} });
      assert.equal(denied.isError, true);
    }
    const opening = await client.callTool({ name: 'open_editor', arguments: {} });
    assert.ok(!opening.isError);
    assert.equal(opening.structuredContent?.status, 'launch_unconfirmed');
    assert.equal(opening.structuredContent?.browserVerified, false);
    assert.ok(!JSON.stringify(opening).includes('http://'));
    assert.match(JSON.stringify(opening), /Do not automatically retry/);
    url = new URL(await readFile(urlFile, 'utf8'));
    const token = url.hash.slice(1); assert.match(token, /^[a-f0-9]{64}$/);
    const mcp = new URL('/mcp', url);
    assert.equal((await fetch(mcp, { method: 'POST' })).status, 401);
    assert.equal((await fetch(mcp, { method: 'POST', headers: { Authorization: `Bearer ${token}`, Origin: 'https://evil.example' } })).status, 403);
    assert.equal((await fetch(mcp, { method: 'POST', headers: { Authorization: 'Bearer wrong' } })).status, 401);
    await browser.connect(new StreamableHTTPClientTransport(mcp, { requestInit: { headers: { Authorization: `Bearer ${token}` } } }));
    const made: any = (await client.callTool({ name: 'create_deck', arguments: { title: 'Code native test' } })).structuredContent;
    const deck = made.deck;
    const saved = await browser.callTool({ name: 'save_slide_draft', arguments: { deckId: deck.id, baseRevision: 1, content: deck.content } });
    assert.equal((saved.structuredContent as any).deck.revision, 2);
    const stale = await browser.callTool({ name: 'save_slide_draft', arguments: { deckId: deck.id, baseRevision: 1, content: deck.content } });
    assert.equal(stale.isError, true);
    const read = await client.callTool({ name: 'read_deck', arguments: { deckId: deck.id } });
    assert.equal((read.structuredContent as any).deck.revision, 2);
  } finally {
    await browser.close(); await client.close();
    // Stdio close stops the listener and releases the conservative workspace lock.
    for (let attempt = 0; attempt < 30; attempt++) {
      try { await access(join(directory, '.claude-code.lock')); }
      catch { break; }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    await assert.rejects(access(join(directory, '.claude-code.lock')));
    if (url) await assert.rejects(fetch(new URL('/health', url)));
    await rm(directory, { recursive: true, force: true });
  }
});
