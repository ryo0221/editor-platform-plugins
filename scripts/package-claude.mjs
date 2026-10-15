import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { createRequire, isBuiltin } from 'node:module';
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);
const stage = join(root, 'work', 'claude-desktop-bundle');
const outputDirectory = join(root, 'release');
const manifest = JSON.parse(await readFile(join(root, 'desktop', 'manifest.json'), 'utf8'));
const output = join(outputDirectory, `editor-platform-claude-${manifest.version}.mcpb`);
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
async function copyFile(source, destination) {
  await mkdir(dirname(destination), { recursive: true });
  await cp(source, destination);
}

// Only the maintainer runs npm. Installation and startup never use npm or Git.
if (!process.env.npm_execpath) throw Error('Run this packager using npm run package:claude.');
run(process.execPath, [process.env.npm_execpath, 'run', 'build']);
await rm(stage, { recursive: true, force: true });
await mkdir(stage, { recursive: true });
await mkdir(outputDirectory, { recursive: true });
await copyFile(join(root, 'desktop', 'manifest.json'), join(stage, 'manifest.json'));
await copyFile(join(root, 'desktop', 'index.mjs'), join(stage, 'server', 'index.mjs'));
await copyFile(join(root, 'dist', 'editor.html'), join(stage, 'ui', 'editor.html'));
await copyFile(join(root, 'LICENSE'), join(stage, 'LICENSE'));
await copyFile(join(root, 'docs', 'claude-desktop.md'), join(stage, 'INSTALL.md'));
await copyFile(join(root, 'SECURITY.md'), join(stage, 'SECURITY.md'));
await writeFile(join(stage, 'package.json'), JSON.stringify({
  name: 'editor-platform-desktop', version: manifest.version, private: true,
  type: 'module', license: 'AGPL-3.0-only', engines: { node: '>=20.19.0' },
}, null, 2) + '\n');
// The CLI normally drops lockfiles, declarations and tsconfig files. Retain
// every file in the corresponding-source snapshot so it can be rebuilt.
await writeFile(join(stage, '.mcpbignore'), '!source/**\n');

// Compile public editor model code and all server dependencies into one portable
// package. No platform-specific native modules or runtime package downloads.
const runtimeDirectory = join(stage, 'node_modules', 'editor-platform-desktop-runtime');
await mkdir(runtimeDirectory, { recursive: true });
const compiled = await build({
  absWorkingDir: root,
  entryPoints: ['src/desktop/runtime.ts'],
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
  name: 'editor-platform-desktop-runtime', version: manifest.version, private: true,
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
  const metadata = { name: pkg.name, version: pkg.version, license: pkg.license ?? pkg.licenses ?? null,
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
  version: manifest.version, upstream,
  sourceManifestSha256: digest(await readFile(join(stage, 'source', 'FILES.sha256'))),
  uiSha256: digest(await readFile(join(stage, 'ui', 'editor.html'))),
  runtimeSha256: digest(await readFile(join(runtimeDirectory, 'index.mjs'))),
  sourceFiles: sourceFiles.length,
  runtime: 'Claude Desktop built-in Node.js >=20.19.0',
  verification: 'Portable package/stdio checks; signed-in Claude Desktop acceptance is separate.',
}, null, 2) + '\n');

const cli = join(dirname(require.resolve('@anthropic-ai/mcpb')), 'cli', 'cli.js');
run(process.execPath, [cli, 'validate', join(stage, 'manifest.json')]);
run(process.execPath, [cli, 'pack', stage, output]);
await writeFile(`${output}.sha256`, `${digest(await readFile(output))}  ${relative(outputDirectory, output)}\n`);
console.log(`Created ${output}`);
