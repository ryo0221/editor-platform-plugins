import { mkdir, readFile, writeFile, link, rm } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { canonicalJson, contentHash } from '@editor-platform/artifact-core';
import { ReferenceError, ReferenceResolver, referenceManifest, type ReferenceHost, type ReferenceSnapshot, type ReferenceSource } from '@editor-platform/artifact-references';
import { nativeReferenceAdapters } from '@editor-platform/reference-adapters';
import { exportSlideSvg, type SlideContent } from '@editor-platform/slide/model';
import { ArtifactStore } from './artifacts';
import { DomainError, validateContent } from './decks';
import { inventory } from './inventory';
import { validateGraphSource } from '../shared/graph-profile';

// Single-owner workspace only. Historical closures are issued from committed files,
// never from model-supplied snapshots, unsaved drafts or pending proposals.
export function referenceService(directory: string, artifacts: ArtifactStore) {
  const history = join(directory, 'reference-snapshots');
  async function active(source: Pick<ReferenceSource, 'artifactId' | 'domain'>) {
    let record;
    try { record = await artifacts.read(source.artifactId); }
    catch (e) { if (e instanceof DomainError && e.code === 'NOT_FOUND') throw new ReferenceError('missing-source', 'Source artifact is missing.'); throw e; }
    if (record.deletedAt) throw new ReferenceError('missing-source', 'Source artifact is in trash.');
    if (!['data', 'graph'].includes(record.kind) || source.domain !== (record.kind === 'graph' ? 'structured-graph' : 'data')) throw new ReferenceError('unsupported', 'Source must be saved Data or Graph.');
    return record;
  }
  const host: ReferenceHost = {
    async list() {
      const records = await inventory(join(directory, 'artifacts'), 'artifact_', 'active', '', 1000);
      const options = [];
      for (const item of records.filter((r) => r.kind === 'data' || r.kind === 'graph')) {
        const record = await artifacts.read(item.id);
        if (record.deletedAt) continue;
        if (record.kind === 'graph') options.push({ label: `${record.title} · Graph`, source: { artifactId: item.id, domain: 'structured-graph', target: { kind: 'graph', viewId: (record.content as { id: string }).id } } });
        else {
          const views = [{ id: 'default', name: 'Default' }, ...((record.content as { views?: { id: string; name: string }[] }).views ?? [])];
          for (const view of views) for (const kind of ['table', 'chart']) options.push({ label: `${record.title} · ${view.name} · ${kind}`, source: { artifactId: item.id, domain: 'data', target: { kind, viewId: view.id } } });
        }
      }
      return options;
    },
    async read(source, signal) {
      signal.throwIfAborted();
      const record = await active(source); // readFile returns owned committed JSON.
      const hash = await contentHash(record.content);
      const profile = record.kind === 'graph' ? validateGraphSource(record.content, record.profile) : undefined;
      const snapshot: ReferenceSnapshot = { artifactId: record.id, domain: source.domain, revision: record.revision,
        versionId: `${record.id}:v${record.revision}`, contentHash: hash, content: record.content,
        dependencies: profile ? [{ id: `profile:${profile.id}:${profile.version}`, contentHash: await contentHash(profile), content: profile }] : [] };
      signal.throwIfAborted(); await host.checkAccess!(source as ReferenceSource);
      await mkdir(history, { recursive: true, mode: 0o700 });
      const path = join(history, `${record.id}-${record.revision}.json`);
      // Exclusive write preserves issued revision identity across restarts.
      const temporary = `${path}.${randomUUID()}.tmp`;
      await writeFile(temporary, canonicalJson(snapshot), { flag: 'wx', mode: 0o600 });
      try { await link(temporary, path); }
      catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
        if (await readFile(path, 'utf8') !== canonicalJson(snapshot)) throw new ReferenceError('stale', 'Conflicting saved source revision.');
      }
      finally { await rm(temporary, { force: true }); }
      signal.throwIfAborted(); return snapshot;
    },
    async checkAccess(source) { await active(source); },
    subscribe() { return () => undefined; }, // Browser adapter polls committed source metadata.
  };
  function resolver(destination?: string) { return new ReferenceResolver(host, nativeReferenceAdapters, destination); }
  async function capture(content: unknown, destination?: string, live = true): Promise<SlideContent> {
    validateContent(content);
    const items = content.slides.flatMap((slide) => slide.objects);
    for (const item of items) {
      if (!item.reference) continue;
      const snapshot = item.reference.snapshot;
      // No untrusted ID reaches a path. Also verifies active access for fixed versions.
      await active(item.reference.source);
      if (snapshot.artifactId !== item.reference.source.artifactId || !Number.isSafeInteger(snapshot.revision) || snapshot.revision < 1) throw new ReferenceError('error', 'Invalid source version.');
      let issued: string;
      try { issued = await readFile(join(history, `${snapshot.artifactId}-${snapshot.revision}.json`), 'utf8'); }
      catch { throw new ReferenceError('error', 'Unknown retained source version; create the reference using this workspace.'); }
      if (issued !== canonicalJson(snapshot)) throw new ReferenceError('error', 'Retained source differs from the issued saved version.');
    }
    const captured = await resolver(destination).capture(items, live);
    let index = 0;
    const result = { ...content, slides: content.slides.map((slide) => ({ ...slide, objects: slide.objects.map(() => captured[index++]) })) };
    validateContent(result); return result;
  }
  async function exported(record: { id: string; revision: number; content: SlideContent }) {
    const content = await capture(record.content, record.id);
    return { deckId: record.id, revision: record.revision, filename: `${record.id}.json`, references: referenceManifest(content.slides.flatMap((slide) => slide.objects)), nativeJson: JSON.stringify(content, null, 2), slides: content.slides.map((slide) => ({ id: slide.id, title: slide.title, svg: exportSlideSvg(content, slide) })) };
  }
  return { host, resolver, capture, exported };
}
