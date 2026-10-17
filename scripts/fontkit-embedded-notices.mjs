import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const resources = new URL('../licenses/fontkit-1.1.1/', import.meta.url);
const digest = bytes => createHash('sha256').update(bytes).digest('hex');

// This retains verified notices for a subset of embedded code. It never clears
// fontkit's unresolved project notice or unknown remainder of the nested bundle.
export async function retainFontkitEmbeddedNotices(packageRoot, destination, texts) {
  const manifestBytes = await readFile(new URL('PROVENANCE.json', resources));
  const manifest = JSON.parse(manifestBytes);
  const input = await readFile(join(packageRoot, 'dist', 'fontkit.es.js'));
  if (digest(input) !== manifest.input.sha256) throw Error('Fontkit embedded bundle changed; re-audit notices');
  const pending = [];
  for (const entry of manifest.files) {
    if (!/^[A-Za-z0-9.-]+\.txt$/.test(entry.file)) throw Error('Invalid embedded notice filename');
    const bytes = await readFile(new URL(entry.file, resources));
    if (digest(bytes) !== entry.sha256) throw Error(`Embedded notice digest mismatch: ${entry.file}`);
    pending.push({ entry, bytes });
  }
  const directory = join(destination, 'embedded');
  await mkdir(directory, { recursive: true });
  for (const { entry, bytes } of pending) {
    await writeFile(join(directory, entry.file), bytes);
    texts.push('embedded/' + entry.file);
  }
  await writeFile(join(directory, 'PROVENANCE.json'), manifestBytes);
  return { status: 'PARTIAL', provenance: 'embedded/PROVENANCE.json',
    provenanceSha256: digest(manifestBytes), bundleSha256: manifest.input.sha256,
    noticeFiles: manifest.files.map(({ file, sha256 }) => ({ path: 'embedded/' + file, sha256 })) };
}
