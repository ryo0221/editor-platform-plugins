import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { EditorSession, transaction, type EditorCommand } from '@editor-platform/editor-core';
import {
  createDeck, isDeck, slideWithLayout, insertObject, insertSlideLayout,
  updateObject, deleteObjects, exportSlideSvg, type SlideContent,
} from '@editor-platform/slide/model';
import type { DeckRecord, Edit } from '../shared/contracts';

export class DomainError extends Error {
  constructor(public code: string, message: string) { super(message); }
}
function fail(code: string, message: string): never { throw new DomainError(code, message); }
const copy = <T>(value: T): T => structuredClone(value);

export function validateContent(content: unknown): asserts content is SlideContent {
  if (Buffer.byteLength(JSON.stringify(content) ?? '') > 2_000_000) fail('LIMIT', 'Deck exceeds 2 MB.');
  if (!isDeck(content) || content.slides.length < 1 || content.slides.length > 50) fail('INVALID', 'Invalid native Slide content.');
  const ids = new Set<string>();
  for (const slide of content.slides) {
    if (slide.objects.length > 500) fail('LIMIT', 'A slide may contain at most 500 objects.');
    for (const item of [slide, ...slide.objects]) {
      if (!/^[a-zA-Z0-9_-]{1,120}$/.test(item.id) || ids.has(item.id)) fail('INVALID', 'IDs must be unique.');
      ids.add(item.id);
    }
    if (slide.backgroundImage && !slide.backgroundImage.startsWith('data:image/')) fail('INVALID', 'Use embedded image data.');
    for (const object of slide.objects)
      if (object.src && !object.src.startsWith('data:image/')) fail('INVALID', 'Use embedded image data.');
  }
}

function commandFor(content: SlideContent, edit: Edit): EditorCommand<SlideContent> {
  if (edit.kind === 'add_slide') {
    const cmd = insertSlideLayout('title-body');
    return { ...cmd, apply: (deck) => {
      const next = cmd.apply(deck), slide = next.slides.at(-1)!;
      slide.title = edit.title;
      const texts = slide.objects.filter((o) => o.type === 'text');
      if (texts[0]) texts[0].text = edit.title;
      if (texts[1]) texts[1].text = edit.text;
      return next;
    } };
  }
  const slide = content.slides.find((s) => s.id === edit.slideId);
  if (!slide) fail('NOT_FOUND', 'Slide does not exist.');
  if (edit.kind === 'add_text' || edit.kind === 'add_shape')
    return insertObject(slide.id, edit.kind === 'add_text' ? 'text' : 'shape', {
      bounds: edit.bounds, fill: edit.fill,
      ...(edit.kind === 'add_text' ? { text: edit.text } : { shape: edit.shape }),
    });
  const object = slide.objects.find((o) => o.id === edit.objectId);
  if (!object) fail('NOT_FOUND', 'Object does not exist.');
  if (object.locked) fail('LOCKED', 'Unlock this object before proposing changes.');
  if (edit.kind === 'delete_object') return deleteObjects(slide.id, [object.id]);
  if (edit.kind === 'set_text') {
    if (!['text', 'shape'].includes(object.type)) fail('INVALID', 'The object does not support plain text.');
    return updateObject(slide.id, object.id, { text: edit.text, runs: undefined });
  }
  return updateObject(slide.id, object.id, {
    ...(edit.fill ? { fill: edit.fill } : {}),
    ...(edit.bounds ? { bounds: edit.bounds } : {}),
    ...(edit.fontSize ? { typography: { ...object.typography, fontSize: edit.fontSize } } : {}),
  });
}

