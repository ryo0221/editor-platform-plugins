import { canonicalJson } from '@editor-platform/artifact-core';
import { sealReactComponent, sealReactEnvironment, loadReactUiDocument, prepareReactUiExport, type ReactComponentRef, type ReactEnvironmentRef, type ReactRuntimeResolution, type ReactUiDocument, type RegisteredReactComponent } from '@editor-platform/react-ui-core';
import hashes from './implementation-hashes.json' with { type: 'json' };

export const previewEnvironment = sealReactEnvironment({ schemaVersion: 1, ref: { id: 'plugin-react', version: '1.0.0' }, reactVersion: '19.1.1', dependencies: [], providerOrder: [], stylePolicy: 'allow-literals', tokenVariables: {} });
const ids = ['Panel', 'Text', 'Counter'];
const field = (schema: { type: 'string'; maxLength: number } | { type: 'number'; minimum: number; maximum: number }, value: string | number) => ({ schema, required: true, default: value });
const text = (value: string) => field({ type: 'string', maxLength: 1000 }, value);
function component(name: string, props: RegisteredReactComponent['props'], extra: Partial<RegisteredReactComponent> = {}) {
  return sealReactComponent({ schemaVersion: 1, ref: { registryId: 'plugin-builtin', componentId: name, version: '1.0.0', implementationHash: hashes.PluginComponents }, name,
    import: { source: './PluginComponents', export: 'named', name }, props, events: {}, slots: {}, controlledInputs: [], layout: 'style', requires: [], sampleProps: {}, ...extra });
}
export const previewComponents = [
  component('Panel', { title: text('My panel') }, { slots: { content: { prop: 'children', minimum: 0, maximum: 32, accepts: ids.map(componentId => ({ registryId: 'plugin-builtin', componentId })) } } }),
  component('Text', { text: text('Hello from React') }),
  component('Counter', { label: text('Count'), initial: field({ type: 'number', minimum: 0, maximum: 1000 }, 0) }, { events: { onChange: { parameters: [{ type: 'number' }], returns: 'void' } } }),
];
export function resolvePreview(environment: ReactEnvironmentRef, refs: ReactComponentRef[]): ReactRuntimeResolution {
  if (canonicalJson(environment) !== canonicalJson(previewEnvironment.ref) || refs.length > 3 || new Set(refs.map(r => canonicalJson(r))).size !== refs.length || refs.some(ref => !previewComponents.some(c => canonicalJson(c.ref) === canonicalJson(ref)))) throw Error('Unrecognized pinned React environment or component');
  return { environment: previewEnvironment.ref, components: refs, dependencies: [] };
}
export function validatePreviewDocument(raw: unknown): ReactUiDocument {
  const document = loadReactUiDocument(raw);
  resolvePreview(document.environment.ref, document.components.map(c => c.ref));
  if (canonicalJson(document.environment) !== canonicalJson(previewEnvironment) || document.components.some(c => !previewComponents.some(known => canonicalJson(known) === canonicalJson(c)))) throw Error('Registration differs from bundled catalog');
  // Deliberately smaller Host limit than the native interchange format.
  if (document.nodes.length > 128) throw Error('Preview supports at most 128 nodes');
  prepareReactUiExport(document, resolvePreview(document.environment.ref, document.components.map(c => c.ref)));
  return document;
}
export function createPreviewDocument(): ReactUiDocument {
  return { schemaVersion: 1, domain: 'react-ui', environment: previewEnvironment, components: previewComponents,
    inputs: {}, callbacks: { countChanged: { parameters: [{ type: 'number' }], returns: 'void' } }, fixture: {}, breakpoints: [], roots: ['panel'], nodes: [
      { id: 'panel', component: previewComponents[0].ref, props: { title: 'React preview' }, slots: { content: ['text', 'counter'] }, bindings: {}, layout: { base: {}, breakpoints: {} } },
      { id: 'text', component: previewComponents[1].ref, props: { text: 'Bundled components, isolated preview' }, slots: {}, bindings: {}, layout: { base: {}, breakpoints: {} } },
      { id: 'counter', component: previewComponents[2].ref, props: { label: 'Count', initial: 0 }, slots: {}, bindings: { onChange: { kind: 'callback', callback: 'countChanged' } }, layout: { base: {}, breakpoints: {} } },
    ] };
}
