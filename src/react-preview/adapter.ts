import type { ReactRuntimeAdapter } from '@editor-platform/react-ui-core';
import { reuseHash } from '@editor-platform/reuse-core';
import { previewEnvironment, resolvePreview, validatePreviewDocument } from './catalog';
import implementation from './PluginComponents.tsx?raw';
import hashes from './implementation-hashes.json' with { type: 'json' };
export const previewAdapter: ReactRuntimeAdapter = {
  async resolve({ environment, components }) {
    try { return { resolution: resolvePreview(environment, components), diagnostics: [] }; }
    catch { return { diagnostics: [{ code: 'bundled-runtime-mismatch', severity: 'error', path: '$.environment', message: 'Only the bundled, pinned React catalog can execute.', recovery: 'Use the bundled example or retain this document for its original runtime.' }] }; }
  },
  previewEndpoint(environment) {
    resolvePreview(environment, []);
    const url = document.querySelector<HTMLMetaElement>('meta[name="editor-react-preview"]')?.content;
    if (!url) throw Error('React preview is available in the Claude Code local browser. This host has no isolated runtime endpoint.');
    return { url, environment: previewEnvironment.ref };
  },
  serializePreview(request) {
    if (request.type === 'render') validatePreviewDocument(request.document);
    return request;
  },
  async exportImplementations({ components }) {
    resolvePreview(previewEnvironment.ref, components);
    if (reuseHash(implementation) !== hashes.PluginComponents) throw Error('Bundled implementation hash mismatch');
    return { files: [{ path: 'PluginComponents.tsx', hash: hashes.PluginComponents, text: implementation }], diagnostics: [] };
  },
};
