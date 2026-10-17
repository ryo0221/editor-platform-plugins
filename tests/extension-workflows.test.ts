import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { DeckStore } from '../src/server/decks';
import { ArtifactStore } from '../src/server/artifacts';
import { createEditorServer } from '../src/server/mcp';
import { getEditorGuide } from '../src/server/authoring';
import { artifactKinds } from '../src/shared/domains';

async function harness(run: (call: (name: string, args: Record<string, unknown>, error?: boolean) => Promise<any>, client: Client, directory: string) => Promise<void>) {
  const directory = await mkdtemp(join(tmpdir(), 'editor-workflows-'));
  const server = createEditorServer(new DeckStore(directory));
  const client = new Client({ name: 'workflow-test', version: '1' });
  const [a, b] = InMemoryTransport.createLinkedPair();
  try {
    await server.connect(b); await client.connect(a);
    const call = async (name: string, args: Record<string, unknown>, error = false) => {
      const r = await client.callTool({ name, arguments: args });
      assert.equal(!!r.isError, error, JSON.stringify(r)); return r.structuredContent as any;
    };
    await run(call, client, directory);
  } finally { await client.close(); await server.close(); await rm(directory, { recursive: true, force: true }); }
}

test('discovered Slide contract and all published edit examples work; full-content proposals handle chart/table changes', async () => harness(async (call, client) => {
  const guide = await call('get_editor_guide', { kind: 'slide' });
  assert.deepEqual(guide.capabilities.crossArtifactEmbedding.destinations, ['slide']);
  assert.match(client.getInstructions()!, /static snapshots/);
  const tools = (await client.listTools()).tools;
  const schema = tools.find((t) => t.name === 'propose_slide_changes')!.inputSchema;
  assert.ok(schema.properties?.content && schema.properties?.edits);
  assert.ok(guide.slideEditJsonSchema && guide.contentJsonSchema);
  const deck = (await call('create_deck', { title: 'Slide edit contract', content: guide.exampleContent })).deck;
  for (const edit of guide.slideEditExamples) {
    const proposed = (await call('propose_slide_changes', { deckId: deck.id, baseRevision: 1, summary: edit.kind, edits: [edit] })).deck;
    assert.deepEqual(proposed.content, deck.content);
    assert.notDeepEqual(proposed.proposals[0].preview, deck.content);
    await call('reject_slide_proposal', { deckId: deck.id, proposalId: proposed.proposals[0].id });
  }
  const args = { ...guide.proposalExample.arguments, deckId: deck.id };
  const example = (await call(guide.proposalExample.tool, args)).deck;
  await call('reject_slide_proposal', { deckId: deck.id, proposalId: example.proposals[0].id });
  await call('propose_slide_changes', { ...args, content: deck.content }, true);
  await call('propose_slide_changes', { deckId: deck.id, baseRevision: 1, summary: 'Missing changes' }, true);
  await call('propose_slide_changes', { ...args, edits: [{ op: 'replace', path: '/slides/0', value: {} }] }, true);
  const content = structuredClone(deck.content);
  content.slides[0].objects.find((o: any) => o.chart).chart.values = [15, 65, 20];
  content.slides[0].objects.find((o: any) => o.table).table.rows[1][1] = '65%';
  const native = (await call('propose_slide_changes', { deckId: deck.id, baseRevision: 1, summary: 'Chart and table', content })).deck;
  const applied = (await call('apply_slide_proposal', { deckId: deck.id, proposalId: native.proposals[0].id })).deck;
  assert.deepEqual(applied.content, content);
  await call('propose_slide_changes', { deckId: deck.id, baseRevision: 1, summary: 'Stale', content }, true);
  const generic = (await call('propose_artifact_changes', { artifactId: deck.id, baseRevision: 2, summary: 'Generic fallback', content: deck.content })).deck;
  assert.deepEqual(generic.proposals[0].preview, deck.content);
}));

