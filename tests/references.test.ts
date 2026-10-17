import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { DeckStore } from '../src/server/decks';
import { createEditorServer } from '../src/server/mcp';
import { referenceService } from '../src/server/references';
import { ArtifactStore } from '../src/server/artifacts';
import { contentHash } from '@editor-platform/artifact-core';

test('Data/Graph fixed/follow closures, explicit capture, provenance, deletion and restart', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'plugin-references-'));
  const store = new DeckStore(directory);
  const server = createEditorServer(store);
  const client = new Client({ name: 'reference-tests', version: '1' });
  const [a, b] = InMemoryTransport.createLinkedPair();
  try {
    await server.connect(b); await client.connect(a);
    const call = async (name: string, args: Record<string, unknown>, error = false): Promise<any> => {
      const r = await client.callTool({ name, arguments: args }); assert.equal(!!r.isError, error, JSON.stringify(r)); return r.structuredContent;
    };
    const data = (await call('get_editor_guide', { kind: 'data' })).exampleContent;
    const source = (await call('create_artifact', { kind: 'data', title: 'Data source', content: data })).artifact;
    const spec = { artifactId: source.id, domain: 'data', target: { kind: 'table', viewId: 'default' } };
    await Promise.all([call('read_reference_source', { artifactId: source.id, domain: 'data' }), call('read_reference_source', { artifactId: source.id, domain: 'data' })]);
    // SDK 1.x normalizes schema.shape and strips undeclared target before the strict handler.
    const extra = await call('read_reference_source', spec);
    assert.equal(extra.snapshot.artifactId, source.id);
    const fixed = await call('create_reference', { source: spec, mode: 'fixed' });
    const follow = await call('create_reference', { source: spec, mode: 'follow' });
    const deck = (await call('create_deck', { title: 'Reference destination' })).deck;
    const content = structuredClone(deck.content);
    for (const [i, item] of [fixed, follow].entries()) content.slides[0].objects.push({ id: `embedded_${i}`, type: 'image', bounds: { x: 10, y: 10 + 150 * i, width: 400, height: 140 }, text: '', fill: '#ffffff', reference: item.reference, src: item.src });
    const proposed = (await call('propose_artifact_changes', { artifactId: deck.id, baseRevision: 1, summary: 'Embed saved Data', content })).deck;
    assert.deepEqual((await call('read_deck', { deckId: deck.id })).deck.content, deck.content);
    await call('apply_slide_proposal', { deckId: deck.id, proposalId: proposed.proposals[0].id });
    const unsaved = structuredClone(data); unsaved.rows[0].values.initiative = 'Unaccepted proposal';
    await call('propose_artifact_changes', { artifactId: source.id, baseRevision: 1, summary: 'Pending source', content: unsaved });
    assert.deepEqual((await call('read_reference_source', { artifactId: source.id, domain: 'data' })).snapshot.content, data);
    const next = structuredClone(data); next.rows[0].values.initiative = 'Changed committed source';
    await call('save_artifact_draft', { artifactId: source.id, baseRevision: 1, content: next });
    const saved = (await call('read_deck', { deckId: deck.id })).deck;
    assert.equal(saved.revision, 2); // Source update never rewrites destination or history.
    const exported = JSON.parse((await call('export_deck', { deckId: deck.id })).nativeJson);
    const refs = exported.slides[0].objects.filter((o: any) => o.reference);
    assert.equal(refs[0].reference.snapshot.revision, 1); assert.equal(refs[1].reference.snapshot.revision, 2);
    const tampered = structuredClone(content); const ref = tampered.slides[0].objects.at(-1).reference;
    ref.snapshot.content.rows[0].values.initiative = 'Forged version'; ref.snapshot.contentHash = await contentHash(ref.snapshot.content);
    await call('propose_artifact_changes', { artifactId: deck.id, baseRevision: 2, summary: 'Forged', content: tampered }, true);
    await call('save_slide_draft', { deckId: deck.id, baseRevision: 2, content: saved.content });
    const reopened = await new DeckStore(directory).read(deck.id);
    assert.equal(reopened.content.slides[0].objects.at(-1)!.reference!.snapshot.revision, 2);
    const restarted = referenceService(directory, new ArtifactStore(join(directory, 'artifacts')));
    assert.deepEqual(await restarted.capture(reopened.content, reopened.id), reopened.content);
    const graphGuide = await call('get_editor_guide', { kind: 'graph' });
    const graph = (await call('create_artifact', { kind: 'graph', title: 'Graph source', content: graphGuide.customGraph.content, profile: graphGuide.customGraph.profile })).artifact;
    const graphRef = await call('create_reference', { source: { artifactId: graph.id, domain: 'structured-graph', target: { kind: 'graph', viewId: graph.content.id } }, mode: 'follow' });
    assert.deepEqual(graphRef.reference.snapshot.dependencies[0].content, graph.profile);
    const missingTarget = structuredClone(spec); missingTarget.target.viewId = 'deleted-view';
    await call('create_reference', { source: missingTarget, mode: 'follow' }, true);
    await call('delete_artifact', { artifactId: source.id, baseRevision: 2 });
    await call('export_deck', { deckId: deck.id }, true); // No silent stale snapshot export.
  } finally { await client.close(); await server.close(); await rm(directory, { recursive: true, force: true }); }
});


test('reference listing crosses an empty filtered 1000-item page and terminates on empty inventory', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'reference-pages-'));
  const root = join(directory, 'artifacts');
  const service = referenceService(directory, new ArtifactStore(root));
  try {
    assert.deepEqual(await service.host.list(), []);
    await mkdir(root, { recursive: true });
    for (let start = 0; start < 1000; start += 100) await Promise.all(Array.from({ length: 100 }, (_, offset) => {
      const id = `artifact_0000${String(start + offset).padStart(6, '0')}`;
      return writeFile(join(root, `${id}.json`), JSON.stringify({ id, kind: 'document', title: 'Not a reference source', revision: 1, updatedAt: '2026-10-17' }));
    }));
    assert.deepEqual(await service.host.list(), []); // Full non-source page followed by empty page.
    const id = 'artifact_zzzz';
    await writeFile(join(root, `${id}.json`), JSON.stringify({ id, kind: 'data', title: 'Beyond page one', revision: 1, updatedAt: '2026-10-17', content: { schemaVersion: 2, columns: [], rows: [] } }));
    const listed = await service.host.list();
    assert.equal(listed.length, 2); // Default table and chart, exactly once.
    assert.ok(listed.every((option) => option.source.artifactId === id));
  } finally { await rm(directory, { recursive: true, force: true }); }
});
