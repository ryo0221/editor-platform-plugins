// Rebuild trace for the 21 historical notice omissions. No installation/network.
// Positive module contribution is evidence of inclusion, not license clearance.
import { build as viteBuild } from 'vite';
import { build as esBuild } from 'esbuild';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';

// Run from the repository root with pinned, already-installed dependencies.
await mkdir('work/license-audit', { recursive: true });
const inventory = JSON.parse(await readFile('docs/release-candidates/0c17336-inventory.json'));
const missing = inventory.packages[0].noticePackagesWithoutLicenseText;
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const report = {};
for (const [name, configFile] of [
  ['editor', 'vite.config.ts'], ['browser', 'vite.browser.config.ts'],
  ['react-preview', 'vite.react-preview.config.ts'],
]) {
  const modules = {};
  const built = await viteBuild({
    configFile, logLevel: 'error', build: { write: false },
    plugins: [{
      name: 'audit-module-contribution',
      generateBundle(_options, bundle) {
        for (const chunk of Object.values(bundle)) {
          if (chunk.type === 'chunk') Object.assign(modules, chunk.modules);
        }
      },
    }],
  });
  const outputs = (Array.isArray(built) ? built : [built]).flatMap(result => result.output);
  report[name] = {
    outputs: outputs.map(output => ({ file: output.fileName, sha256: digest(output.type === 'asset' ? output.source : output.code) })),
    matches: Object.fromEntries(missing.map(pkg => [pkg, Object.entries(modules)
      .filter(([id]) => id.includes('/node_modules/' + pkg + '/'))
      .map(([id, module]) => ({ path: id.replace(process.cwd() + '/', ''), renderedLength: module.renderedLength }))])),
  };
}
for (const name of ['claude-code', 'desktop']) {
  const built = await esBuild({
    entryPoints: ['src/' + name + '/runtime.ts'], outfile: 'index.mjs', bundle: true,
    platform: 'node', format: 'esm', target: 'node20.19', metafile: true,
    legalComments: 'external', sourcemap: false, write: false,
    banner: { js: "import { createRequire as __editorCreateRequire } from 'node:module'; const require = __editorCreateRequire(import.meta.url);" },
  });
  const inputs = built.metafile.outputs['index.mjs'].inputs;
  report[name] = {
    outputs: built.outputFiles.map(output => ({ file: output.path.split('/').at(-1), sha256: digest(output.contents) })),
    matches: Object.fromEntries(missing.map(pkg => [pkg, Object.entries(inputs)
      .filter(([id]) => id.startsWith('node_modules/' + pkg + '/'))
      .map(([path, module]) => ({ path, bytesInOutput: module.bytesInOutput }))])),
  };
}
await writeFile('work/license-audit/trace.json', JSON.stringify(report, null, 2) + '\n');
console.log('Saved module/output evidence to work/license-audit/trace.json. This is not publication clearance.');
