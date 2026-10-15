import { SlideSurface } from '@editor-platform/slide';
import type { SlideContent } from '@editor-platform/slide/model';
import { DocumentSurface, type DocumentContent } from '@editor-platform/document';
import { DesignSurface, type DesignContent } from '@editor-platform/design';
import { WhiteboardSurface, type WhiteboardContent } from '@editor-platform/whiteboard';
import { DataSurface, type StructuredData } from '@editor-platform/structured-data';
import { guardDataCommand } from '@editor-platform/structured-data/session';
import { GraphSurface, relationProfile, graphCommand, type GraphDocument } from '@editor-platform/structured-graph';
import { ReviewSurface, FileSurface, type ReviewContent, type FileContent } from '@editor-platform/review-surfaces';
import { ReactUiSurface } from '@editor-platform/react-ui';
import type { ReactUiDocument, ReactRuntimeAdapter } from '@editor-platform/react-ui-core';
import { canonicalJson } from '@editor-platform/artifact-core';
import type { EditorCommand } from '@editor-platform/editor-core';
import type { ArtifactKind } from '../shared/domains';

const noReactRuntime: ReactRuntimeAdapter = {
  async resolve() { return { diagnostics: [{ code: 'runtime-unconfigured', severity: 'error', path: '$.environment', message: 'Configure a separately hosted, pinned React preview runtime.', recovery: 'Retain the native document and register an isolated runtime before live preview.' }] }; },
  previewEndpoint() { throw Error('React UI: 独立したpreview originの設定が必要です。構造・属性の編集と保存は利用できます。'); },
};
export function NativeSurface({ kind, content, execute, select, selected, readOnly, artifactId }: {
  kind: ArtifactKind; content: unknown; execute(command: EditorCommand<unknown>): boolean;
  select(ids: string | string[]): void; selected: string[]; readOnly: boolean; artifactId: string;
}) {
  const cmd = <T,>(command: EditorCommand<T>) => execute(command as EditorCommand<unknown>);
  const layout = { viewKey: artifactId, defaultPanels: { left: true, right: true, rightWidth: 250, tab: 'properties' as const, focus: false } };
  if (kind === 'slide') return <SlideSurface content={content as SlideContent} execute={cmd} select={select} readOnly={readOnly} layout={layout} />;
  if (kind === 'document') return <DocumentSurface content={content as DocumentContent} execute={cmd} select={select} selectedId={selected[0]} readOnly={readOnly} layout={layout} />;
  if (kind === 'design') return <DesignSurface content={content as DesignContent} execute={cmd} select={select} readOnly={readOnly} layout={layout} />;
  if (kind === 'whiteboard') return <WhiteboardSurface content={content as WhiteboardContent} execute={cmd} select={select} readOnly={readOnly} layout={layout} />;
  if (kind === 'data') return <DataSurface content={content as StructuredData} execute={(c) => cmd(guardDataCommand(c))} select={select} readOnly={readOnly} layout={layout} />;
  if (kind === 'graph') return <GraphSurface content={content as GraphDocument} profile={relationProfile} stamp={canonicalJson(content)} onEdit={(intents, base) => cmd(graphCommand(relationProfile, intents, base))} select={select} selectedId={selected[0]} readOnly={readOnly} initialView="fit" />;
  if (kind === 'review') return <ReviewSurface content={content as ReviewContent} execute={cmd} select={select} readOnly={readOnly} layout={layout} />;
  if (kind === 'file') return <FileSurface content={content as FileContent} execute={cmd} select={select} readOnly={readOnly} layout={layout} />;
  return <><p className="status">React UI：構造・属性を編集できます。実コンポーネントの描画には独立preview runtimeの設定が必要です。</p><ReactUiSurface content={content as ReactUiDocument} execute={cmd} select={select} selectedId={selected[0]} readOnly={readOnly} runtime={noReactRuntime} /></>;
}
