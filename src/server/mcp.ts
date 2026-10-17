import { referenceService } from './references';
import { ReferenceError } from '@editor-platform/artifact-references';
import { readFile } from 'node:fs/promises';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAppResource, registerAppTool, RESOURCE_MIME_TYPE } from '@modelcontextprotocol/ext-apps/server';
import { z } from 'zod';
import { createArgs, deckIdSchema, proposalArgs, saveArgs, decisionArgs, selectionArgs, resourceUri } from '../shared/contracts';
import { DeckStore, DomainError } from './decks';
import { ArtifactStore } from './artifacts';
import { kindSchema, artifactKinds } from '../shared/domains';
import { join } from 'node:path';
import { inventory } from './inventory';
import { authoringInstructions, getEditorGuide } from './authoring';

export function createEditorServer(store: DeckStore, htmlPath = new URL('../../dist/editor.html', import.meta.url), host: { modelOnly?: boolean; openEditor?: () => Promise<unknown> } = {}) {
  const artifacts = sharedArtifacts.get(store) ?? new ArtifactStore(join(store.directory, 'artifacts'));
  sharedArtifacts.set(store, artifacts);
  const references = referenceService(store.directory, artifacts);
  const server = new McpServer({ name: 'editor-platform-plugins', version: '0.1.3' }, { instructions: authoringInstructions });
  registerAppResource(server, 'slide-editor', resourceUri, {}, async () => ({
    contents: [{ uri: resourceUri, mimeType: RESOURCE_MIME_TYPE,
      text: await readFile(htmlPath, 'utf8'),
      _meta: { ui: { prefersBorder: false, csp: { connectDomains: [], resourceDomains: [] } } },
    }],
  }));
  function tool<S extends z.ZodObject>(name: string, title: string, description: string, schema: S,
    run: (args: z.infer<S>) => Promise<unknown>, options: { appOnly?: boolean; readOnly?: boolean; widget?: boolean; destructive?: boolean } = {}) {
    if (host.modelOnly && options.appOnly) return;
    registerAppTool(server, name, {
      title, description, inputSchema: schema.shape,
      annotations: { readOnlyHint: !!options.readOnly, destructiveHint: !!options.destructive, openWorldHint: false, idempotentHint: !!options.readOnly },
      _meta: { ui: { ...(options.widget === false ? {} : { resourceUri }), visibility: options.appOnly ? ['app'] : ['model', 'app'] } },
    }, async (args: unknown) => {
      try {
        const result = await run(schema.parse(args));
        return { content: [{ type: 'text' as const, text: JSON.stringify(result) }], structuredContent: result as Record<string, unknown> };
      } catch (error) {
        const code = error instanceof ReferenceError ? error.status : error instanceof DomainError ? error.code : error instanceof z.ZodError ? 'INVALID' : 'INTERNAL';
        const message = code === 'INTERNAL' ? 'The operation could not be completed.' : (error as Error).message;
        return { isError: true, content: [{ type: 'text' as const, text: `${code}: ${message}` }], structuredContent: { error: { code, message, recovery: 'Read the current saved artifact and get_editor_guide for its kind. For Slide, use propose_slide_changes.content OR its documented typed edits. A proposal requires explicit UI review.' } } };
      }
    });
  }
  if (host.openEditor) tool('open_editor', 'Open the local Editor', 'Open the real Editor in the local browser for manual editing, explicit Save and proposal review. The plugin manages the loopback server. Never use shell or hidden UI tools to accept proposals or save for the user.', z.object({}).strict(), host.openEditor, { widget: false });
  const sourceSchema = z.object({ artifactId: z.string().regex(/^artifact_[a-zA-Z0-9_-]{1,100}$/), domain: z.enum(['data', 'structured-graph']) }).strict();
  const targetSchema = z.object({ kind: z.enum(['table', 'chart', 'graph']), viewId: z.string().min(1).max(512), columnIds: z.array(z.string()).max(30).optional(), rowIds: z.array(z.string()).max(100).optional(), nodeIds: z.array(z.string()).max(100).optional() }).strict();
  tool('list_reference_sources', 'List saved Data and Graph references', 'List active saved Data/Graph views available for fixed or follow embedding into Slide. No drafts or proposals.', z.object({}).strict(),
    async () => ({ sources: await references.host.list() }), { readOnly: true, widget: false });
  tool('read_reference_source', 'Read a committed reference source', 'Return a committed, hash-bound source snapshot and required Graph Profile. Not unsaved edits or pending proposals.', sourceSchema,
    async (source) => ({ snapshot: await references.host.read(source, new AbortController().signal) }), { readOnly: true, widget: false });
  tool('create_reference', 'Prepare a native embedded reference', 'Prepare fixed/follow metadata and its SVG projection from saved Data/Graph. This does not edit a destination: place reference and src on a Slide image in create_artifact or propose_artifact_changes; existing decks require explicit proposal review.',
    z.object({ source: sourceSchema.extend({ target: targetSchema }), mode: z.enum(['fixed', 'follow']) }).strict(), async ({ source, mode }) => {
      const resolver = references.resolver(); const reference = await resolver.create(source, mode);
      return { reference, ...resolver.project(reference.snapshot, reference.source.target) };
    }, { readOnly: true, widget: false });
  tool('capture_slide_references', 'Capture reference versions for a Slide draft', 'Validate issued reference closures and capture the latest committed follow sources for native JSON export. Returns a copy only; does not save or apply a proposal.',
    z.object({ deckId: z.string().regex(/^deck_[a-zA-Z0-9_-]{1,100}$/), content: z.unknown() }).strict(), async ({ deckId, content }) => ({ content: await references.capture(content, deckId) }), { readOnly: true, widget: false });
  tool('get_editor_guide', 'Learn how to author an Editor artifact', 'Read this before authoring. Returns the selected domain\'s native field contract, a validated rich example and limitations. Adapt the example to the user request; do not copy fictional data as fact.', z.object({ kind: kindSchema }).strict(),
    async ({ kind }) => getEditorGuide(kind), { readOnly: true, widget: false });
  tool('create_deck', 'Create designed editable slides', 'Create a real designed slide deck. First call get_editor_guide(kind="slide"), then supply content with native text, shapes, charts, tables, images, typography and deliberate layout. The legacy slides field produces title/body-only pages. Do not use it for a visual presentation. Opens the Slide Editor.', createArgs,
    async (args) => ({ deck: await store.create(args.title, args.slides, args.content === undefined ? undefined : await references.capture(args.content, undefined, false)) }));
  tool('read_deck', 'Open slides', 'Read the current saved deck, native element IDs, revision, last saved selection and pending proposals. Unsaved UI edits are not included.', deckIdSchema,
    async ({ deckId }) => ({ deck: await store.read(deckId) }), { readOnly: true });
  tool('propose_slide_changes', 'Propose slide changes', 'Read read_deck and get_editor_guide(kind="slide") first. Supply exactly one of content (complete updated native deck, recommended for chart/table/image/layout) or edits (kind discriminator, e.g. {kind:"set_text",slideId,objectId,text}). No JSON Patch or op field. Preserves review and exact baseRevision. You can also use propose_artifact_changes for decks.', proposalArgs,
    async (args) => ({ deck: args.content !== undefined
      ? await store.proposeNative(args.deckId, args.baseRevision, args.summary, await references.capture(args.content, args.deckId, false))
      : await store.propose(args.deckId, args.baseRevision, args.summary, args.edits!) }));
  tool('export_deck', 'Export slides', 'Return saved native JSON and one SVG per slide. Requires no external network calls. Text layout depends on fonts available to the viewer.', deckIdSchema,
    async ({ deckId }) => await references.exported(await store.read(deckId)), { readOnly: true, widget: false });
  tool('save_slide_draft', 'Save manual edits', 'Save the current native UI draft using revision preconditions. UI only.', saveArgs,
    async (args) => ({ deck: await store.save(args.deckId, args.baseRevision, await references.capture(args.content, args.deckId)) }), { appOnly: true });
  tool('apply_slide_proposal', 'Apply reviewed proposal', 'Apply the human-reviewed proposal. UI only. Reject stale revisions.', decisionArgs,
    async (args) => { const record = await store.read(args.deckId); const proposal = record.proposals.find((p) => p.id === args.proposalId); if (proposal) await references.capture(proposal.preview, args.deckId, false); return { deck: await store.decide(args.deckId, args.proposalId, true) }; }, { appOnly: true });
  tool('reject_slide_proposal', 'Reject proposal', 'Remove a proposal without changing saved slide content. UI only.', decisionArgs,
    async (args) => ({ deck: await store.decide(args.deckId, args.proposalId, false) }), { appOnly: true });
  tool('set_slide_selection', 'Share saved selection', 'Record the selected saved element IDs for the conversation. UI only.', selectionArgs,
    async (args) => ({ deck: await store.select(args.deckId, args.baseRevision, args.ids) }), { appOnly: true, widget: false });
  const artifactId = z.string().regex(/^[a-zA-Z0-9_-]{1,120}$/);
  const artifactRead = z.object({ artifactId }).strict();
  const base = { artifactId, baseRevision: z.number().int().min(1) };
  const artifactDecision = z.object({ artifactId, proposalId: artifactId }).strict();
  tool('list_editors', 'List editor capabilities', 'List supported public Editor domains and partial/unavailable adapters before selecting a tool.', z.object({}).strict(),
    async () => ({ editors: artifactKinds.map((kind) => ({ kind, nativeRetention: true, surface: true, authoringGuide: { tool: 'get_editor_guide', arguments: { kind } },
      livePreview: kind === 'react-ui' ? 'requires-separate-pinned-runtime' : 'native',
      exports: kind === 'slide' ? ['json', 'svg'] : kind === 'document' ? ['json', 'markdown'] : kind === 'data' ? ['json', 'csv'] : ['design', 'whiteboard'].includes(kind) ? ['json', 'svg'] : ['json'] })),
      pendingPublicSource: [], unimplementedAdapters: ['video', 'gis'], sharedEditing: false,
      crossArtifactEmbedding: { sources: ['data', 'graph'], destinations: ['slide'], modes: ['fixed', 'follow'] }, sourceUpdatePropagation: 'saved-source polling; view-only until explicit Save/export', slideCharts: 'static-snapshots', customGraphProfiles: 'supply profile at creation; retained immutably with the artifact', deletion: 'recoverable-trash', upstreamTrackingIssue: 'https://github.com/ryo0221/editor-platform/issues/264' }), { readOnly: true, widget: false });
