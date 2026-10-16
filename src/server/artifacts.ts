import { mkdir, readFile, writeFile, rename, rm } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { nativeAdapters, nativeIds, type ArtifactRecord, type ExtraKind } from '../shared/domains';
import { DomainError } from './decks';
import { validateGraphSource, validateGraphCandidate } from '../shared/graph-profile';
import type { GraphProfile } from '@editor-platform/structured-graph/model';

export class ArtifactStore {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private directory: string) {}
  private run<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.queue.then(operation); this.queue = result.catch(() => undefined); return result;
  }
  private path(id: string) {
    if (!/^artifact_[a-zA-Z0-9_-]{1,100}$/.test(id)) throw new DomainError('INVALID', 'Invalid artifact ID.');
    return join(this.directory, `${id}.json`);
  }
  private validate(kind: ExtraKind, content: unknown, profile?: unknown) {
    if (Buffer.byteLength(JSON.stringify({ content, profile })) > 2_000_000) throw new DomainError('LIMIT', 'Artifact exceeds 2 MB.');
    if (kind === 'graph') {
      try { return validateGraphSource(content, profile); }
      catch (error) { throw new DomainError('INVALID', `Invalid native graph content: ${(error as Error).message}. Read get_editor_guide(kind="graph") and supply the matching profile when creating a custom Graph.`); }
    }
    if (profile !== undefined) throw new DomainError('INVALID', 'profile is only supported for Graph artifacts.');
    if (!nativeAdapters[kind]?.valid(content)) throw new DomainError('INVALID', `Invalid native ${kind} content.`);
  }
  private revision(record: ArtifactRecord, expected: number) {
    if (record.deletedAt) throw new DomainError('DELETED', 'Restore this artifact before editing.');
    if (record.revision !== expected) throw new DomainError('CONFLICT', 'The artifact has changed. Read the latest saved revision.');
  }
  async read(id: string): Promise<ArtifactRecord> {
    try { return JSON.parse(await readFile(this.path(id), 'utf8')); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw new DomainError('NOT_FOUND', 'Artifact not found.'); throw error; }
  }
  private async write(record: ArtifactRecord) {
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    const file = this.path(record.id), tmp = `${file}.${randomUUID()}.tmp`;
    try { await writeFile(tmp, JSON.stringify(record), { mode: 0o600, flag: 'wx' }); await rename(tmp, file); }
    finally { await rm(tmp, { force: true }); }
    return structuredClone(record);
  }
  create(kind: ExtraKind, title: string, input?: unknown, profile?: unknown) {
    return this.run(async () => {
      const content = input ?? nativeAdapters[kind].create();
      const resolved = this.validate(kind, content, profile);
      return this.write({ id: `artifact_${randomUUID()}`, kind, title, revision: 1, content, ...(resolved ? { profile: resolved } : {}), selection: [], proposals: [], updatedAt: new Date().toISOString() });
    });
  }
  save(id: string, revision: number, content: unknown) {
    return this.run(async () => {
      const record = await this.read(id); this.revision(record, revision); this.validateChange(record, content);
      record.content = content; record.revision++; record.selection = []; record.updatedAt = new Date().toISOString();
      return this.write(record);
    });
  }
  propose(id: string, revision: number, summary: string, content: unknown) {
    return this.run(async () => {
      const record = await this.read(id); this.revision(record, revision); this.validateChange(record, content);
      if (record.proposals.length >= 10) throw new DomainError('LIMIT', 'Review existing proposals first.');
      record.proposals.push({ id: `proposal_${randomUUID()}`, baseRevision: revision, summary, preview: content });
      return this.write(record);
    });
  }
  decide(id: string, proposalId: string, accept: boolean) {
    return this.run(async () => {
      const record = await this.read(id), proposal = record.proposals.find((p) => p.id === proposalId);
      if (record.deletedAt) throw new DomainError('DELETED', 'Restore this artifact before editing.');
      if (!proposal) throw new DomainError('NOT_FOUND', 'Proposal not found.');
      if (accept) {
        this.revision(record, proposal.baseRevision); this.validateChange(record, proposal.preview);
        record.content = proposal.preview; record.revision++; record.selection = []; record.updatedAt = new Date().toISOString();
      }
      record.proposals = record.proposals.filter((p) => p.id !== proposalId); return this.write(record);
    });
  }
  private validateChange(record: ArtifactRecord, content: unknown) {
    const profile = this.validate(record.kind, content, record.profile);
    if (profile) {
      try { validateGraphCandidate(record.content, content, profile); }
      catch (error) { throw new DomainError('INVALID', (error as Error).message); }
    }
  }
  setDeleted(id: string, revision: number, deleted: boolean) {
    return this.run(async () => {
      const record = await this.read(id);
      if (record.revision !== revision) throw new DomainError('CONFLICT', 'The artifact has changed. Read the latest saved revision.');
      if (!!record.deletedAt === deleted) return structuredClone(record);
      if (deleted) record.deletedAt = new Date().toISOString(); else delete record.deletedAt;
      record.revision++; record.updatedAt = new Date().toISOString();
      return this.write(record);
    });
  }
  select(id: string, revision: number, selected: string[]) {
    return this.run(async () => {
      const record = await this.read(id); this.revision(record, revision);
      const ids = nativeIds(record.content);
      if (selected.some((id) => !ids.has(id))) throw new DomainError('INVALID', 'Selection contains an unknown native ID.');
      record.selection = [...new Set(selected)]; return this.write(record);
    });
  }
  async export(id: string) {
    const record = await this.read(id);
    const profile: GraphProfile | undefined = record.kind === 'graph' ? validateGraphSource(record.content, record.profile) : undefined;
    return { artifactId: id, kind: record.kind, revision: record.revision, ...(profile ? { profile } : {}),
      files: [{ filename: `${id}.json`, mime: 'application/json', text: JSON.stringify(record.content, null, 2) }, ...(profile ? [{ filename: 'graph-source.json', mime: 'application/json', text: JSON.stringify({ graph: record.content, profile }, null, 2) }] : (nativeAdapters[record.kind].export?.(record.content) ?? []))] };
  }
}
