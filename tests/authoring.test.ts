import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { DeckStore } from '../src/server/decks';
import { createEditorServer } from '../src/server/mcp';
import { getEditorGuide } from '../src/server/authoring';
import { artifactKinds } from '../src/shared/domains';
import type { SlideContent } from '@editor-platform/slide/model';

test('model receives authoring guidance and can create every domain from rich native examples', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'editor-authoring-'));
  const server = createEditorServer(new DeckStore(directory));
  const client = new Client({ name: 'authoring-test', version: '1' });
  const [a, b] = InMemoryTransport.createLinkedPair();
  try {
    await server.connect(b); await client.connect(a);
    assert.ok(client.getInstructions()?.includes('get_editor_guide'));
    assert.ok(client.getInstructions()?.includes('title/body-only'));
    for (const kind of artifactKinds) {
      const reply = await client.callTool({ name: 'get_editor_guide', arguments: { kind } });
      assert.ok(!reply.isError);
      const guide = reply.structuredContent as any;
      assert.ok(guide.nativeModel.length);
      const created = await client.callTool({ name: 'create_artifact', arguments: { kind, title: `Native ${kind}`, content: guide.exampleContent } });
      assert.ok(!created.isError, `${kind}: ${JSON.stringify(created)}`);
      const record = (created.structuredContent as any).artifact ?? (created.structuredContent as any).deck;
      assert.deepEqual(record.content, guide.exampleContent, `${kind} native content must not be flattened`);
      if (kind === 'react-ui') assert.match(guide.limitation, /bundled implementations/);
      if (kind === 'data') assert.equal(record.content.views[0].projection, 'Chart');
    }
    const content = getEditorGuide('slide').exampleContent;
    const designed = await client.callTool({ name: 'create_deck', arguments: { title: 'Designed', content } });
    assert.ok(!designed.isError, JSON.stringify(designed));
    const deck = (designed.structuredContent as any).deck;
    assert.deepEqual(deck.content, content);
    const ambiguous = await client.callTool({ name: 'create_deck', arguments: { title: 'Ambiguous', content, slides: [{ title: 'Legacy' }] } });
    assert.equal(ambiguous.isError, true);
  } finally { await client.close(); await server.close(); await rm(directory, { recursive: true, force: true }); }
});

test('rich Slide candidates preview, reject/apply, retain geometry/style/data and reject stale proposals', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'editor-native-slide-'));
  const store = new DeckStore(directory);
  try {
    const content = getEditorGuide('slide').exampleContent as SlideContent;
    const created = await store.create('Native strategy', undefined, content);
    assert.deepEqual(new Set(created.content.slides[0].objects.map((o) => o.type)), new Set(['text', 'shape', 'image', 'chart', 'table']));
    const candidate = structuredClone(created.content);
    const chart = candidate.slides[0].objects.find((o) => o.chart)!;
    chart.chart!.values = [20, 65, 15]; chart.bounds.x += 12;
    candidate.slides[0].background = '#f4f7f5';
    const first = await store.proposeNative(created.id, 1, 'Change designed content', candidate);
    assert.deepEqual(first.content, content);
    assert.deepEqual(first.proposals[0].preview, candidate);
    await store.decide(created.id, first.proposals[0].id, false);
    assert.deepEqual((await store.read(created.id)).content, content);
    const pending = await store.proposeNative(created.id, 1, 'Apply', candidate);
    const accepted = await store.decide(created.id, pending.proposals[0].id, true);
    assert.deepEqual(accepted.content, candidate);
    assert.deepEqual((await new DeckStore(directory).read(created.id)).content, candidate);
    const exported = await store.export(created.id);
    assert.deepEqual(JSON.parse(exported.nativeJson), candidate);
    assert.match(exported.slides[0].svg, /<image/);
    assert.match(exported.slides[0].svg, /投資比率/);
    const stale = await store.proposeNative(created.id, 2, 'Old revision', content);
    await store.save(created.id, 2, candidate);
    await assert.rejects(store.decide(created.id, stale.proposals[0].id, true), /deck has changed/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('native Slide candidate cannot bypass a locked group or remove its locked children', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'editor-native-lock-'));
  const store = new DeckStore(directory);
  try {
    const content = getEditorGuide('slide').exampleContent as SlideContent;
    content.slides[0].objects.push({ id: 'locked_group', type: 'group', text: '', fill: '#ffffff', locked: true, bounds: { x: 0, y: 0, width: 960, height: 110 } });
    content.slides[0].objects[0].groupId = 'locked_group';
    const created = await store.create('Locked strategy', undefined, content);
    const changed = structuredClone(content); changed.slides[0].objects[0].fill = '#ff0000';
    await assert.rejects(store.proposeNative(created.id, 1, 'Modify locked descendant', changed), /Unlock/);
    const removed = structuredClone(content); removed.slides[0].objects.shift();
    await assert.rejects(store.proposeNative(created.id, 1, 'Remove locked descendant', removed), /Unlock/);
    assert.equal((await store.read(created.id)).proposals.length, 0);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
