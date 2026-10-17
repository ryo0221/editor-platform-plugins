import { ReferenceError, ReferenceResolver, type ReferenceSnapshot, type ReferenceSource } from '@editor-platform/artifact-references';
import { nativeReferenceAdapters } from '@editor-platform/reference-adapters';

type Call = (name: string, args: Record<string, unknown>) => Promise<{ isError?: boolean; structuredContent?: Record<string, unknown> }>;
export function browserReferences(call: Call, destination: string) {
  async function request(name: string, args: Record<string, unknown>) {
    const result = await call(name, args);
    if (result.isError) { const error = result.structuredContent?.error as { code?: string; message?: string }; throw new ReferenceError(error?.code === 'missing-source' ? 'missing-source' : 'error', error?.message ?? 'Reference request failed'); }
    return result.structuredContent!;
  }
  return new ReferenceResolver({
    async list() { return (await request('list_reference_sources', {})).sources as { label: string; source: ReferenceSource }[]; },
    async read(source, signal) { signal.throwIfAborted(); const result = await request('read_reference_source', source); signal.throwIfAborted(); return result.snapshot as ReferenceSnapshot; },
    async checkAccess(source) { await request('read_reference_source', { artifactId: source.artifactId, domain: source.domain }); },
    subscribe(notify) {
      // Poll only committed metadata; publish deletion as well as saved revision changes.
      let previous = new Map<string, number>(), stopped = false, running = false;
      const poll = async () => {
        if (running || stopped) return; running = true;
        try {
          const records = new Map<string, number>(); let cursor: string | undefined;
          do {
            const result = await request('list_artifacts', { state: 'all', limit: 100, ...(cursor ? { cursor } : {}) });
            for (const record of result.artifacts as { id: string; revision: number; kind: string }[]) if (record.kind === 'data' || record.kind === 'graph') records.set(record.id, record.revision);
            cursor = result.nextCursor as string | undefined;
          } while (cursor && !stopped);
          if (!stopped) for (const id of new Set([...previous.keys(), ...records.keys()])) if (previous.get(id) !== records.get(id)) notify(id);
          previous = records;
        } catch { if (!stopped) for (const id of previous.keys()) notify(id); }
        finally { running = false; }
      };
      const timer = setInterval(() => { void poll(); }, 4000); void poll();
      return () => { stopped = true; clearInterval(timer); };
    },
  }, nativeReferenceAdapters, destination);
}
