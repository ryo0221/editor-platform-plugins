import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { createAcceptanceRecord, writeAcceptanceTemplate } from '../scripts/acceptance-record.mjs';

const info = { version: '0.1.5', sourceCommit: 'a'.repeat(40), sourceDirty: false,
  upstream: { commit: 'b'.repeat(40) }, sourceManifestSha256: 'c'.repeat(64), platform: 'win32', arch: 'x64' };

test('record hashes exact archive, preserves dirty provenance, never promotes cross-packaging to host acceptance', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'private-user-path-'));
  try {
    const archive = join(temp, 'candidate.tar.gz'); const bytes = Buffer.from('opaque archive fixture');
    await writeFile(archive, bytes);
    for (const sourceDirty of [true, false]) {
      const record = await writeAcceptanceTemplate(archive, { ...info, sourceDirty, unrelatedSecret: 'not-to-be-recorded' });
      assert.equal(record.package.sha256, createHash('sha256').update(bytes).digest('hex'));
      assert.equal(record.package.bytes, bytes.length); assert.equal(record.package.filename, 'candidate.tar.gz');
      assert.equal(record.package.sourceDirty, sourceDirty); assert.equal(record.package.target, 'win32-x64');
      assert.deepEqual(record.scenarios.map(row => row.id), ['C1','C2','C3','C4','C5','C6','C7']);
      assert.ok([...record.scenarios, ...record.additionalChecks].every(row => row.result === 'NOT RUN' && row.evidence === null));
      assert.ok(Object.values(record.environment).every(value => value === null));
      assert.equal(record.release.decision, 'NOT APPROVED'); assert.equal(record.release.acceptedMinimumHostVersion, null);
      const output = await readFile(`${archive}.acceptance-template.json`, 'utf8');
      assert.ok(!output.includes(temp)); assert.ok(!output.includes('not-to-be-recorded'));
      assert.deepEqual(JSON.parse(output), record);
    }
    await writeFile(archive, 'replacement');
    assert.notEqual((await createAcceptanceRecord(archive, info)).package.sha256, createHash('sha256').update(bytes).digest('hex'));
  } finally { await rm(temp, { recursive: true, force: true }); }
});

test('missing or malformed provenance cannot produce a plausible acceptance record', async () => {
  for (const patch of [{sourceCommit: undefined}, {sourceDirty: undefined}, {upstream: {}}, {sourceManifestSha256: 'invalid'}, {platform: 'unknown'}, {version: '../secret'}]) {
    await assert.rejects(createAcceptanceRecord('/not-read', { ...info, ...patch }), /Incomplete package provenance/);
  }
  await assert.rejects(createAcceptanceRecord('/does-not-exist', info), { code: 'ENOENT' });
});
