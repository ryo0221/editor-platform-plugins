import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm, symlink, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { channelPaths, connection, setup } from '../src/codex/setup.mjs';

const win = { platform: 'win32', arch: 'x64', home: 'C:\\Users\\日本語 user', env: { LOCALAPPDATA: 'C:\\Users\\日本語 user\\AppData\\Local' }, kernel: '' };
test('Windows app and WSL have separate native paths/data/server names; no shared configuration assumed', () => {
  const w = channelPaths('windows-app', win), c = connection(w);
  assert.equal(c.command, 'C:\\Users\\日本語 user\\AppData\\Local\\Programs\\EditorPlatform\\CodexApp\\runtime\\node.exe');
  assert.equal(c.env.EDITOR_DATA_DIR, 'C:\\Users\\日本語 user\\AppData\\Local\\EditorPlatform\\CodexApp');
  assert.ok(c.toml.includes(JSON.stringify(c.command)));
  const l = channelPaths('wsl-cli', { platform: 'linux', arch: 'x64', home: '/home/日本語 user', env: {}, kernel: 'microsoft-standard-WSL2' });
  assert.equal(connection(l).command, '/home/日本語 user/.local/share/EditorPlatform/installs/CodexWsl/runtime/node');
  assert.notEqual(w.name, l.name);
  assert.throws(() => channelPaths('wsl-cli', { ...win, platform: 'linux', env: {}, kernel: 'generic' }), /native WSL/);
  assert.throws(() => channelPaths('windows-app', { ...win, arch: 'arm64' }), /x64/);
});
async function fixture(fn) {
  const temp = await mkdtemp(join(tmpdir(), 'codex-setup-'));
  const source = join(temp, 'new package'), root = join(temp, 'installed with spaces'), dataDir = join(temp, 'data');
  const context = { platform: 'linux', arch: 'x64', home: temp, env: { WSL_DISTRO_NAME: 'fixture' }, kernel: '' };
  const info = { platform: 'linux', arch: 'x64', sourceDirty: false, sourceCommit: 'a'.repeat(40), version: '0.1.3' };
  for (const [name,key] of [['runtime/node','nodeSha256'],['runtime/LICENSE','nodeLicenseSha256'],['node_modules/editor-platform-code-runtime/index.mjs','runtimeSha256'],['ui/editor.html','uiSha256'],['ui/browser.html','browserSha256'],['ui/react-preview.html','reactPreviewSha256'],['server/shell-client.mjs','shellClientSha256'],['source/FILES.sha256','sourceManifestSha256'],['server/code.mjs'],['LICENSE'],['SOURCE.md'],['THIRD-PARTY-NOTICES.json']]) {
    await mkdir(join(source,name,'..'),{recursive:true}); await writeFile(join(source,name),name);
    if (key) info[key] = createHash('sha256').update(name).digest('hex');
  }
  await writeFile(join(source,'build-info.json'),JSON.stringify(info));
  const options = { channel: 'wsl-cli', source, root, dataDir, stopped: true };
  try { await fn({ temp, source, root, dataDir, context, options, info }); }
  finally { await rm(temp,{recursive:true,force:true}); }
}
test('plan has no filesystem effects; install/update retain stable connection and data; uninstall retains data and config', () => fixture(async ({temp,source,root,dataDir,context,options,info}) => {
  const config = join(temp,'config.toml');await writeFile(config,'# user settings\nmodel = "existing"\n');
  const plan = await setup('plan',options,context); assert.equal(plan.configModified,false); await assert.rejects(access(root));await assert.rejects(access(dataDir));
  const installed = await setup('install',options,context); await writeFile(join(dataDir,'saved.json'),'private fictional data');
  info.sourceCommit='b'.repeat(40);await writeFile(join(source,'build-info.json'),JSON.stringify(info));
  const updated=await setup('update',options,context);assert.deepEqual(updated.connection,installed.connection);
  assert.equal(JSON.parse(await readFile(join(root,'codex-install.json'))).sourceCommit,info.sourceCommit);
  assert.equal(JSON.parse(await readFile(join(updated.previousInstall,'codex-install.json'))).sourceCommit,'a'.repeat(40));
  await assert.rejects(setup('uninstall',options,context),/registration-removed/);
  await assert.rejects(setup('uninstall',{...options,source:root,registrationRemoved:true},context),/separate extracted/);
  await setup('uninstall',{...options,registrationRemoved:true},context);await assert.rejects(access(root));
  assert.equal(await readFile(join(dataDir,'saved.json'),'utf8'),'private fictional data');
  assert.equal(await readFile(config,'utf8'),'# user settings\nmodel = "existing"\n');
}));
test('unowned target, wrong channel/data, active or stale lock, and tampered source never replace installation', () => fixture(async ({root,dataDir,source,context,options}) => {
  await assert.rejects(setup('install',{...options,stopped:false},context),/Quit Codex/);
  await setup('install',options,context);
  await assert.rejects(setup('install',options,context),/already exists/);
  await assert.rejects(setup('update',{...options,dataDir:join(dataDir,'different')},context),/ownership/);
  const lock=join(dataDir,'.claude-code.lock');await writeFile(lock,'untrusted/stale');
  await assert.rejects(setup('update',options,context),/active or has a stale lock/);
  assert.equal(await readFile(lock,'utf8'),'untrusted/stale');await rm(lock);
  await writeFile(join(source,'runtime/node'),'modified');
  await assert.rejects(setup('update',options,context),/hash mismatch/);
  assert.equal(await readFile(join(root,'runtime/node'),'utf8'),'runtime/node');
}));
test('overlap, relative paths, symlinks and mismatched package platform are refused', () => fixture(async ({temp,source,root,context,options,info}) => {
  await assert.rejects(setup('plan',{...options,root:'relative'},context),/absolute/);
  await assert.rejects(setup('plan',{...options,dataDir:join(root,'data')},context),/separate/);
  await assert.rejects(setup('install',{...options,root:join(source,'nested')},context),/separate extracted/);
  const link=join(temp,'link');await symlink(source,link);
  await assert.rejects(setup('install',{...options,source:link},context),/Symlink/);
  info.platform='win32';await writeFile(join(source,'build-info.json'),JSON.stringify(info));
  await assert.rejects(setup('install',options,context),/matching x64/);
  await assert.rejects(access(root));
}));