test('custom Graph Profile is validated, retained, rendered contract-ready and guards all candidate/save/apply boundaries', async () => harness(async (call, _client, directory) => {
  const guide = await call('get_editor_guide', { kind: 'graph' });
  const { profile, content } = guide.customGraph;
  const create = guide.customCreateExample;
  const artifact = (await call(create.tool, create.arguments)).artifact;
  assert.deepEqual(artifact.profile, profile);
  assert.deepEqual((await new ArtifactStore(join(directory, 'artifacts')).read(artifact.id)).profile, profile);
  const exported = await call('export_artifact', { artifactId: artifact.id });
  assert.deepEqual(JSON.parse(exported.files[1].text), { graph: content, profile });
  await call('create_artifact', { kind: 'graph', title: 'Missing Profile', content }, true);
  await call('create_artifact', { ...create.arguments, profile: { ...profile, version: 2 } }, true);
  await call('create_artifact', { ...create.arguments, profile: { ...profile, nodes: {} } }, true);
  await call('create_artifact', { kind: 'document', title: 'Not Graph', profile }, true);
  const candidate = structuredClone(content); candidate.nodes[0].attributes.name = '更新した入力元';
  const proposal = (await call('propose_artifact_changes', { artifactId: artifact.id, baseRevision: 1, summary: 'Rename source', content: candidate })).artifact.proposals[0];
  assert.deepEqual((await call('read_artifact', { artifactId: artifact.id })).artifact.content, content);
  const applied = (await call('apply_artifact_proposal', { artifactId: artifact.id, proposalId: proposal.id })).artifact;
  assert.deepEqual(applied.content, candidate); assert.deepEqual(applied.profile, profile);
  const saved = (await call('save_artifact_draft', { artifactId: artifact.id, baseRevision: 2, content: candidate })).artifact;
  assert.deepEqual(saved.profile, profile);
  const mismatched = structuredClone(candidate); mismatched.profile.version++;
  await call('propose_artifact_changes', { artifactId: artifact.id, baseRevision: 3, summary: 'Wrong pin', content: mismatched }, true);
  const invalid = structuredClone(candidate); invalid.edges[0].to = 'operator';
  await call('save_artifact_draft', { artifactId: artifact.id, baseRevision: 3, content: invalid }, true);
  const protectedProfile = structuredClone(profile); protectedProfile.nodes.input.schema.name.readOnly = true;
  const protectedGraph = (await call('create_artifact', { kind: 'graph', title: 'Read only field', content, profile: protectedProfile })).artifact;
  await call('save_artifact_draft', { artifactId: protectedGraph.id, baseRevision: 1, content: candidate }, true);
  await call('propose_artifact_changes', { artifactId: protectedGraph.id, baseRevision: 1, summary: 'Protected', content: candidate }, true);
  // Legacy 0.1.2 records have no owned Profile. They still use relations without migration.
  const legacy = (await call('create_artifact', { kind: 'graph', title: 'Legacy' })).artifact;
  delete legacy.profile;
  await writeFile(join(directory, 'artifacts', `${legacy.id}.json`), JSON.stringify(legacy));
  await call('save_artifact_draft', { artifactId: legacy.id, baseRevision: 1, content: legacy.content });
}));

test('all nine domains have paginated discovery and revision-safe recoverable deletion across restarts', async () => harness(async (call, _client, directory) => {
  const created = [];
  for (const kind of artifactKinds) {
    const result = await call('create_artifact', { kind, title: `Recover ${kind}`, content: getEditorGuide(kind).exampleContent });
    created.push(result.deck ?? result.artifact);
  }
  const collected: string[] = []; let cursor: string | undefined;
  do {
    const page = await call('list_artifacts', { state: 'active', limit: 2, ...(cursor ? { cursor } : {}) });
    collected.push(...page.artifacts.map((a: any) => a.id)); cursor = page.nextCursor;
    assert.ok(page.artifacts.every((a: any) => !('content' in a)));
  } while (cursor);
  assert.equal(new Set(collected).size, 9); assert.equal(collected.length, 9);
  for (const record of created) {
    await call('propose_artifact_changes', { artifactId: record.id, baseRevision: 1, summary: 'Pending before delete', content: record.content });
    await call('delete_artifact', { artifactId: record.id, baseRevision: 999 }, true);
    const deletedReply = await call('delete_artifact', { artifactId: record.id, baseRevision: 1 });
    const deleted = deletedReply.artifact ?? deletedReply.deck;
    assert.ok(deleted.deletedAt); assert.equal(deleted.revision, 2);
    const store = record.id.startsWith('deck_') ? new DeckStore(directory) : new ArtifactStore(join(directory, 'artifacts'));
    assert.deepEqual((await store.read(record.id)).content, record.content);
    assert.ok((await store.read(record.id)).deletedAt);
    await call('propose_artifact_changes', { artifactId: record.id, baseRevision: 2, summary: 'Deleted write', content: record.content }, true);
    await call(record.id.startsWith('deck_') ? 'save_slide_draft' : 'save_artifact_draft', { [record.id.startsWith('deck_') ? 'deckId' : 'artifactId']: record.id, baseRevision: 2, content: record.content }, true);
    await call('restore_artifact', { artifactId: record.id, baseRevision: 1 }, true);
    const restoredReply = await call('restore_artifact', { artifactId: record.id, baseRevision: 2 });
    const restored = restoredReply.artifact ?? restoredReply.deck;
    assert.ok(!restored.deletedAt); assert.equal(restored.revision, 3);
    assert.deepEqual(restored.content, record.content);
    await call(record.id.startsWith('deck_') ? 'apply_slide_proposal' : 'apply_artifact_proposal', { [record.id.startsWith('deck_') ? 'deckId' : 'artifactId']: record.id, proposalId: restored.proposals[0].id }, true);
    await call('delete_artifact', { artifactId: record.id, baseRevision: 3 });
  }
  assert.equal((await call('list_artifacts', { state: 'active' })).artifacts.length, 0);
  assert.equal((await call('list_artifacts', { state: 'deleted' })).artifacts.length, 9);
}));
