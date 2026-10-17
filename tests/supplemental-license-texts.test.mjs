import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { supplementLicenseTexts } from '../scripts/supplemental-license-texts.mjs';

test('retain official fastdom README verbatim, without treating fontkit generic link as full text', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'license-evidence-'));
  try {
    for (const name of ['fastdom', '@pdf-lib/fontkit']) {
      const source = join('node_modules', name);
      const pkg = JSON.parse(await readFile(join(source, 'package.json')));
      const texts = [];
      const { licenseEvidence } = await supplementLicenseTexts(pkg, source, dir, texts);
      assert.deepEqual(await readFile(join(dir, 'README.md')), await readFile(join(source, 'README.md')));
      if (name === 'fastdom') {
        assert.deepEqual(texts, ['README.md']);
        assert.equal(licenseEvidence.status, 'full-text-retained');
        assert.match(await readFile(join(dir, 'README.md'), 'utf8'), /Copyright \(c\) 2016 Wilson Page/);
      } else {
        assert.deepEqual(texts, []);
        assert.equal(licenseEvidence.status, 'UNRESOLVED');
      }
      await assert.rejects(supplementLicenseTexts({ ...pkg, version: '999.0.0' }, source, dir, []), /Re-audit/);
    }
    await writeFile(join(dir, 'README.md'), 'Changed license text');
    await assert.rejects(supplementLicenseTexts({ name: 'fastdom', version: '1.0.12' }, dir, dir, []), /evidence changed/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
