import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const safe = (path) => path && !path.startsWith('/') && !path.includes('\\') && !path.split('/').some((part) => !part || part === '.' || part === '..');

// read(path) reads one file relative to the plugin root. No code is executed.
export async function verifyPackageSource(read, expectedPin) {
  const manifest = await read('source/FILES.sha256');
  const info = JSON.parse(await read('build-info.json'));
  assert.equal(sha256(manifest), info.sourceManifestSha256, 'source manifest hash');
  const paths = new Set();
  for (const line of manifest.toString().trim().split('\n')) {
    const match = /^([a-f0-9]{64})  (.+)$/.exec(line);
    assert.ok(match && safe(match[2]), 'invalid source manifest entry');
    const [, hash, path] = match;
    assert.ok(!paths.has(path), `duplicate source path: ${path}`); paths.add(path);
    assert.equal(sha256(await read(`source/editor-platform-plugins/${path}`)), hash, `source hash: ${path}`);
  }
  assert.equal(paths.size, info.sourceFiles, 'source file count');
  assert.ok(paths.has('upstream.json'), 'missing source pin');
  const sourcePin = JSON.parse(await read('source/editor-platform-plugins/upstream.json'));
  assert.deepEqual(sourcePin, expectedPin, 'unexpected source upstream pin');
  assert.deepEqual(info.upstream, expectedPin, 'unexpected build upstream pin');
  const upstreamRoot = 'vendor/editor-platform/';
  const exportPath = upstreamRoot + '.open-editor-export.json';
  assert.ok(paths.has(exportPath), 'missing public export manifest');
  const exported = await read('source/editor-platform-plugins/' + exportPath);
  assert.equal(sha256(exported), expectedPin.manifestSha256, 'unexpected public export manifest');
  const exportManifest = JSON.parse(exported);
  for (const file of exportManifest.files) {
    assert.ok(safe(file.path), 'invalid public source path');
    const path = upstreamRoot + file.path;
    assert.ok(paths.has(path), `missing public source entry: ${path}`);
    assert.equal(sha256(await read('source/editor-platform-plugins/' + path)), file.sha256, `public source hash: ${path}`);
  }
  return { files: paths.size, publicFiles: exportManifest.files.length };
}
