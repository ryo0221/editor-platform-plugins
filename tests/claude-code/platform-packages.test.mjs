// Offline inspection only: never execute a packaged or extracted target binary.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { verifyPackageSource } from '../../scripts/verify-package-source.mjs';
import { installNodeDistribution, selectNodeDistribution, verifyNodeDistribution } from '../../scripts/claude-code-node.mjs';

const pins = JSON.parse(await readFile(new URL('../../scripts/claude-code-node-targets.json', import.meta.url)));
const expectedPin = JSON.parse(await readFile(new URL('../../upstream.json', import.meta.url)));
const version = JSON.parse(await readFile(new URL('../../package.json', import.meta.url))).version;
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
for (const target of Object.keys(pins)) {
  test(`${target}: official runtime, archive closure and wrong-target refusal (no target execution)`, async () => {
    assert.ok(process.env.EDITOR_NODE_ARCHIVE_DIR, 'Set EDITOR_NODE_ARCHIVE_DIR to existing official archives; no downloads are performed');
    const pin = selectNodeDistribution(target);
    const input = resolve(process.env.EDITOR_NODE_ARCHIVE_DIR, pin.filename);
    await verifyNodeDistribution(input, pin);
    const other = selectNodeDistribution(target === 'linux-x64' ? 'win32-x64' : 'linux-x64');
    const temp = await mkdtemp(join(tmpdir(), 'platform-inspection-'));
    try {
      const refused = join(temp, 'refused');
      await assert.rejects(installNodeDistribution(resolve(process.env.EDITOR_NODE_ARCHIVE_DIR, other.filename), refused, pin), /SHA-256 mismatch/);
      await assert.rejects(readdir(refused), { code: 'ENOENT' });
      const runtime = join(temp, 'runtime');
      await installNodeDistribution(input, runtime, pin);
      const executable = pin.platform === 'win32' ? 'node.exe' : 'node';
      assert.deepEqual((await readdir(runtime)).sort(), ['LICENSE', executable].sort());
      const archive = resolve('release', `editor-platform-claude-code-${version}-${target}.tar.gz`);
      const sidecar = (await readFile(`${archive}.sha256`, 'utf8')).trim();
      assert.equal(sidecar, `${digest(await readFile(archive))}  editor-platform-claude-code-${version}-${target}.tar.gz`);
      const entries = execFileSync('tar', ['-tzf', archive], { encoding: 'utf8' }).trim().split('\n');
      assert.equal(new Set(entries).size, entries.length);
      for (const entry of entries) {
        assert.ok(entry.startsWith('./') && !entry.includes('\\') && !entry.split('/').includes('..'), entry);
        assert.match(entry, /^\.\/(?:$|(?:INSTALL|CODEX)\.md$|\.claude-plugin\/(?:$|marketplace\.json$)|plugins\/(?:$|editor-platform\/(?:$|(?:LICENSE|INSTALL\.md|SECURITY\.md|SOURCE\.md|THIRD-PARTY-NOTICES\.json|build-info\.json|package\.json|\.mcpbignore|\.mcp\.json)$|(?:runtime|source|licenses|node_modules|server|ui|skills|\.claude-plugin)\/.*$|docs\/(?:$|codex(?:-shell)?\.md$))))/);
      }
      const types = execFileSync('tar', ['-tvzf', archive], { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 }).trim().split('\n');
      assert.ok(types.every((entry) => entry.startsWith('-') || entry.startsWith('d')), 'only regular files/directories are allowed');
      const extracted = join(temp, 'package');
      await (await import('node:fs/promises')).mkdir(extracted);
      execFileSync('tar', ['-xzf', archive, '-C', extracted]);
      await verifyPackageSource((path) => readFile(join(extracted, 'plugins/editor-platform', path)), expectedPin);
      const root = './plugins/editor-platform/';
      const bytes = (path) => execFileSync('tar', ['-xOf', archive, root + path], { maxBuffer: 150 * 1024 * 1024 });
      const entryGuide = await readFile(join(extracted, 'CODEX.md'), 'utf8');
      assert.match(entryGuide, /\(plugins\/editor-platform\/docs\/codex\.md\)/);
      assert.match(entryGuide, /Native CLI registration acceptance is NOT RUN/);
      assert.match(entryGuide, /plugins\/editor-platform\/docs\/codex-shell\.md/);
      assert.deepEqual(bytes('docs/codex.md'), await readFile(new URL('../../docs/codex.md', import.meta.url)));
      assert.deepEqual(bytes('docs/codex-shell.md'), await readFile(new URL('../../docs/codex-shell.md', import.meta.url)));
      // The shipped guide's relative security link must resolve within the package.
      assert.match(bytes('docs/codex.md').toString(), /\(\.\.\/SECURITY\.md\)/);
      assert.ok(bytes('SECURITY.md').length > 0);
      const info = JSON.parse(bytes('build-info.json'));
      assert.equal(digest(bytes('server/shell-client.mjs')), info.shellClientSha256);
      assert.deepEqual(info.nodeDistribution, pin);
      const record = JSON.parse(await readFile(`${archive}.acceptance-template.json`, 'utf8'));
      assert.equal(record.package.sha256, digest(await readFile(archive)));
      assert.equal(record.package.sourceCommit, info.sourceCommit);
      assert.equal(record.package.sourceDirty, info.sourceDirty);
      assert.equal(record.package.sourceManifestSha256, info.sourceManifestSha256);
      assert.equal(record.package.target, target);
      assert.ok([...record.scenarios, ...record.additionalChecks].every(row => row.result === 'NOT RUN'));
      assert.ok(Object.values(record.environment).every(value => value === null));
      assert.equal(`${info.platform}-${info.arch}`, target);
      if (info.reactPreviewSha256) assert.equal(digest(bytes('ui/react-preview.html')), info.reactPreviewSha256);
      const config = JSON.parse(bytes('.mcp.json')).mcpServers['editor-platform'];
      assert.equal(config.command, '${CLAUDE_PLUGIN_ROOT}/runtime/' + executable);
      assert.deepEqual(config.args, ['${CLAUDE_PLUGIN_ROOT}/server/code.mjs']);
      assert.deepEqual(entries.filter((e) => e.startsWith(root + 'runtime/') && !e.endsWith('/')).sort(), [root + 'runtime/LICENSE', root + 'runtime/' + executable].sort());
      for (const [file, key] of [[executable, 'nodeSha256'], ['LICENSE', 'nodeLicenseSha256']]) {
        const packaged = bytes('runtime/' + file);
        assert.deepEqual(packaged, await readFile(join(runtime, file)));
        assert.equal(digest(packaged), info[key]);
      }
      for (const [file, key] of [['ui/editor.html', 'uiSha256'], ['ui/browser.html', 'browserSha256'], ['node_modules/editor-platform-code-runtime/index.mjs', 'runtimeSha256'], ['source/FILES.sha256', 'sourceManifestSha256']]) {
        assert.equal(digest(bytes(file)), info[key]);
      }
    } finally { await rm(temp, { recursive: true, force: true }); }
  });
}
