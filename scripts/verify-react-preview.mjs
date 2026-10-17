import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const root = new URL('../', import.meta.url);
const source = await readFile(new URL('src/react-preview/PluginComponents.tsx', root), 'utf8');
const hashes = JSON.parse(await readFile(new URL('src/react-preview/implementation-hashes.json', root), 'utf8'));
// reuseHash(string) hashes its canonical JSON string representation.
if (createHash('sha256').update(JSON.stringify(source)).digest('hex') !== hashes.PluginComponents) throw Error('Reviewed React implementation hash mismatch; review and version catalog changes before updating its hash.');
for (const name of ['react', 'react-dom']) {
  const pkg = JSON.parse(await readFile(new URL(`node_modules/${name}/package.json`, root), 'utf8'));
  if (pkg.version !== '19.1.1') throw Error(`Unpinned ${name} runtime`);
}
console.log('Verified bundled React 19.1.1 implementation source.');
