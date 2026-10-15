import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { unzipSync } from 'fflate';
import { getMcpConfigForManifest } from '@anthropic-ai/mcpb/node';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { resourceUri } from '../../src/shared/contracts';

const root = fileURLToPath(new URL('../../', import.meta.url));
const manifestSource = JSON.parse(await readFile(join(root, 'desktop', 'manifest.json'), 'utf8'));
const archive = join(root, 'release', `editor-platform-claude-${manifestSource.version}.mcpb`);
const bytes = await readFile(archive);
const files = unzipSync(bytes);
const decode = (path: string) => new TextDecoder().decode(files[path]);
const digest = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const manifest = JSON.parse(decode('manifest.json'));
const build = JSON.parse(decode('build-info.json'));

test('MCPB has every runtime file, corresponding public source and matching checksums', async () => {
  assert.deepEqual(manifest, manifestSource);
  for (const path of ['server/index.mjs', 'ui/editor.html', 'node_modules/editor-platform-desktop-runtime/index.mjs',
    'node_modules/editor-platform-desktop-runtime/index.mjs.LEGAL.txt', 'LICENSE', 'INSTALL.md', 'SOURCE.md',
    'source/editor-platform-plugins/package-lock.json', 'source/editor-platform-plugins/tsconfig.json',
    'source/editor-platform-plugins/src/vendor-types.d.ts', 'source/editor-platform-plugins/.gitignore',
    'source/editor-platform-plugins/vendor/editor-platform/LICENSE', 'THIRD-PARTY-NOTICES.json']) {
    assert.ok(files[path]?.length, `Missing ${path}`);
  }
  for (const path of Object.keys(files)) {
    assert.ok(!isAbsolute(path) && !path.split('/').includes('..'), `Unsafe archive path ${path}`);
    assert.ok(!path.split('/').includes('.git'), `Git history included: ${path}`);
    assert.ok(!path.startsWith('data/') && !path.startsWith('work/') && !path.startsWith('test-results/'));
    assert.ok(!/\.node$/.test(path), `Platform-specific native dependency: ${path}`);
  }
  assert.equal(digest(files['ui/editor.html']), build.uiSha256);
  assert.equal(digest(files['node_modules/editor-platform-desktop-runtime/index.mjs']), build.runtimeSha256);
  assert.equal(digest(files['source/FILES.sha256']), build.sourceManifestSha256);
  const sourceLines = decode('source/FILES.sha256').trim().split('\n');
  assert.equal(sourceLines.length, build.sourceFiles);
  for (const line of sourceLines) {
    const [sha, path] = line.split('  ');
    const file = files[`source/editor-platform-plugins/${path}`];
    assert.ok(file, `Missing corresponding source ${path}`);
    assert.equal(digest(file), sha, `Source checksum mismatch: ${path}`);
  }
  const checksum = (await readFile(`${archive}.sha256`, 'utf8')).split('  ')[0];
  assert.equal(digest(bytes), checksum);
});

