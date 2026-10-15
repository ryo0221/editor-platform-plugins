import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { request } from 'node:http';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { startHttp } from '../src/server/main';
import { DeckStore } from '../src/server/decks';

test('HTTP authentication, DNS/Origin guard, disabled demo and MCP roundtrip', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'editor-http-test-'));
  const token = 'test-only-access-token-000000000000000000';
  const server = startHttp({ host: '127.0.0.1', port: 0, store: new DeckStore(directory), token });
  const client = new Client({ name: 'http-test', version: '1' });
  await once(server, 'listening');
  const url = new URL(`http://127.0.0.1:${(server.address() as { port: number }).port}/mcp`);
  try {
    assert.equal((await fetch(url, { method: 'POST' })).status, 401);
    assert.equal((await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${token}`, Origin: 'https://untrusted.example' } })).status, 403);
    const foreignHostStatus = await new Promise<number | undefined>((resolve, reject) => {
      const req = request(url, { method: 'POST', headers: { Host: 'untrusted.example', Authorization: `Bearer ${token}` } }, (res) => { res.resume(); resolve(res.statusCode); });
      req.on('error', reject); req.end();
    });
    assert.equal(foreignHostStatus, 403);
    assert.equal((await fetch(new URL('/demo', url), { headers: { Authorization: `Bearer ${token}` } })).status, 404);
    await client.connect(new StreamableHTTPClientTransport(url, { requestInit: { headers: { Authorization: `Bearer ${token}` } } }));
    assert.equal((await client.listTools()).tools.length, 18);
    const created = await client.callTool({ name: 'create_deck', arguments: { title: 'HTTP test' } });
    assert.ok(!created.isError);
    assert.equal((await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: '{' })).status, 400);
  } finally { await client.close(); await new Promise<void>((r) => server.close(() => r())); await rm(directory, { recursive: true, force: true }); }
});
test('remote binding refuses unauthenticated servers and exposed demo harness', () => {
  const store = new DeckStore('unused');
  assert.throws(() => startHttp({ host: '0.0.0.0', port: 0, store }), /requires/);
  assert.throws(() => startHttp({ host: '0.0.0.0', port: 0, store, token: 't'.repeat(40), demo: true }), /loopback/);
});
