import { z } from 'zod';
import type { SlideContent } from '@editor-platform/slide/model';
import { shapeNames } from '@editor-platform/editor-core';

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
const textStyle = z.object({
  fontFamily: z.string().optional(), fontSize: z.number().min(1).max(384).optional(),
  bold: z.boolean().optional(), italic: z.boolean().optional(), underline: z.boolean().optional(),
  strike: z.boolean().optional(), color: z.string().optional(), lineHeight: z.number().optional(),
  letterSpacing: z.number().optional(), align: z.enum(['left', 'center', 'right']).optional(),
  verticalAlign: z.enum(['top', 'middle', 'bottom']).optional(), padding: z.number().optional(),
  list: z.boolean().optional(), overflow: z.enum(['clip', 'expand', 'fit']).optional(),
}).strict();
export const nativeSlideContentSchema = z.object({
  schemaVersion: z.union([z.literal(1), z.literal(2)]), width: z.number().positive(), height: z.number().positive(),
  theme: z.object({ color: z.string(), fontFamily: z.string() }).optional(),
  slides: z.array(z.object({
    id, title: z.string(), background: z.string(), notes: z.string().optional(), hidden: z.boolean().optional(),
    backgroundImage: z.string().optional(),
    objects: z.array(z.object({
      id, type: z.enum(['text', 'shape', 'image', 'chart', 'group', 'table']), bounds,
      text: z.string(), fill: z.string(), src: z.string().optional(), alt: z.string().optional(),
      groupId: id.optional(), shape: z.enum(shapeNames).optional(),
      stroke: z.string().optional(), strokeWidth: z.number().optional(), dash: z.string().optional(),
      opacity: z.number().min(0).max(1).optional(), radius: z.number().optional(), rotation: z.number().optional(),
      flipX: z.boolean().optional(), flipY: z.boolean().optional(), locked: z.boolean().optional(), hidden: z.boolean().optional(),
      typography: textStyle.optional(), runs: z.array(z.object({ text: z.string(), style: textStyle.optional() })).optional(),
      imageFit: z.enum(['fit', 'fill']).optional(), crop: z.object({ x: z.number(), y: z.number(), scale: z.number() }).optional(),
      arrowhead: z.enum(['none', 'end', 'both']).optional(),
      chart: z.object({ label: z.string(), labels: z.array(z.string()), values: z.array(z.number().finite()),
        capturedAt: z.string(), type: z.enum(['bar', 'line', 'pie']).optional(), legend: z.boolean().optional() }).optional(),
      table: z.object({ rows: z.array(z.array(z.string())), header: z.boolean().optional(),
        merges: z.array(z.object({ row: z.number().int(), col: z.number().int(), rows: z.number().int(), cols: z.number().int() })).optional(),
        columnWidths: z.array(z.number()).optional(), rowHeights: z.array(z.number()).optional() }).optional(),
    }).passthrough()).max(500),
  }).passthrough()).min(1).max(50),
}).passthrough().describe('Complete editable native slide deck. Shapes, chart snapshots, tables, embedded images, typography, rich runs and absolute pixel layout are supported. Call get_editor_guide(kind="slide") for a valid designed example.');
export const createArgs = z.object({
  title: z.string().trim().min(1).max(200),
  slides: z.array(z.object({ title: z.string().max(200), text: z.string().max(20000).default('') }).strict()).min(1).max(20).optional()
    .describe('Legacy title/body-only layout. Use content for designed slides; do not use this field when diagrams, tables, charts or visual layout are requested.'),
  content: nativeSlideContentSchema.optional(),
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
