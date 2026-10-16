import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
test('packaged stdio launcher resolves dependencies outside the repository cwd', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'editor-stdio-test-'));
  const env = Object.fromEntries(Object.entries(process.env).filter((e): e is [string, string] => e[1] !== undefined));
  const transport = new StdioClientTransport({ command: process.execPath, args: [fileURLToPath(new URL('../scripts/start-stdio.mjs', import.meta.url))], cwd: directory, env: { ...env, EDITOR_DATA_DIR: directory }, stderr: 'pipe' });
  const client = new Client({ name: 'stdio-test', version: '1' });
  try {
    await client.connect(transport);
    assert.equal((await client.listTools()).tools.length, 21);
    const result = await client.callTool({ name: 'create_artifact', arguments: { kind: 'whiteboard', title: 'Stdio' } });
    assert.ok(!result.isError);
  } finally { await client.close(); await rm(directory, { recursive: true, force: true }); }
});
