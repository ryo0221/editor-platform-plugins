import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

export interface ArtifactSummary {
  id: string; kind: string; title: string; revision: number; updatedAt: string; deletedAt?: string;
}
export async function inventory(directory: string, prefix: 'deck_' | 'artifact_', state: 'active' | 'deleted' | 'all', cursor: string, limit: number): Promise<ArtifactSummary[]> {
  let names: string[];
  try { names = await readdir(directory); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []; throw error; }
  const result: ArtifactSummary[] = [];
  for (const name of names.filter((n) => n.startsWith(prefix) && /^[a-zA-Z0-9_-]+\.json$/.test(n) && n.slice(0, -5) > cursor).sort()) {
    const record = JSON.parse(await readFile(join(directory, name), 'utf8'));
    if (state !== 'all' && !!record.deletedAt !== (state === 'deleted')) continue;
    result.push({ id: record.id, kind: record.kind ?? 'slide', title: record.title, revision: record.revision, updatedAt: record.updatedAt, ...(record.deletedAt ? { deletedAt: record.deletedAt } : {}) });
    if (result.length >= limit) break;
  }
  return result;
}