test('installed MCPB works offline, across relocation and restart, with no checkout or external node_modules', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'editor-mcpb-'));
  let installation = join(directory, 'インストール path with spaces');
  const working = join(directory, 'unrelated-cwd');
  const dataRoot = join(directory, 'local-app-data');
  await mkdir(working, { recursive: true });
  // Intentionally omit the source, license inventory and anything not needed to
  // execute: runtime must not accidentally resolve files from source/ or the repo.
  for (const [path, content] of Object.entries(files)) {
    if (!(path.startsWith('server/') || path.startsWith('ui/') || path.startsWith('node_modules/') || path === 'package.json')) continue;
    const destination = join(installation, path);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, content);
  }
  let client: Client | undefined;
  let errors = '';
  const connect = async () => {
    const config = await getMcpConfigForManifest({ manifest, extensionPath: installation,
      systemDirs: { HOME: directory }, userConfig: {}, pathSeparator: '/' });
    assert.ok(config && config.command === 'node');
    assert.equal(config.args?.length, 1);
    const transport = new StdioClientTransport({ command: process.env.EDITOR_TEST_NODE ?? process.execPath,
      args: config.args!, cwd: working, stderr: 'pipe',
      env: { HOME: directory, USERPROFILE: directory, LOCALAPPDATA: dataRoot, XDG_DATA_HOME: dataRoot,
        PATH: working, HTTP_PROXY: 'http://127.0.0.1:1', HTTPS_PROXY: 'http://127.0.0.1:1' },
    });
    transport.stderr?.on('data', (chunk) => { errors += chunk.toString(); });
    client = new Client({ name: 'desktop-package-test', version: '1' });
    await client.connect(transport);
    return client;
  };
  const invoke = async (name: string, args: Record<string, unknown>) => {
    const result = await client!.callTool({ name, arguments: args });
    assert.ok(!result.isError, JSON.stringify(result));
    return result.structuredContent as any;
  };
  try {
    await connect();
    assert.equal((await client!.listTools()).tools.length, 18);
    const capabilities = await invoke('list_editors', {});
    assert.equal(capabilities.editors.length, 9);
    const saved: { id: string; kind: string }[] = [];
    for (const { kind } of capabilities.editors) {
      const guide = await invoke('get_editor_guide', { kind });
      const result = await invoke('create_artifact', { kind, title: `Desktop 日本語 ${kind}`, content: guide.exampleContent });
      assert.deepEqual((result.artifact ?? result.deck).content, guide.exampleContent);
      saved.push({ id: (result.artifact ?? result.deck).id, kind });
    }
    const document = saved.find((item) => item.kind === 'document')!;
    const original = (await invoke('read_artifact', { artifactId: document.id })).artifact;
    const candidate = structuredClone(original.content);
    candidate.blocks[0].text = 'AI の変更案';
    const proposed = await invoke('propose_artifact_changes', {
      artifactId: document.id, baseRevision: original.revision,
      summary: 'Packaged proposal', content: candidate,
    });
    const proposal = proposed.artifact.proposals[0];
    assert.ok(proposal.id);
    assert.equal(proposed.artifact.revision, 1);
    await client!.close(); client = undefined;
    const relocated = join(directory, 'extension upgrade', '別の場所');
    await mkdir(dirname(relocated), { recursive: true });
    await rename(installation, relocated); installation = relocated;
    await connect();
    const retained = (await invoke('read_artifact', { artifactId: document.id })).artifact;
    assert.equal(retained.proposals[0].id, proposal.id);
    assert.deepEqual(retained.content, original.content);
    await invoke('reject_artifact_proposal', { artifactId: document.id, proposalId: proposal.id });
    const manual = structuredClone(retained.content);
    manual.blocks[0].text = '手動保存';
    const savedDocument = (await invoke('save_artifact_draft', {
      artifactId: document.id, baseRevision: 1, content: manual,
    })).artifact;
    assert.equal(savedDocument.revision, 2);
    const current = await invoke('propose_artifact_changes', {
      artifactId: document.id, baseRevision: 2, summary: 'Apply packaged proposal', content: candidate,
    });
    const applied = (await invoke('apply_artifact_proposal', {
      artifactId: document.id, proposalId: current.artifact.proposals[0].id,
    })).artifact;
    assert.equal(applied.revision, 3);
    assert.deepEqual(applied.content, candidate);
    const stale = await client!.callTool({ name: 'save_artifact_draft', arguments: {
      artifactId: document.id, baseRevision: 1, content: retained.content,
    } });
    assert.equal(stale.isError, true);
    for (const { id, kind } of saved) {
      const read = await invoke('read_artifact', { artifactId: id });
      assert.equal((read.artifact ?? read.deck).title, `Desktop 日本語 ${kind}`);
      const exported = await invoke('export_artifact', { artifactId: id });
      assert.deepEqual(JSON.parse(exported.nativeJson ?? exported.files[0].text), (read.artifact ?? read.deck).content);
    }
    const resources = (await client!.listResources()).resources;
    assert.ok(resources.some((resource) => resource.uri === resourceUri));
    const view = (await client!.readResource({ uri: resourceUri })).contents[0];
    assert.equal(view.mimeType, 'text/html;profile=mcp-app');
    assert.ok('text' in view && view.text.length > 1_000_000);
    assert.equal(digest(Buffer.from((view as { text: string }).text)), build.uiSha256);
    await client!.close(); client = undefined;
    await connect();
    const finalDocument = (await invoke('read_artifact', { artifactId: document.id })).artifact;
    assert.equal(finalDocument.revision, 3);
    assert.equal(finalDocument.content.blocks[0].text, 'AI の変更案');
    assert.equal(errors, '');
  } finally {
    await client?.close();
    await rm(directory, { recursive: true, force: true });
  }
});
