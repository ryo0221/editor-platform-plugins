import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { CallToolResultSchema } from '@modelcontextprotocol/sdk/types.js';
import { createEditorServer } from '../src/server/mcp';
import { DeckStore } from '../src/server/decks';
import { resourceUri, type DeckRecord } from '../src/shared/contracts';

test('real MCP initialize/discovery, typed proposals, app-only metadata and bundled UI resource', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'editor-mcp-test-'));
  const server = createEditorServer(new DeckStore(directory));
  const client = new Client({ name: 'integration-test', version: '1' });
  const [a, b] = InMemoryTransport.createLinkedPair();
  try {
    await server.connect(b); await client.connect(a);
    const { tools } = await client.listTools();
    assert.equal(tools.length, 25);
    assert.deepEqual((tools.find((t) => t.name === 'apply_slide_proposal')?._meta?.ui as {visibility: string[]}).visibility, ['app']);
    const capabilities = CallToolResultSchema.parse(await client.callTool({ name: 'list_editors', arguments: {} }));
    assert.equal((capabilities.structuredContent!.editors as unknown[]).length, 9);
    const created = CallToolResultSchema.parse(await client.callTool({ name: 'create_deck', arguments: { title: 'MCP integration' } }));
    const deck = created.structuredContent!.deck as DeckRecord;
    assert.equal(deck.title, 'MCP integration');
    const invalid = CallToolResultSchema.parse(await client.callTool({ name: 'propose_slide_changes', arguments: { deckId: deck.id, baseRevision: 1, summary: 'No arbitrary code', edits: [{ kind: 'eval', source: 'process.exit()' }] } }));
    assert.equal(invalid.isError, true);
    const resources = await client.listResources(); assert.equal(resources.resources[0].uri, resourceUri);
    const resource = await client.readResource({ uri: resourceUri });
    const html = 'text' in resource.contents[0] ? resource.contents[0].text : '';
    assert.ok(html.includes('OPEN EDITOR'));
    assert.ok(!/<script[^>]+src=/.test(html));
    assert.ok(!/<link[^>]+rel="stylesheet"/.test(html));
  } finally { await client.close(); await server.close(); await rm(directory, { recursive: true, force: true }); }
});
