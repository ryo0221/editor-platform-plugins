// Channel-specific installation only. Never read/write Codex config or credentials.
import { cp, lstat, mkdir, open, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { homedir, release } from 'node:os';
import { createHash, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const receiptName = 'codex-install.json';
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
export function channelPaths(channel, context = { platform: process.platform, arch: process.arch, home: homedir(), env: process.env, kernel: release() }) {
  const { platform, arch, home, env, kernel } = context;
  if (arch !== 'x64') throw Error('This candidate requires x64.');
  if (channel === 'windows-app' && platform === 'win32') {
    const p = path.win32;
    if (!env.LOCALAPPDATA || !p.isAbsolute(env.LOCALAPPDATA)) throw Error('LOCALAPPDATA must be an absolute path.');
    return { platform, channel, name: 'editor-platform-windows', root: p.join(env.LOCALAPPDATA, 'Programs', 'EditorPlatform', 'CodexApp'), dataDir: p.join(env.LOCALAPPDATA, 'EditorPlatform', 'CodexApp'), configHint: p.join(home, '.codex', 'config.toml') };
  }
  if (channel === 'wsl-cli' && platform === 'linux' && (env.WSL_INTEROP || env.WSL_DISTRO_NAME || /microsoft|wsl/i.test(kernel))) {
    const base = env.XDG_DATA_HOME || path.posix.join(home, '.local', 'share');
    if (!path.posix.isAbsolute(base)) throw Error('XDG_DATA_HOME must be absolute.');
    return { platform, channel, name: 'editor-platform-wsl', root: path.posix.join(base, 'EditorPlatform', 'installs', 'CodexWsl'), dataDir: path.posix.join(base, 'EditorPlatform', 'CodexWsl'), configHint: path.posix.join(home, '.codex', 'config.toml') };
  }
  throw Error('Choose windows-app on native Windows x64 or wsl-cli inside WSL x64. Cloud Linux is not native WSL acceptance.');
}
export function connection(plan) {
  const p = plan.platform === 'win32' ? path.win32 : path.posix;
  const command = p.join(plan.root, 'runtime', plan.platform === 'win32' ? 'node.exe' : 'node');
  const args = [p.join(plan.root, 'server', 'code.mjs')];
  const env = { EDITOR_DATA_DIR: plan.dataDir };
  // JSON basic strings are also TOML basic strings for these filesystem paths.
  const toml = `[mcp_servers.${plan.name}]\ncommand = ${JSON.stringify(command)}\nargs = ${JSON.stringify(args)}\n\n[mcp_servers.${plan.name}.env]\nEDITOR_DATA_DIR = ${JSON.stringify(plan.dataDir)}\n`;
  return { name: plan.name, transport: 'stdio', command, args, env, toml };
}
async function exists(file) { try { await lstat(file); return true; } catch (e) { if (e.code === 'ENOENT') return false; throw e; } }
async function noLinks(file) {
  for (let current = path.resolve(file); ; current = path.dirname(current)) {
    if (await exists(current) && (await lstat(current)).isSymbolicLink()) throw Error('Symlink paths are not supported by setup.');
    if (path.dirname(current) === current) break;
  }
}
async function regularTree(root) {
  for (const name of await readdir(root)) {
    const file = path.join(root, name), s = await lstat(file);
    if (s.isDirectory()) await regularTree(file);
    else if (!s.isFile()) throw Error('Package must contain only regular files/directories.');
  }
}
const contains = (parent, child) => { const relative = path.relative(parent, child); return relative === '' || (!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative)); };
async function verifyBundle(source, platform) {
  await noLinks(source); await regularTree(source);
  const info = JSON.parse(await readFile(path.join(source, 'build-info.json'), 'utf8'));
  if (info.platform !== platform || info.arch !== 'x64' || info.sourceDirty || !/^[a-f0-9]{40}$/.test(info.sourceCommit)) throw Error('Expected a clean, matching x64 distribution.');
  for (const [file, key] of [[`runtime/${platform === 'win32' ? 'node.exe' : 'node'}`, 'nodeSha256'], ['runtime/LICENSE', 'nodeLicenseSha256'], ['node_modules/editor-platform-code-runtime/index.mjs', 'runtimeSha256'], ['ui/editor.html', 'uiSha256'], ['ui/browser.html', 'browserSha256'], ['ui/react-preview.html', 'reactPreviewSha256'], ['server/shell-client.mjs', 'shellClientSha256'], ['source/FILES.sha256', 'sourceManifestSha256']]) {
    if (digest(await readFile(path.join(source, file))) !== info[key]) throw Error(`Package hash mismatch: ${file}`);
  }
  for (const file of ['server/code.mjs', 'LICENSE', 'SOURCE.md', 'THIRD-PARTY-NOTICES.json']) await readFile(path.join(source, file));
  return info;
}
export async function setup(action, options, context) {
  if (!['plan', 'install', 'update', 'uninstall'].includes(action)) throw Error('Use plan, install, update or uninstall.');
  const defaults = channelPaths(options.channel, context);
  const root = options.root || defaults.root, dataDir = options.dataDir || defaults.dataDir;
  for (const file of [root, dataDir]) {
    if (!path.isAbsolute(file) || file === path.parse(file).root || /[\x00-\x1f]/.test(file)) throw Error('Use absolute non-root local paths without control characters.');
    await noLinks(file);
  }
  if (contains(root, dataDir) || contains(dataDir, root)) throw Error('Installation and data must be separate, non-nested directories.');
  const plan = { ...defaults, root, dataDir };
  const result = { action, ...plan, connection: connection(plan), configModified: false, dataDeleted: false };
  if (action === 'plan') return result;
  if (!options.stopped) throw Error('Quit Codex and Editor first, then supply --stopped.');
  let previous;
  if (action === 'install') {
    if (await exists(root)) throw Error('Install destination already exists; refusing to overwrite.');
  } else {
    previous = JSON.parse(await readFile(path.join(root, receiptName), 'utf8'));
    if (previous.schema !== 1 || previous.channel !== options.channel || previous.root !== root || previous.dataDir !== dataDir) throw Error('Installation ownership/path mismatch; no changes made.');
  }
  if (action === 'uninstall' && !options.registrationRemoved) throw Error('Remove only this connection from Codex first, then supply --registration-removed.');
  const source = path.resolve(options.source);
  if (contains(root, source) || contains(source, root) || contains(source, dataDir) || contains(dataDir, source)) throw Error('Run setup from a separate extracted candidate, outside installation and data.');
  let info;
  if (action !== 'uninstall') {
    info = await verifyBundle(source, defaults.platform);
  }
  await mkdir(dataDir, { recursive: true, mode: 0o700 });
  const lockPath = path.join(dataDir, '.claude-code.lock');
  // Use the existing runtime's lock, including during replacement. Never remove a pre-existing lock.
  const lock = await open(lockPath, 'wx', 0o600).catch(e => { if (e.code === 'EEXIST') throw Error('Workspace is active or has a stale lock. Close sessions and follow documented recovery; setup will not remove it.'); throw e; });
  let stage, backup;
  try {
    await lock.writeFile(String(process.pid)); await lock.close();
    if (action === 'uninstall') {
      await rm(root, { recursive: true });
      return { ...result, retainedData: dataDir };
    }
    await mkdir(path.dirname(root), { recursive: true });
    stage = root + '.staging-' + randomUUID();
    await cp(source, stage, { recursive: true, errorOnExist: true, force: false });
    await verifyBundle(stage, defaults.platform);
    await writeFile(path.join(stage, receiptName), JSON.stringify({ schema: 1, channel: options.channel, root, dataDir, sourceCommit: info.sourceCommit, version: info.version }, null, 2) + '\n', { mode: 0o600 });
    // Stable absolute MCP paths survive updates. The previous installation remains a recovery copy.
    if (action === 'update') { backup = root + '.previous-' + randomUUID(); await rename(root, backup); }
    try { await rename(stage, root); stage = undefined; }
    catch (e) { if (backup) { await rename(backup, root); backup = undefined; } throw e; }
    return { ...result, sourceCommit: info.sourceCommit, version: info.version, previousInstall: backup || null };
  } finally {
    await lock.close().catch(() => {});
    if (stage) await rm(stage, { recursive: true, force: true });
    await rm(lockPath);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    if (args.includes('--help') || !args.length) {
      console.log('Codex setup: plan|install|update|uninstall --channel windows-app|wsl-cli [--root ABS] [--data-dir ABS] [--stopped] [--registration-removed]');
      console.log('Uses this extracted package. Never changes Codex configuration or authentication. Verify archive checksum before use.');
    } else {
      const action = args.shift(), options = { source: fileURLToPath(new URL('../', import.meta.url)) };
      while (args.length) {
        const flag = args.shift();
        if (flag === '--stopped') options.stopped = true;
        else if (flag === '--registration-removed') options.registrationRemoved = true;
        else if (['--channel', '--root', '--data-dir'].includes(flag) && args.length) options[flag === '--data-dir' ? 'dataDir' : flag.slice(2)] = args.shift();
        else throw Error('Unknown or incomplete setup option.');
      }
      console.log(JSON.stringify(await setup(action, options), null, 2));
    }
  } catch (e) { console.error('Codex setup:', e.message); process.exitCode = 1; }
}
