import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { startCode } from '../src/claude-code/runtime';
import { request } from 'node:http';
import { reuseHash } from '@editor-platform/reuse-core';
import { exportReactUi, sealReactComponent, validateReactPreviewResponse } from '@editor-platform/react-ui-core';
import { createPreviewDocument, previewEnvironment, previewComponents, resolvePreview, validatePreviewDocument } from '../src/react-preview/catalog';
import { bootstrapSchema, expectedSender, parseRender } from '../src/react-preview/protocol';
import { startReactPreview } from '../src/react-preview/server';
import hashes from '../src/react-preview/implementation-hashes.json' with { type: 'json' };

const requestFor = () => ({ protocol: 1, type: 'render', sessionId: crypto.randomUUID(), requestId: crypto.randomUUID(), revision: 1, mode: 'interact', viewport: { width: 390, height: 700 }, document: createPreviewDocument() });
test('React catalog binds exact reviewed implementation, registrations, export and environment', async () => {
  const source = await readFile(new URL('../src/react-preview/PluginComponents.tsx', import.meta.url), 'utf8');
  assert.equal(reuseHash(source), hashes.PluginComponents);
  const document = validatePreviewDocument(createPreviewDocument());
  const resolution = resolvePreview(document.environment.ref, document.components.map(c => c.ref));
  const files = exportReactUi(document, resolution).files;
  assert.match(files['Screen.tsx'], /from "\.\/PluginComponents"/);
  assert.match(files['Screen.tsx'], /Count/);
  assert.throws(() => resolvePreview({ ...previewEnvironment.ref, hash: '0'.repeat(64) }, []));
  assert.throws(() => resolvePreview(previewEnvironment.ref, [previewComponents[0].ref, previewComponents[0].ref]));
  const forged = structuredClone(document);
  const { contractHash: _, ...ref } = forged.components[0].ref;
  forged.components[0] = sealReactComponent({ ...forged.components[0], ref, import: { source: './Unreviewed', export: 'named', name: 'Panel' } });
  forged.nodes[0].component = forged.components[0].ref;
  assert.throws(() => validatePreviewDocument(forged), /Unrecognized/);
  const injection = structuredClone(document); injection.nodes[1].props.dangerouslySetInnerHTML = { __html: '<script>bad()</script>' };
  assert.throws(() => validatePreviewDocument(injection));
  const many = structuredClone(document);
  for (let n = 0; n < 129; n++) { const node = { ...many.nodes[1], id: `text${n}` }; many.nodes.push(node); many.roots.push(node.id); }
  assert.throws(() => validatePreviewDocument(many), /128 nodes/);
});
test('React request/response boundaries reject foreign, stale, malformed and executable data', () => {
  const request = requestFor(); assert.equal(parseRender(request).document.nodes.length, 3);
  for (const bad of [null, {}, { ...request, script: 'alert(1)' }, { ...request, revision: -1 }, { ...request, sessionId: '*' }, { ...request, viewport: { width: 999, height: 700 } }, { ...request, document: '<script>' }]) assert.throws(() => parseRender(bad));
  assert.equal(bootstrapSchema.safeParse({ protocol: 1, type: 'host-ready-request', token: 'secret' }).success, false);
  const parent = {}, origin = 'http://127.0.0.1:1234';
  assert.equal(expectedSender({ source: parent, origin }, parent, origin), true);
  for (const event of [{ source: {}, origin }, { source: parent, origin: 'null' }, { source: parent, origin: 'http://127.0.0.1:9999' }]) assert.equal(expectedSender(event, parent, origin), false);
  const context = { source: parent, origin, sessionId: request.sessionId, requestId: request.requestId, revision: 1, mode: 'interact' as const, document: request.document };
  const response = { protocol: 1, type: 'callback', sessionId: request.sessionId, requestId: request.requestId, revision: 1, nodeId: 'counter', event: 'onChange', arguments: [1] };
  assert.equal(validateReactPreviewResponse({ source: parent, origin, data: response }, context).type, 'callback');
  for (const data of [{ ...response, revision: 0 }, { ...response, requestId: crypto.randomUUID() }, { ...response, sessionId: crypto.randomUUID() }, { ...response, arguments: ['<script>'] }, { ...response, nodeId: 'not-a-node' }, { ...response, token: 'secret' }]) assert.throws(() => validateReactPreviewResponse({ source: parent, origin, data }, context));
});
test('React static listener refuses host/origin/API access and closes; no authentication or storage surface', async () => {
  const editor = 'http://127.0.0.1:1234';
  await assert.rejects(startReactPreview('https://example.com', new URL('../dist-react-preview/react-preview.html', import.meta.url)));
  const preview = await startReactPreview(editor, new URL('../dist-react-preview/react-preview.html', import.meta.url));
  try {
    const response = await fetch(preview.url);
    assert.equal(response.status, 200);
    const html = await response.text(); assert.ok(html.includes(`content="${editor}"`));
    assert.match(response.headers.get('content-security-policy')!, /connect-src 'none'/);
    assert.match(response.headers.get('content-security-policy')!, /script-src 'sha256-/);
    assert.match(response.headers.get('content-security-policy')!, /frame-ancestors http:\/\/127.0.0.1:1234/);
    for (const header of ['set-cookie', 'access-control-allow-origin']) assert.equal(response.headers.get(header), null);
    for (const path of ['/mcp', '/health', '/browser', '/data', '/react-preview.html?path=secret']) assert.equal((await fetch(new URL(path, preview.url))).status, 404);
    for (const method of ['POST', 'PUT', 'OPTIONS']) assert.equal((await fetch(preview.url, { method })).status, 405);
    assert.equal((await fetch(preview.url, { headers: { Origin: 'https://evil.example' } })).status, 403);
    const status = await new Promise<number | undefined>((resolve, reject) => { const req = request(preview.url, { headers: { Host: 'evil.example' } }, res => { res.resume(); resolve(res.statusCode); }); req.on('error', reject); req.end(); });
    assert.equal(status, 403);
  } finally { await preview.close(); await preview.close(); }
  await assert.rejects(fetch(preview.url));
});

test('Missing bundled preview fails Code startup and releases workspace lock', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'react-start-failure-'));
  const previous = process.env.EDITOR_DATA_DIR;
  process.env.EDITOR_DATA_DIR = directory;
  try {
    for (let i = 0; i < 2; i++) {
      await assert.rejects(startCode(pathToFileURL(directory + '/missing-bundle/')), /ENOENT/);
      await assert.rejects(access(join(directory, '.claude-code.lock')));
    }
  } finally {
    if (previous === undefined) delete process.env.EDITOR_DATA_DIR; else process.env.EDITOR_DATA_DIR = previous;
    await rm(directory, { recursive: true, force: true });
  }
});
