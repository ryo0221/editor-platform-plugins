import { SlideSurface } from '@editor-platform/slide';
import type { SlideContent } from '@editor-platform/slide/model';
import { DocumentSurface, type DocumentContent } from '@editor-platform/document';
import { DesignSurface, type DesignContent } from '@editor-platform/design';
import { WhiteboardSurface, type WhiteboardContent } from '@editor-platform/whiteboard';
import { DataSurface, type StructuredData } from '@editor-platform/structured-data';
import { guardDataCommand } from '@editor-platform/structured-data/session';
import { GraphSurface, relationProfile, graphCommand, type GraphDocument, type GraphProfile } from '@editor-platform/structured-graph';
import { ReviewSurface, FileSurface, type ReviewContent, type FileContent } from '@editor-platform/review-surfaces';
import { ReactUiSurface } from '@editor-platform/react-ui';
import type { ReactUiDocument } from '@editor-platform/react-ui-core';
import { canonicalJson } from '@editor-platform/artifact-core';
import type { EditorCommand } from '@editor-platform/editor-core';
import type { ArtifactKind } from '../shared/domains';

import { previewAdapter } from '../react-preview/adapter';
import { createPreviewDocument } from '../react-preview/catalog';
export function NativeSurface({ kind, content, execute, select, selected, readOnly, artifactId, profile: ownedProfile }: {
  kind: ArtifactKind; content: unknown; execute(command: EditorCommand<unknown>): boolean;
  select(ids: string | string[]): void; selected: string[]; readOnly: boolean; artifactId: string; profile?: GraphProfile;
}) {
  const cmd = <T,>(command: EditorCommand<T>) => execute(command as EditorCommand<unknown>);
  const layout = { viewKey: artifactId, defaultPanels: { left: true, right: true, rightWidth: 250, tab: 'properties' as const, focus: false } };
  if (kind === 'slide') return <SlideSurface content={content as SlideContent} execute={cmd} select={select} readOnly={readOnly} layout={layout} />;
  if (kind === 'document') return <DocumentSurface content={content as DocumentContent} execute={cmd} select={select} selectedId={selected[0]} readOnly={readOnly} layout={layout} />;
  if (kind === 'design') return <DesignSurface content={content as DesignContent} execute={cmd} select={select} readOnly={readOnly} layout={layout} />;
  if (kind === 'whiteboard') return <WhiteboardSurface content={content as WhiteboardContent} execute={cmd} select={select} readOnly={readOnly} layout={layout} />;
  if (kind === 'data') return <DataSurface content={content as StructuredData} execute={(c) => cmd(guardDataCommand(c))} select={select} readOnly={readOnly} layout={layout} />;
  const profile = ownedProfile ?? relationProfile;
  if (kind === 'graph') return <GraphSurface content={content as GraphDocument} profile={profile} stamp={canonicalJson(content)} onEdit={(intents, base) => cmd(graphCommand(profile, intents, base))} select={select} selectedId={selected[0]} readOnly={readOnly} initialView="fit" sourceActions={{ owner: "Editor Platform 拡張", readOnlyReason: "定義は作成時に保存したProfileで固定されています。属性値・配置は編集できます。" }} />;
  if (kind === 'review') return <ReviewSurface content={content as ReviewContent} execute={cmd} select={select} readOnly={readOnly} layout={layout} />;
  if (kind === 'file') return <FileSurface content={content as FileContent} execute={cmd} select={select} readOnly={readOnly} layout={layout} />;
  return <><p className="status">React UI：同梱の固定部品を組み立てます。実行プレビューは Claude Code のローカルブラウザで利用できます。</p><ReactUiSurface content={content as ReactUiDocument} execute={cmd} select={select} selectedId={selected[0]} readOnly={readOnly} runtime={previewAdapter} examples={[{ name: "Bundled components", document: createPreviewDocument() }]} /></>;
}