export class DeckStore {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(readonly directory: string) {}
  private async serialized<T>(run: () => Promise<T>): Promise<T> {
    const task = this.queue.then(run);
    this.queue = task.catch(() => undefined);
    return task;
  }
  private path(id: string) {
    if (!/^[a-zA-Z0-9_-]{1,120}$/.test(id)) fail('INVALID', 'Invalid deck ID.');
    return join(this.directory, `${id}.json`);
  }
  async read(id: string): Promise<DeckRecord> {
    try { return JSON.parse(await readFile(this.path(id), 'utf8')) as DeckRecord; }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') fail('NOT_FOUND', 'Deck not found.');
      throw error;
    }
  }
  private async write(record: DeckRecord) {
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    const target = this.path(record.id), temp = `${target}.${randomUUID()}.tmp`;
    try {
      await writeFile(temp, JSON.stringify(record), { mode: 0o600, flag: 'wx' });
      await rename(temp, target);
    } finally { await rm(temp, { force: true }); }
    return copy(record);
  }
  create(title: string, pages?: { title: string; text: string }[]) {
    return this.serialized(async () => {
      const content = createDeck();
      content.slides = (pages ?? [{ title, text: 'チャットと手操作で、一緒に仕上げる。' }]).map((p, i) => {
        const slide = slideWithLayout(i, 'title-body');
        slide.title = p.title;
        const text = slide.objects.filter((o) => o.type === 'text');
        text[0].text = p.title;
        if (text[1]) text[1].text = p.text;
        return slide;
      });
      validateContent(content);
      return this.write({ id: `deck_${randomUUID()}`, title, revision: 1, content, selection: [], proposals: [], updatedAt: new Date().toISOString() });
    });
  }
  private requireRevision(record: DeckRecord, revision: number) {
    if (record.revision !== revision) fail('CONFLICT', 'The deck has changed. Read the latest deck before retrying.');
  }
  save(id: string, revision: number, content: unknown) {
    return this.serialized(async () => {
      const record = await this.read(id);
      this.requireRevision(record, revision);
      validateContent(content);
      record.content = copy(content); record.revision++; record.selection = [];
      record.updatedAt = new Date().toISOString();
      return this.write(record);
    });
  }
  propose(id: string, revision: number, summary: string, edits: Edit[]) {
    return this.serialized(async () => {
      const record = await this.read(id); this.requireRevision(record, revision);
      if (record.proposals.length >= 10) fail('LIMIT', 'Review or reject existing proposals first.');
      let next = copy(record.content);
      for (const edit of edits) next = commandFor(next, edit).apply(next);
      validateContent(next);
      record.proposals.push({ id: `proposal_${randomUUID()}`, baseRevision: revision, summary, edits, preview: next });
      return this.write(record);
    });
  }
  decide(id: string, proposalId: string, accept: boolean) {
    return this.serialized(async () => {
      const record = await this.read(id), proposal = record.proposals.find((p) => p.id === proposalId);
      if (!proposal) fail('NOT_FOUND', 'Proposal not found.');
      if (accept) {
        this.requireRevision(record, proposal.baseRevision);
        // The reviewed, native-command-produced preview is immutable while pending.
        validateContent(proposal.preview);
        const session = new EditorSession(record.content);
        record.content = session.execute(transaction(proposal.summary, [{
          type: 'plugin.accept-reviewed-proposal', label: proposal.summary,
          context: { origin: 'proposal', transactionId: proposal.id, proposalId: proposal.id },
          apply: () => copy(proposal.preview),
        }]));
        record.revision++; record.selection = []; record.updatedAt = new Date().toISOString();
      }
      record.proposals = record.proposals.filter((p) => p.id !== proposalId);
      return this.write(record);
    });
  }
  select(id: string, revision: number, ids: string[]) {
    return this.serialized(async () => {
      const record = await this.read(id); this.requireRevision(record, revision);
      const all = new Set(record.content.slides.flatMap((s) => [s.id, ...s.objects.map((o) => o.id)]));
      if (ids.some((key) => !all.has(key))) fail('NOT_FOUND', 'Selection contains an unknown element.');
      record.selection = [...new Set(ids)]; return this.write(record);
    });
  }
  async export(id: string) {
    const record = await this.read(id);
    return { deckId: id, revision: record.revision, filename: `${id}.json`, nativeJson: JSON.stringify(record.content, null, 2),
      slides: record.content.slides.map((s) => ({ id: s.id, title: s.title, svg: exportSlideSvg(record.content, s) })) };
  }
}
