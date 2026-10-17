import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { verifyPackageSource } from '../scripts/verify-package-source.mjs';
const hash = (value) => createHash('sha256').update(value).digest('hex');
function fixture() {
  const exported = JSON.stringify({ schema: 1, files: [{ path: 'model.ts', sha256: hash('public model') }] });
  const pin = { repository: 'https://github.com/ryo0221/open-editor-platform.git', commit: 'a'.repeat(40), tree: 'b'.repeat(40), manifestSha256: hash(exported) };
  const source = { 'upstream.json': JSON.stringify(pin), 'vendor/editor-platform/.open-editor-export.json': exported, 'vendor/editor-platform/model.ts': 'public model', 'src/host.ts': 'host code' };
  const files = Object.fromEntries(Object.entries(source).map(([p, v]) => ['source/editor-platform-plugins/' + p, Buffer.from(v)]));
  const manifest = Buffer.from(Object.entries(source).map(([p, v]) => `${hash(v)}  ${p}\n`).join(''));
  files['source/FILES.sha256'] = manifest;
  files['build-info.json'] = Buffer.from(JSON.stringify({ upstream: pin, sourceFiles: 4, sourceManifestSha256: hash(manifest) }));
  const read = async (path) => { assert.ok(files[path], `missing file: ${path}`); return files[path]; };
  return { files, read, pin };
}
test('package source verifies every byte and expected public pin', async () => {
  const f = fixture(); assert.deepEqual(await verifyPackageSource(f.read, f.pin), { files: 4, publicFiles: 1 });
});
for (const kind of ['missing', 'modified', 'wrong-pin', 'wrong-public-byte']) test(`package source rejects ${kind}`, async () => {
  const f = fixture();
  if (kind === 'missing') delete f.files['source/editor-platform-plugins/src/host.ts'];
  if (kind === 'modified') f.files['source/editor-platform-plugins/src/host.ts'] = Buffer.from('modified');
  if (kind === 'wrong-pin') f.pin = { ...f.pin, commit: 'c'.repeat(40) };
  if (kind === 'wrong-public-byte') {
    const path = 'source/editor-platform-plugins/vendor/editor-platform/model.ts';
    f.files[path] = Buffer.from('forged public model');
    const manifest = Buffer.from(f.files['source/FILES.sha256'].toString().replace(hash('public model'), hash('forged public model')));
    f.files['source/FILES.sha256'] = manifest;
    const info = JSON.parse(f.files['build-info.json']); info.sourceManifestSha256 = hash(manifest); f.files['build-info.json'] = Buffer.from(JSON.stringify(info));
  }
  await assert.rejects(verifyPackageSource(f.read, f.pin));
});
