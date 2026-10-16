import { z } from 'zod';
import { createDocument, isDocument, exportMarkdown, type DocumentContent } from '@editor-platform/document/model';
import { createDesign, isDesign, exportDesignSvg, type DesignContent } from '@editor-platform/design/model';
import { createWhiteboard, isWhiteboard, exportWhiteboardSvg, type WhiteboardContent } from '@editor-platform/whiteboard/model';
import { createData, isStructuredData, exportCsv, type StructuredData } from '@editor-platform/structured-data/model';
import { createReview, isReview, createFile, isFile } from '@editor-platform/review-surfaces/model';
import { createRelationGraph, relationProfile, assertGraph, type GraphProfile } from '@editor-platform/structured-graph/model';
import { isReactUiDocument, sealReactEnvironment, type ReactUiDocument } from '@editor-platform/react-ui-core';

export const artifactKinds = ['slide', 'document', 'design', 'whiteboard', 'data', 'graph', 'review', 'file', 'react-ui'] as const;
export type ArtifactKind = typeof artifactKinds[number];
export type ExtraKind = Exclude<ArtifactKind, 'slide'>;
export const kindSchema = z.enum(artifactKinds);
export const domainLabels: Record<ArtifactKind, string> = { slide: 'Slide', document: 'Document', design: 'Design', whiteboard: 'Whiteboard', data: 'Data', graph: 'Graph', review: 'Review', file: 'File', 'react-ui': 'React UI' };

export const reactEnvironment = sealReactEnvironment({ schemaVersion: 1, ref: { id: 'plugin-react', version: '1.0.0' }, reactVersion: '19.1.1', dependencies: [], providerOrder: [], stylePolicy: 'allow-literals', tokenVariables: {} });
function createReactDocument(): ReactUiDocument {
  return { schemaVersion: 1, domain: 'react-ui', environment: reactEnvironment, components: [], inputs: {}, callbacks: {}, fixture: {}, breakpoints: [], roots: [], nodes: [] };
}
interface NativeAdapter {
  create(): unknown;
  valid(content: unknown): boolean;
  export?(content: unknown): { filename: string; mime: string; text: string }[];
}
// Only adapter envelopes are shared. Every retained document is the upstream native
// model and is validated by its own domain, never converted into a universal node tree.
export const nativeAdapters: Record<ExtraKind, NativeAdapter> = {
  document: { create: createDocument, valid: isDocument, export: (d) => [{ filename: 'document.md', mime: 'text/markdown', text: exportMarkdown(d as DocumentContent) }] },
  design: { create: createDesign, valid: isDesign, export: (d) => [{ filename: 'design.svg', mime: 'image/svg+xml', text: exportDesignSvg(d as DesignContent) }] },
  whiteboard: { create: createWhiteboard, valid: isWhiteboard, export: (d) => [{ filename: 'whiteboard.svg', mime: 'image/svg+xml', text: exportWhiteboardSvg(d as WhiteboardContent) }] },
  data: { create: createData, valid: isStructuredData, export: (d) => [{ filename: 'data.csv', mime: 'text/csv', text: exportCsv(d as StructuredData) }] },
  graph: { create: createRelationGraph, valid: (d) => { try { assertGraph(d as Parameters<typeof assertGraph>[0], relationProfile); return true; } catch { return false; } } },
  review: { create: createReview, valid: isReview },
  file: { create: () => createFile('text'), valid: isFile },
  'react-ui': { create: createReactDocument, valid: isReactUiDocument },
};
export interface NativeProposal { id: string; baseRevision: number; summary: string; preview: unknown }
export interface ArtifactRecord {
  id: string; kind: ExtraKind; title: string; revision: number; content: unknown;
  selection: string[]; proposals: NativeProposal[]; updatedAt: string;
  profile?: GraphProfile; deletedAt?: string;
}
export function nativeIds(content: unknown): Set<string> {
  const result = new Set<string>();
  function walk(value: unknown) {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) { value.forEach(walk); return; }
    const object = value as Record<string, unknown>;
    if (typeof object.id === 'string') result.add(object.id);
    for (const value of Object.values(object)) walk(value);
  }
  walk(content); return result;
}
