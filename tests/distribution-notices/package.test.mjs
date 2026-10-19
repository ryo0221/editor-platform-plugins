import { createHash } from 'node:crypto';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { unzipSync } from 'fflate';

for (const kind of ['code', 'desktop']) test(`${kind} archive retains full fastdom notice and scoped fontkit notices`, async () => {
  const zip = kind === 'desktop' ? unzipSync(await readFile('release/editor-platform-claude-0.1.5.mcpb')) : undefined;
  const bytes = path => zip ? Buffer.from(zip[path]) : execFileSync('tar', ['-xOf', 'release/editor-platform-claude-code-0.1.5-linux-x64.tar.gz', './plugins/editor-platform/' + path]);
  const notices = JSON.parse(bytes('THIRD-PARTY-NOTICES.json'));
  const coverage = JSON.parse(await readFile('docs/license-audits/fontkit-closure-evidence.json'));
  for (const row of coverage.existingArchiveCoverage.filter(row => row.existingArchivePaths.length)) {
    assert.equal(createHash('sha256').update(bytes(row.existingArchivePaths[0])).digest('hex'), row.sha256);
  }
  const nodeCoverage = JSON.parse(await readFile('docs/license-audits/fontkit-polyfill-notice-coverage.json'));
  const combinedNotice = bytes(nodeCoverage.path);
  assert.equal(createHash('sha256').update(combinedNotice).digest('hex'), nodeCoverage.archiveNoticeSha256);
  const originalNotice = combinedNotice.subarray(nodeCoverage.sourceNoticeOffset, nodeCoverage.sourceNoticeOffset + nodeCoverage.sourceNoticeLength);
  assert.equal(createHash('sha256').update(originalNotice).digest('hex'), nodeCoverage.sourceNoticeSha256);
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
      assert.equal(entry.licenseEvidence.status, 'declared-license-and-notices-retained');
      assert.match(entry.licenseEvidence.reason, /not universal legal clearance or publication approval/);
      assert.equal(entry.embeddedNotices.status, 'IDENTIFIED-NOTICES-RETAINED');
      const base = `licenses/npm/${name.replaceAll('/', '__')}@${entry.version}/`;
      const provenance = bytes(base + entry.embeddedNotices.provenance);
      assert.deepEqual(provenance, await readFile('licenses/fontkit-1.1.1/PROVENANCE.json'));
      assert.equal(createHash('sha256').update(provenance).digest('hex'), entry.embeddedNotices.provenanceSha256);
      for (const file of entry.embeddedNotices.evidenceFiles) {
        assert.ok(!entry.texts.includes(file.path));
        assert.equal(createHash('sha256').update(bytes(base + file.path)).digest('hex'), file.sha256);
      }
      for (const file of entry.embeddedNotices.noticeFiles) {
        assert.ok(entry.texts.includes(file.path));
        assert.equal(createHash('sha256').update(bytes(base + file.path)).digest('hex'), file.sha256);
      }
    }
  }
});
