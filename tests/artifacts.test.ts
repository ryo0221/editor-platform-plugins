import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ArtifactStore } from '../src/server/artifacts';
import { nativeAdapters, nativeIds, type ExtraKind } from '../src/shared/domains';
import { insertElement, type DesignContent } from '@editor-platform/design/model';
import { insertNode, type WhiteboardContent } from '@editor-platform/whiteboard/model';
import { addRow, type StructuredData } from '@editor-platform/structured-data/model';

function changed(kind: ExtraKind, input: unknown): unknown {
  const value = structuredClone(input) as any;
  if (kind === 'document') value.blocks[0].text = 'Edited document';
  if (kind === 'design') return insertElement('text').apply(value as DesignContent);
  if (kind === 'whiteboard') return insertNode('sticky').apply(value as WhiteboardContent);
  if (kind === 'data') return addRow().apply(value as StructuredData);
  if (kind === 'graph') value.nodes[0].attributes.name = 'Edited graph';
  if (kind === 'review') value.files[0].newText = 'Edited comparison';
  if (kind === 'file') value.name = 'renamed.txt';
  if (kind === 'react-ui') value.breakpoints.push({ id: 'desktop', minWidth: 1024 });
  return value;
}

for (const kind of Object.keys(nativeAdapters) as ExtraKind[]) {
  test(`${kind}: native create, save, preview/reject/apply, stale rejection, export and restart`, async () => {
    const dir = await mkdtemp(join(tmpdir(), `editor-${kind}-`));
    try {
      const store = new ArtifactStore(dir), record = await store.create(kind, `Test ${kind}`);
      assert.ok(nativeAdapters[kind].valid(record.content));
      assert.equal(record.kind, kind);
      const selected = [...nativeIds(record.content)].slice(0, 1);
      await store.select(record.id, 1, selected);
      const proposal = await store.propose(record.id, 1, 'Native candidate', structuredClone(record.content));
      assert.deepEqual(proposal.content, record.content);
      assert.equal(proposal.revision, 1);
      const rejected = await store.decide(record.id, proposal.proposals[0].id, false);
      assert.equal(rejected.revision, 1);
      assert.equal(rejected.proposals.length, 0);
      const candidate = changed(kind, record.content);
      assert.notDeepEqual(candidate, record.content);
      const next = await store.propose(record.id, 1, 'Accept native candidate', candidate);
      const applied = await store.decide(record.id, next.proposals[0].id, true);
      assert.equal(applied.revision, 2);
      assert.deepEqual(applied.content, candidate);
      const stale = await store.propose(record.id, 2, 'Will expire', record.content);
      await store.save(record.id, 2, candidate);
      await assert.rejects(store.decide(record.id, stale.proposals[0].id, true), /artifact has changed/);
      await assert.rejects(store.propose(record.id, 3, 'Wrong model', { schemaVersion: -1 }), /Invalid native/);
      const restored = await new ArtifactStore(dir).read(record.id);
      assert.equal(restored.revision, 3);
      assert.deepEqual(JSON.parse((await store.export(record.id)).files[0].text), candidate);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });
}
