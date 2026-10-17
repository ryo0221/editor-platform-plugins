import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { retainFontkitEmbeddedNotices } from '../scripts/fontkit-embedded-notices.mjs';

test('fontkit partial notices preserve exact source bytes; changed bundled code requires re-audit', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'fontkit-notices-'));
  try {
    const texts = [];
    const metadata = await retainFontkitEmbeddedNotices('node_modules/@pdf-lib/fontkit', temp, texts);
    assert.equal(metadata.status, 'PARTIAL');
    assert.equal(texts.length, 13);
    assert.equal(metadata.evidenceFiles.length, 6);
    assert.ok(metadata.evidenceFiles.every(file => !texts.includes(file.path)));
    assert.ok(texts.includes('embedded/buffer-5.6.0-LICENSE.txt'));
    assert.ok(texts.includes('embedded/harfbuzz-arabic-NOTICE.txt'));
    const manifest = JSON.parse(await readFile(join(temp, metadata.provenance)));
    const bundle = await readFile('node_modules/@pdf-lib/fontkit/dist/fontkit.es.js', 'utf8');
    for (const file of manifest.files) {
      const bytes = await readFile(join(temp, 'embedded', file.file));
      assert.equal(createHash('sha256').update(bytes).digest('hex'), file.sha256);
      assert.deepEqual(bytes, await readFile('licenses/fontkit-1.1.1/' + file.file));
      if (file.source.kind === 'verbatim-bundle-excerpt') {
        assert.ok(bundle.includes(bytes.toString().trimEnd()));
        const offset = bundle.indexOf(bytes.toString().trimEnd());
        assert.equal(bundle.slice(0, offset).split('\n').length, file.source.startLine);
      }
    }
    const changed = join(temp, 'changed');
    await mkdir(join(changed, 'dist'), { recursive: true });
    await writeFile(join(changed, 'dist', 'fontkit.es.js'), bundle + '\n// changed');
    await assert.rejects(retainFontkitEmbeddedNotices(changed, temp, []), /bundle changed/);
  } finally { await rm(temp, { recursive: true, force: true }); }
});
