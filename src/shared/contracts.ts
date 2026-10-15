import { z } from 'zod';
import type { SlideContent } from '@editor-platform/slide/model';

export const resourceUri = 'ui://editor-platform/editors-v1.html';
const id = z.string().min(1).max(120).regex(/^[a-zA-Z0-9_-]+$/);
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const bounds = z.object({
  x: z.number().finite().min(-6000).max(6000),
  y: z.number().finite().min(-6000).max(6000),
  width: z.number().finite().min(1).max(6000),
  height: z.number().finite().min(1).max(6000),
}).strict();
export const editSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('set_text'), slideId: id, objectId: id, text: z.string().max(20000) }).strict(),
  z.object({ kind: z.literal('set_style'), slideId: id, objectId: id, fill: color.optional(), fontSize: z.number().min(6).max(200).optional(), bounds: bounds.optional() }).strict(),
  z.object({ kind: z.literal('add_text'), slideId: id, text: z.string().max(20000), bounds, fill: color.default('#172c47') }).strict(),
  z.object({ kind: z.literal('add_shape'), slideId: id, shape: z.enum(['rectangle', 'ellipse', 'triangle', 'arrow-right']), bounds, fill: color.default('#dce9e5') }).strict(),
  z.object({ kind: z.literal('delete_object'), slideId: id, objectId: id }).strict(),
  z.object({ kind: z.literal('add_slide'), title: z.string().min(1).max(200), text: z.string().max(20000).default('') }).strict(),
]);
export type Edit = z.infer<typeof editSchema>;
export const deckIdSchema = z.object({ deckId: id }).strict();
export const proposalArgs = z.object({
  deckId: id,
  baseRevision: z.number().int().min(1),
  summary: z.string().min(1).max(500),
  edits: z.array(editSchema).min(1).max(100),
}).strict();
export const createArgs = z.object({
  title: z.string().trim().min(1).max(200),
  slides: z.array(z.object({ title: z.string().max(200), text: z.string().max(20000).default('') }).strict()).min(1).max(20).optional(),
}).strict();
export const saveArgs = z.object({ deckId: id, baseRevision: z.number().int().min(1), content: z.unknown() }).strict();
export const decisionArgs = z.object({ deckId: id, proposalId: id }).strict();
export const selectionArgs = z.object({ deckId: id, baseRevision: z.number().int().min(1), ids: z.array(id).max(100) }).strict();
export interface Proposal {
  id: string;
  baseRevision: number;
  summary: string;
  edits: Edit[];
  preview: SlideContent;
}
export interface DeckRecord {
  id: string;
  title: string;
  revision: number;
  content: SlideContent;
  selection: string[];
  proposals: Proposal[];
  updatedAt: string;
}
export interface DeckReply { deck: DeckRecord }
