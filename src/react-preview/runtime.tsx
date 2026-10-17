import { useLayoutEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { ReactComposition, ReactPreviewBoundary, type ReactPreviewRuntime } from '@editor-platform/react-ui-preview';
import { reactComponentKey, type ReactPreviewResponse } from '@editor-platform/react-ui-core';
import { previewComponents, resolvePreview } from './catalog';
import { Panel, Text, Counter } from './PluginComponents';
import { bootstrapSchema, expectedSender, parseRender } from './protocol';

const editorOrigin = document.querySelector<HTMLMetaElement>('meta[name="editor-origin"]')!.content;
const root = createRoot(document.getElementById('root')!);
let current: ReturnType<typeof parseRender> | undefined;
let session: string | undefined;
let revision = -1;
const implementations = { Panel, Text, Counter };
const components = Object.fromEntries(previewComponents.map(c => [reactComponentKey(c.ref), implementations[c.name as keyof typeof implementations]])) as ReactPreviewRuntime['components'];
function Ready({ request, children }: { request: ReturnType<typeof parseRender>; children: React.ReactNode }) {
  useLayoutEffect(() => {
    if (current === request) send(request, { type: 'ready', resolution: resolvePreview(request.document.environment.ref, request.document.components.map(c => c.ref)) });
  }, [request]);
  return children;
}
type ResponseBody = ReactPreviewResponse extends infer R ? R extends ReactPreviewResponse ? Omit<R, 'protocol' | 'sessionId' | 'requestId' | 'revision'> : never : never;
function send(request: ReturnType<typeof parseRender>, body: ResponseBody) {
  if (current !== request) return;
  parent.postMessage({ ...body, protocol: 1, sessionId: request.sessionId, requestId: request.requestId, revision: request.revision }, editorOrigin);
}
window.addEventListener('message', event => {
  if (!expectedSender(event, parent, editorOrigin)) return;
  if (bootstrapSchema.safeParse(event.data).success) {
    parent.postMessage({ protocol: 1, type: 'host-ready' }, editorOrigin); return;
  }
  // Invalid/unrecognized data is never rendered, echoed or granted capabilities.
  let request: ReturnType<typeof parseRender>;
  try { request = parseRender(event.data); } catch { return; }
  if ((session && session !== request.sessionId) || request.revision <= revision) return;
  session = request.sessionId; revision = request.revision; current = request;
  const runtime = { resolution: resolvePreview(request.document.environment.ref, request.document.components.map(c => c.ref)), components, providers: {}, assets: {} };
  root.render(<ReactPreviewBoundary key={request.requestId} onError={diagnostics => send(request, { type: 'error', diagnostics })}>
    <Ready request={request}>
      <ReactComposition document={request.document} runtime={runtime} width={request.viewport.width} mode={request.mode}
        select={nodeId => send(request, { type: 'selection', nodeId })}
        callback={(nodeId, event, args) => send(request, { type: 'callback', nodeId, event, arguments: args })} />
    </Ready>
  </ReactPreviewBoundary>);
});
// No wildcard bootstrap: the trusted parent will request readiness on iframe load.
