import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DeckStore } from '../src/server/decks';

async function fixture(run: (store: DeckStore, directory: string) => Promise<void>) {
  const directory = await mkdtemp(join(tmpdir(), 'editor-plugin-test-'));
  try { await run(new DeckStore(directory), directory); }
  finally { await rm(directory, { recursive: true, force: true }); }
}
test('native proposal preview does not mutate saved content; explicit apply persists after restart', () => fixture(async (store, path) => {
  const original = await store.create('戦略');
  const slide = original.content.slides[0], object = slide.objects[0];
  const proposed = await store.propose(original.id, 1, 'Change title', [{ kind: 'set_text', slideId: slide.id, objectId: object.id, text: 'New title' }]);
  assert.equal(proposed.content.slides[0].objects[0].text, '戦略');
  assert.equal(proposed.proposals[0].preview.slides[0].objects[0].text, 'New title');
  assert.equal(proposed.revision, 1);
  const applied = await store.decide(original.id, proposed.proposals[0].id, true);
  assert.equal(applied.revision, 2); assert.equal(applied.proposals.length, 0);
  assert.equal((await new DeckStore(path).read(original.id)).content.slides[0].objects[0].text, 'New title');
}));
test('concurrent saves accept exactly one writer and stale proposal cannot overwrite manual edits', () => fixture(async (store) => {
  const d = await store.create('Original'), s = d.content.slides[0];
  const proposed = await store.propose(d.id, 1, 'Old proposal', [{ kind: 'set_text', slideId: s.id, objectId: s.objects[0].id, text: 'Old' }]);
  const edited = structuredClone(d.content); edited.slides[0].objects[0].text = 'Human';
  const results = await Promise.allSettled([store.save(d.id, 1, edited), store.save(d.id, 1, d.content)]);
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
  await assert.rejects(store.decide(d.id, proposed.proposals[0].id, true), /deck has changed/);
  assert.equal((await store.read(d.id)).content.slides[0].objects[0].text, 'Human');
}));
test('reject leaves revision and canonical bytes intact', () => fixture(async (store) => {
  const d = await store.create('Original'), s = d.content.slides[0];
  const proposed = await store.propose(d.id, 1, 'Remove title', [{ kind: 'delete_object', slideId: s.id, objectId: s.objects[0].id }]);
  const rejected = await store.decide(d.id, proposed.proposals[0].id, false);
  assert.equal(rejected.revision, 1); assert.deepEqual(rejected.content, d.content); assert.deepEqual(rejected.proposals, []);
}));
test('invalid operation is atomic and duplicate IDs, locked objects, unknown selection and paths are rejected', () => fixture(async (store) => {
  const d = await store.create('Original'), s = d.content.slides[0];
  await assert.rejects(store.propose(d.id, 1, 'bad', [
    { kind: 'set_text', slideId: s.id, objectId: s.objects[0].id, text: 'Not committed' },
    { kind: 'delete_object', slideId: s.id, objectId: 'missing' },
  ]), /does not exist/);
  assert.equal((await store.read(d.id)).proposals.length, 0);
  const duplicate = structuredClone(d.content); duplicate.slides[0].objects[1].id = duplicate.slides[0].objects[0].id;
  await assert.rejects(store.save(d.id, 1, duplicate), /Invalid|unique/);
  const locked = structuredClone(d.content); locked.slides[0].objects[0].locked = true;
  await store.save(d.id, 1, locked);
  await assert.rejects(store.propose(d.id, 2, 'bad', [{ kind: 'set_text', slideId: s.id, objectId: s.objects[0].id, text: 'No' }]), /Unlock/);
  await assert.rejects(store.select(d.id, 2, ['missing']), /unknown/);
  await assert.rejects(store.read('../secrets'), /Invalid/);
}));
test('export uses exact saved native content and escaped SVG', () => fixture(async (store) => {
  const d = await store.create('<script>alert(1)</script>');
  const exported = await store.export(d.id);
  assert.deepEqual(JSON.parse(exported.nativeJson), d.content);
  assert.ok(exported.slides[0].svg.includes('&lt;script&gt;'));
  assert.ok(!exported.slides[0].svg.includes('<script>'));
}));
