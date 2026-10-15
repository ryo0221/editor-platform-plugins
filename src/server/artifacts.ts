import { mkdir, readFile, writeFile, rename, rm } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { nativeAdapters, nativeIds, type ArtifactRecord, type ExtraKind } from '../shared/domains';
import { DomainError } from './decks';

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
  private validate(kind: ExtraKind, content: unknown) {
    if (Buffer.byteLength(JSON.stringify(content) ?? '') > 2_000_000) throw new DomainError('LIMIT', 'Artifact exceeds 2 MB.');
    if (!nativeAdapters[kind]?.valid(content)) throw new DomainError('INVALID', `Invalid native ${kind} content.`);
  }
  private revision(record: ArtifactRecord, expected: number) {
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
  create(kind: ExtraKind, title: string, input?: unknown) {
    return this.run(async () => {
      const content = input ?? nativeAdapters[kind].create(); this.validate(kind, content);
      return this.write({ id: `artifact_${randomUUID()}`, kind, title, revision: 1, content, selection: [], proposals: [], updatedAt: new Date().toISOString() });
    });
  }
  save(id: string, revision: number, content: unknown) {
    return this.run(async () => {
      const record = await this.read(id); this.revision(record, revision); this.validate(record.kind, content);
      record.content = content; record.revision++; record.selection = []; record.updatedAt = new Date().toISOString();
      return this.write(record);
    });
  }
  propose(id: string, revision: number, summary: string, content: unknown) {
    return this.run(async () => {
      const record = await this.read(id); this.revision(record, revision); this.validate(record.kind, content);
      if (record.proposals.length >= 10) throw new DomainError('LIMIT', 'Review existing proposals first.');
      record.proposals.push({ id: `proposal_${randomUUID()}`, baseRevision: revision, summary, preview: content });
      return this.write(record);
    });
  }
  decide(id: string, proposalId: string, accept: boolean) {
    return this.run(async () => {
      const record = await this.read(id), proposal = record.proposals.find((p) => p.id === proposalId);
      if (!proposal) throw new DomainError('NOT_FOUND', 'Proposal not found.');
      if (accept) {
        this.revision(record, proposal.baseRevision); this.validate(record.kind, proposal.preview);
        record.content = proposal.preview; record.revision++; record.selection = []; record.updatedAt = new Date().toISOString();
      }
      record.proposals = record.proposals.filter((p) => p.id !== proposalId); return this.write(record);
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
    return { artifactId: id, kind: record.kind, revision: record.revision,
      files: [{ filename: `${id}.json`, mime: 'application/json', text: JSON.stringify(record.content, null, 2) }, ...(nativeAdapters[record.kind].export?.(record.content) ?? [])] };
  }
}
