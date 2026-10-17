import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { unzipSync } from 'fflate';

for (const kind of ['code', 'desktop']) test(`${kind} archive retains full fastdom notice and unresolved fontkit evidence`, async () => {
  const zip = kind === 'desktop' ? unzipSync(await readFile('release/editor-platform-claude-0.1.3.mcpb')) : undefined;
  const bytes = path => zip ? Buffer.from(zip[path]) : execFileSync('tar', ['-xOf', 'release/editor-platform-claude-code-0.1.3-linux-x64.tar.gz', './plugins/editor-platform/' + path]);
  const notices = JSON.parse(bytes('THIRD-PARTY-NOTICES.json'));
  for (const name of ['fastdom', '@pdf-lib/fontkit']) {
    const entry = notices.find(n => n.name === name); assert.ok(entry);
    const path = `licenses/npm/${name.replaceAll('/', '__')}@${entry.version}/README.md`;
    assert.deepEqual(bytes(path), await readFile(`node_modules/${name}/README.md`));
    const metadata = JSON.parse(bytes(path.replace('README.md', 'package.json')));
    assert.deepEqual(metadata, entry);
    if (name === 'fastdom') {
      assert.ok(entry.texts.includes('README.md'));
      assert.equal(entry.licenseEvidence.status, 'full-text-retained');
    } else {
      assert.ok(!entry.texts.includes('README.md'));
      assert.equal(entry.licenseEvidence.status, 'UNRESOLVED');
      assert.match(entry.licenseEvidence.reason, /not cleared for publication/);
    }
  }
});
