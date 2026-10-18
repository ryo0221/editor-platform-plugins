import { build } from 'esbuild';
import { supplementLicenseTexts } from './supplemental-license-texts.mjs';
import { writeAcceptanceTemplate } from './acceptance-record.mjs';
import { installNodeDistribution, verifyNodeDistribution, selectNodeDistribution } from './claude-code-node.mjs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { createRequire, isBuiltin } from 'node:module';
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);
const code = process.argv.includes('--code');
const nodeDistribution = selectNodeDistribution(process.env.EDITOR_PACKAGE_TARGET);
const nodeExecutable = nodeDistribution.platform === 'win32' ? 'node.exe' : 'node';
const stage = join(root, 'work', code ? 'claude-code-bundle/plugins/editor-platform' : 'claude-desktop-bundle');
const outputDirectory = join(root, 'release');
const manifest = JSON.parse(await readFile(join(root, 'desktop', 'manifest.json'), 'utf8'));
const output = join(outputDirectory, code ? `editor-platform-claude-code-${manifest.version}-${nodeDistribution.platform}-${nodeDistribution.arch}.tar.gz` : `editor-platform-claude-${manifest.version}.mcpb`);
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');

function run(command, args, cwd = root) {
  const result = spawnSync(command, args, { cwd, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw Error(`${command} failed (${result.status}).`);
}
function gitFiles(directory) {
  const result = spawnSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { cwd: directory, encoding: 'utf8' });
  if (result.status !== 0) throw Error('A public-source checkout with Git and the initialized submodule is required.');
  return [...new Set(result.stdout.split('\0').filter(Boolean))].sort();
}
function sourceProvenance() {
  const commit = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' });
  const status = spawnSync('git', ['status', '--porcelain=v1', '--untracked-files=normal'], { cwd: root, encoding: 'utf8' });
  if (commit.status !== 0 || status.status !== 0 || !/^[a-f0-9]{40}$/.test(commit.stdout.trim())) throw Error('Cannot record source provenance.');
  return { sourceCommit: commit.stdout.trim(), sourceDirty: status.stdout.trim().length > 0 };
}
const provenance = sourceProvenance();
async function copyFile(source, destination) {
  await mkdir(dirname(destination), { recursive: true });
  await cp(source, destination);
}

// Only the maintainer runs npm. Installation and startup never use npm or Git.
if (code) {
  await verifyNodeDistribution(process.env.EDITOR_NODE_ARCHIVE, nodeDistribution);
}
if (!process.env.npm_execpath) throw Error('Run this packager using npm run package:claude.');
run(process.execPath, [process.env.npm_execpath, 'run', 'build']);
await rm(stage, { recursive: true, force: true });
await mkdir(stage, { recursive: true });
await mkdir(outputDirectory, { recursive: true });
if (!code) await copyFile(join(root, 'desktop', 'manifest.json'), join(stage, 'manifest.json'));
if (!code) await copyFile(join(root, 'desktop', 'index.mjs'), join(stage, 'server', 'index.mjs'));
await copyFile(join(root, 'dist', 'editor.html'), join(stage, 'ui', 'editor.html'));
await copyFile(join(root, 'LICENSE'), join(stage, 'LICENSE'));
await copyFile(join(root, 'docs', code ? 'claude-code.md' : 'claude-desktop.md'), join(stage, 'INSTALL.md'));
await copyFile(join(root, 'SECURITY.md'), join(stage, 'SECURITY.md'));
await writeFile(join(stage, 'package.json'), JSON.stringify({
  name: code ? 'editor-platform-claude-code' : 'editor-platform-desktop', version: manifest.version, private: true,
  type: 'module', license: 'AGPL-3.0-only', engines: { node: '>=20.19.0' },
}, null, 2) + '\n');
// The CLI normally drops lockfiles, declarations and tsconfig files. Retain
// every file in the corresponding-source snapshot so it can be rebuilt.
await writeFile(join(stage, '.mcpbignore'), '!source/**\n');

// Compile public editor model code and all server dependencies into one portable
// package. No platform-specific native modules or runtime package downloads.
const runtimePackage = code ? 'editor-platform-code-runtime' : 'editor-platform-desktop-runtime';
const runtimeDirectory = join(stage, 'node_modules', runtimePackage);
await mkdir(runtimeDirectory, { recursive: true });
const compiled = await build({
  absWorkingDir: root,
  entryPoints: [code ? 'src/claude-code/runtime.ts' : 'src/desktop/runtime.ts'],
  outfile: join(runtimeDirectory, 'index.mjs'),
  bundle: true, platform: 'node', format: 'esm', target: 'node20.19',
  metafile: true, legalComments: 'external', sourcemap: false,
  banner: { js: "import { createRequire as __editorCreateRequire } from 'node:module'; const require = __editorCreateRequire(import.meta.url);" },
});
for (const artifact of Object.values(compiled.metafile.outputs)) {
  for (const dependency of artifact.imports) {
    if (!dependency.external || !isBuiltin(dependency.path)) {
      throw Error(`Unbundled runtime dependency: ${dependency.path}`);
    }
  }
}
await writeFile(join(runtimeDirectory, 'package.json'), JSON.stringify({
  name: runtimePackage, version: manifest.version, private: true,
  type: 'module', main: 'index.mjs', license: 'AGPL-3.0-only',
}, null, 2) + '\n');

// Preserve the corresponding public source, including upstream source and notices.
// No history, node_modules, generated data, local environments or private source.
const sourceRoot = join(stage, 'source', 'editor-platform-plugins');
const sourceFiles = [];
for (const [checkout, prefix] of [
  [root, ''],
  [join(root, 'vendor', 'editor-platform'), 'vendor/editor-platform/'],
]) {
  for (const path of gitFiles(checkout)) {
    const absolute = join(checkout, path);
    if (!(await stat(absolute)).isFile()) continue; // Skip the Git submodule entry.
    const destination = join(sourceRoot, prefix, path);
    await copyFile(absolute, destination);
    sourceFiles.push({ path: prefix + path, sha256: digest(await readFile(absolute)) });
  }
}
sourceFiles.sort((a, b) => a.path.localeCompare(b.path, 'en'));
await writeFile(join(stage, 'source', 'FILES.sha256'), sourceFiles.map((f) => `${f.sha256}  ${f.path}`).join('\n') + '\n');

// Include license texts and metadata for installed npm packages, including build
// dependencies. This deliberately over-includes attribution rather than dropping
// UI dependencies that Vite inlined. Upstream fixture notices live in source/.
const lock = JSON.parse(await readFile(join(root, 'package-lock.json'), 'utf8'));
const licenses = [];
for (const location of Object.keys(lock.packages).sort()) {
  if (!location.includes('node_modules/') || location.startsWith('vendor/')) continue;
  const packageRoot = join(root, location);
  let pkg;
  try { pkg = JSON.parse(await readFile(join(packageRoot, 'package.json'), 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') continue; throw error; }
  if (pkg.name?.startsWith('@editor-platform/')) continue;
  const licenseDirectory = join(stage, 'licenses', 'npm', `${pkg.name.replaceAll('/', '__')}@${pkg.version}`);
  await mkdir(licenseDirectory, { recursive: true });
  const texts = [];
  for (const filename of await readdir(packageRoot)) {
    if (!/^(licen[sc]e|copying|notice)([._-]|$)/i.test(filename)) continue;
    const source = join(packageRoot, filename);
    if (!(await stat(source)).isFile()) continue;
    await copyFile(source, join(licenseDirectory, filename));
    texts.push(filename);
  }
  const supplemental = await supplementLicenseTexts(pkg, packageRoot, licenseDirectory, texts);
  const metadata = { ...supplemental, name: pkg.name, version: pkg.version, license: pkg.license ?? pkg.licenses ?? null,
    repository: pkg.repository ?? null, texts };
  await writeFile(join(licenseDirectory, 'package.json'), JSON.stringify(metadata, null, 2) + '\n');
  licenses.push(metadata);
}
await writeFile(join(stage, 'THIRD-PARTY-NOTICES.json'), JSON.stringify(licenses, null, 2) + '\n');
await writeFile(join(stage, 'SOURCE.md'), [
  '# Corresponding source', '',
  'AGPL-3.0-only. Complete public project and pinned upstream sources are in',
  '`source/editor-platform-plugins/`; their dependency lockfiles and original',
  'license notices are retained. `source/FILES.sha256` records this snapshot.',
  'The populated vendor directory replaces the Git submodule for this copy.',
  'Use the public Git checkout and README commands to reproduce the build;',
  'install-time and runtime operation do not need the source tree, npm or Git.', '',
  'Repository: https://github.com/ryo0221/editor-platform-plugins',
  'Dependency: https://github.com/ryo0221/open-editor-platform',
  'License inventory includes installed build dependencies as well as runtime',
  'dependencies. It does not grant a new license or linking exception.', '',
].join('\n'));
const upstream = JSON.parse(await readFile(join(root, 'upstream.json'), 'utf8'));
await writeFile(join(stage, 'build-info.json'), JSON.stringify({
  version: manifest.version, upstream, ...provenance,
  sourceManifestSha256: digest(await readFile(join(stage, 'source', 'FILES.sha256'))),
  uiSha256: digest(await readFile(join(stage, 'ui', 'editor.html'))),
  runtimeSha256: digest(await readFile(join(runtimeDirectory, 'index.mjs'))),
  sourceFiles: sourceFiles.length,
  runtime: code ? `Official Node ${nodeDistribution.version} ${nodeDistribution.platform}/${nodeDistribution.arch}` : 'Claude Desktop built-in Node.js >=20.19.0',
  verification: code ? 'Release candidate only; signed-in Claude Code acceptance is separate.' : 'Portable package/stdio checks; signed-in Claude Desktop acceptance is separate.',
}, null, 2) + '\n');

if (code) {
  run(process.execPath, [process.env.npm_execpath, 'run', 'build:browser']);
  await copyFile(join(root, 'dist-browser', 'browser.html'), join(stage, 'ui', 'browser.html'));
  await copyFile(join(root, 'dist-react-preview', 'react-preview.html'), join(stage, 'ui', 'react-preview.html'));
  await installNodeDistribution(process.env.EDITOR_NODE_ARCHIVE, join(stage, 'runtime'), nodeDistribution);
  await copyFile(join(root, '.claude-plugin', 'plugin.json'), join(stage, '.claude-plugin', 'plugin.json'));
  await cp(join(root, 'skills'), join(stage, 'skills'), { recursive: true });
  await writeFile(join(stage, '.mcp.json'), JSON.stringify({ mcpServers: { 'editor-platform': {
    command: '${CLAUDE_PLUGIN_ROOT}/runtime/' + nodeExecutable, args: ['${CLAUDE_PLUGIN_ROOT}/server/code.mjs'],
  } } }, null, 2) + '\n');
  await mkdir(join(stage, 'server'), { recursive: true });
  await writeFile(join(stage, 'server', 'code.mjs'), [
    `import { startCode } from '../node_modules/${runtimePackage}/index.mjs';`,
    "try { await startCode(new URL('../', import.meta.url)); }",
    "catch (error) { console.error('Editor startup failed:', error.message); process.exitCode = 1; }", '',
  ].join('\n'));
  const shellClient = await build({
    absWorkingDir: root, entryPoints: ['src/claude-code/shell-client.ts'],
    outfile: join(stage, 'server', 'shell-client.mjs'), bundle: true,
    platform: 'node', format: 'esm', target: 'node24', metafile: true,
    legalComments: 'external', sourcemap: false,
    banner: { js: "import { createRequire as __editorCreateRequire } from 'node:module'; const require = __editorCreateRequire(import.meta.url);" },
  });
  for (const artifact of Object.values(shellClient.metafile.outputs)) {
    for (const dependency of artifact.imports) {
      if (!dependency.external || !isBuiltin(dependency.path)) throw Error(`Unbundled shell client dependency: ${dependency.path}`);
    }
  }
  await copyFile(join(root, 'src', 'codex', 'setup.mjs'), join(stage, 'server', 'codex-setup.mjs'));
  const infoPath = join(stage, 'build-info.json');
  const info = JSON.parse(await readFile(infoPath, 'utf8'));
  info.nodeDistribution = nodeDistribution;
  info.nodeSha256 = digest(await readFile(join(stage, 'runtime', nodeExecutable)));
  info.nodeLicenseSha256 = digest(await readFile(join(stage, 'runtime', 'LICENSE')));
  info.reactPreviewSha256 = digest(await readFile(join(stage, 'ui', 'react-preview.html')));
  info.browserSha256 = digest(await readFile(join(stage, 'ui', 'browser.html')));
  info.codexSetupSha256 = digest(await readFile(join(stage, 'server', 'codex-setup.mjs')));
  info.shellClientSha256 = digest(await readFile(join(stage, 'server', 'shell-client.mjs')));
  info.platform = nodeDistribution.platform; info.arch = nodeDistribution.arch;
  await writeFile(infoPath, JSON.stringify(info, null, 2) + '\n');
  const marketplace = join(stage, '..', '..');
  await mkdir(join(marketplace, '.claude-plugin'), { recursive: true });
  await writeFile(join(marketplace, '.claude-plugin', 'marketplace.json'), JSON.stringify({
    name: 'editor-platform-local', metadata: { description: 'Local prebuilt Claude Code integration candidate; release acceptance pending.' }, owner: { name: 'Open Editor Platform maintainers' },
    plugins: [{ name: 'editor-platform', source: './plugins/editor-platform', version: manifest.version,
      description: 'Claude Code local browser integration candidate; actual-host acceptance pending.' }],
  }, null, 2) + '\n');
  await copyFile(join(root, 'docs', 'claude-code.md'), join(marketplace, 'INSTALL.md'));
  await copyFile(join(root, 'docs', 'codex.md'), join(stage, 'docs', 'codex.md'));
  await copyFile(join(root, 'docs', 'codex-shell.md'), join(stage, 'docs', 'codex-shell.md'));
  await copyFile(join(root, 'docs', 'codex-windows-wsl.md'), join(stage, 'docs', 'codex-windows-wsl.md'));
  await writeFile(join(marketplace, 'CODEX.md'), [
    '# Codex candidate routes', '',
    'Windows app / WSL CLI setup: [platform-specific installation](plugins/editor-platform/docs/codex-windows-wsl.md). Native acceptance is pending.',
    'Read [the bundled Codex guide](plugins/editor-platform/docs/codex.md).',
    'For an existing Codex session with shell access, read [the shell route](plugins/editor-platform/docs/codex-shell.md).',
    'This uses the bundled model-only stdio runtime and local browser; no Claude Code installation or source build is required.',
    'Native CLI registration acceptance is NOT RUN. The shell route has separate, limited evidence; do not infer GUI or other OS acceptance.', '',
  ].join('\n'));

  run('tar', ['-czf', output, '-C', marketplace, '.']);
} else {
  const cli = join(dirname(require.resolve('@anthropic-ai/mcpb')), 'cli', 'cli.js');
  run(process.execPath, [cli, 'validate', join(stage, 'manifest.json')]);
  run(process.execPath, [cli, 'pack', stage, output]);
}
await writeFile(`${output}.sha256`, `${digest(await readFile(output))}  ${relative(outputDirectory, output)}\n`);
if (code) await writeAcceptanceTemplate(output, JSON.parse(await readFile(join(stage, 'build-info.json'), 'utf8')));
console.log(`Created ${output}`);
