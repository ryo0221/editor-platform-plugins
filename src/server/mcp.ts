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
        const code = error instanceof DomainError ? error.code : error instanceof z.ZodError ? 'INVALID' : 'INTERNAL';
        const message = code === 'INTERNAL' ? 'The operation could not be completed.' : (error as Error).message;
        return { isError: true, content: [{ type: 'text' as const, text: `${code}: ${message}` }], structuredContent: { error: { code, message, recovery: 'Read the current saved artifact and get_editor_guide for its kind. For Slide, use propose_slide_changes.content OR its documented typed edits. A proposal requires explicit UI review.' } } };
      }
    });
  }
  if (host.openEditor) tool('open_editor', 'Open the local Editor', 'Open the real Editor in the local browser for manual editing, explicit Save and proposal review. The plugin manages the loopback server. Never use shell or hidden UI tools to accept proposals or save for the user.', z.object({}).strict(), host.openEditor, { widget: false });
  tool('get_editor_guide', 'Learn how to author an Editor artifact', 'Read this before authoring. Returns the selected domain\'s native field contract, a validated rich example and limitations. Adapt the example to the user request; do not copy fictional data as fact.', z.object({ kind: kindSchema }).strict(),
    async ({ kind }) => getEditorGuide(kind), { readOnly: true, widget: false });
  tool('create_deck', 'Create designed editable slides', 'Create a real designed slide deck. First call get_editor_guide(kind="slide"), then supply content with native text, shapes, charts, tables, images, typography and deliberate layout. The legacy slides field produces title/body-only pages. Do not use it for a visual presentation. Opens the Slide Editor.', createArgs,
    async (args) => ({ deck: await store.create(args.title, args.slides, args.content) }));
  tool('read_deck', 'Open slides', 'Read the current saved deck, native element IDs, revision, last saved selection and pending proposals. Unsaved UI edits are not included.', deckIdSchema,
    async ({ deckId }) => ({ deck: await store.read(deckId) }), { readOnly: true });
  tool('propose_slide_changes', 'Propose slide changes', 'Read read_deck and get_editor_guide(kind="slide") first. Supply exactly one of content (complete updated native deck, recommended for chart/table/image/layout) or edits (kind discriminator, e.g. {kind:"set_text",slideId,objectId,text}). No JSON Patch or op field. Preserves review and exact baseRevision. You can also use propose_artifact_changes for decks.', proposalArgs,
    async (args) => ({ deck: args.content !== undefined
      ? await store.proposeNative(args.deckId, args.baseRevision, args.summary, args.content)
      : await store.propose(args.deckId, args.baseRevision, args.summary, args.edits!) }));
  tool('export_deck', 'Export slides', 'Return saved native JSON and one SVG per slide. Requires no external network calls. Text layout depends on fonts available to the viewer.', deckIdSchema,
    async ({ deckId }) => await store.export(deckId), { readOnly: true, widget: false });
  tool('save_slide_draft', 'Save manual edits', 'Save the current native UI draft using revision preconditions. UI only.', saveArgs,
    async (args) => ({ deck: await store.save(args.deckId, args.baseRevision, args.content) }), { appOnly: true });
  tool('apply_slide_proposal', 'Apply reviewed proposal', 'Apply the human-reviewed proposal. UI only. Reject stale revisions.', decisionArgs,
    async (args) => ({ deck: await store.decide(args.deckId, args.proposalId, true) }), { appOnly: true });
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
      livePreview: kind === 'react-ui' ? 'bundled-catalog-in-claude-code-local-browser' : 'native',
      exports: kind === 'slide' ? ['json', 'svg'] : kind === 'document' ? ['json', 'markdown'] : kind === 'data' ? ['json', 'csv'] : ['design', 'whiteboard'].includes(kind) ? ['json', 'svg'] : ['json'] })),
      pendingPublicSource: ['animation', 'video', 'gis'], sharedEditing: false,
      crossArtifactEmbedding: false, sourceUpdatePropagation: false, slideCharts: 'static-snapshots', customGraphProfiles: 'supply profile at creation; retained immutably with the artifact', deletion: 'recoverable-trash', upstreamTrackingIssue: 'https://github.com/ryo0221/editor-platform/issues/264' }), { readOnly: true, widget: false });
  tool('create_artifact', 'Create a structured editable artifact', 'Create an artifact in any published Editor domain. First get_editor_guide(kind), then supply the user-specific native content: slide visuals, formatted document blocks, designed elements, connected board/graph nodes, or data rows/views. Omit content only for an explicitly empty artifact. React UI executes only the bundled catalog in the Claude Code local browser. Use Design for freeform visual UI mockups.',
    z.object({ kind: kindSchema, title: z.string().min(1).max(200), profile: z.unknown().optional().describe('Graph only: complete declarative GraphProfile, matching content.profile.id/version. Retained immutably with this artifact. Read the customGraph example in get_editor_guide(kind="graph"). Not executable code.'), content: z.unknown().optional().describe('Complete domain-native JSON from get_editor_guide. For Slide this accepts the full SlideContent, including shapes/charts/tables/images, instead of only a title/body template.') }).strict(),
    async ({ kind, title, content, profile }) => {
      if (kind !== 'graph' && profile !== undefined) throw new DomainError('INVALID', 'profile is only supported for Graph artifacts.');
      if (kind === 'slide') return { deck: await store.create(title, undefined, content) };
      return { artifact: await artifacts.create(kind, title, content, profile) };
    });
  tool('read_artifact', 'Open an artifact', 'Read saved native content, kind, revision and selected IDs. Domain models remain separate. Use the returned native JSON as the basis of a proposal.', artifactRead,
    async ({ artifactId }) => artifactId.startsWith('deck_') ? { deck: await store.read(artifactId) } : { artifact: await artifacts.read(artifactId) }, { readOnly: true });
  tool('propose_artifact_changes', 'Propose native artifact changes', 'Propose a complete same-domain native candidate against baseRevision, including rich SlideContent for decks. Read the saved artifact and get_editor_guide before editing. Preserve existing element IDs. This single-owner snapshot proposal does not mutate saved content or merge concurrent edits. UI review and explicit apply are required. Small Slide text/style edits may use propose_slide_changes.',
    z.object({ ...base, summary: z.string().min(1).max(500), content: z.unknown() }).strict(),
    async (args) => args.artifactId.startsWith('deck_')
      ? { deck: await store.proposeNative(args.artifactId, args.baseRevision, args.summary, args.content) }
      : { artifact: await artifacts.propose(args.artifactId, args.baseRevision, args.summary, args.content) });
  tool('export_artifact', 'Export an artifact', 'Return saved native JSON, and a domain-specific Markdown/CSV/SVG export where supported. No external service calls.', artifactRead,
    async ({ artifactId }) => artifactId.startsWith('deck_') ? await store.export(artifactId) : await artifacts.export(artifactId), { readOnly: true, widget: false });
  tool('list_artifacts', 'List saved artifacts and trash', 'Discover saved artifacts across conversations, with stable IDs, current revisions and titles. Content is not included. state=active excludes deleted artifacts; state=deleted lists recoverable trash. Use read_artifact before editing or deleting. Follow nextCursor if returned.',
    z.object({ state: z.enum(['active', 'deleted', 'all']).default('active'), limit: z.number().int().min(1).max(100).default(50), cursor: artifactId.optional() }).strict(),
    async ({ state, limit, cursor }) => {
      const records = (await Promise.all([inventory(store.directory, 'deck_', state, cursor ?? '', limit + 1), inventory(join(store.directory, 'artifacts'), 'artifact_', state, cursor ?? '', limit + 1)])).flat().sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
      return { artifacts: records.slice(0, limit), ...(records.length > limit ? { nextCursor: records[limit - 1].id } : {}) };
    }, { readOnly: true, widget: false });
  for (const deleted of [true, false]) tool(deleted ? 'delete_artifact' : 'restore_artifact', deleted ? 'Move an artifact to trash' : 'Restore an artifact',
    deleted ? 'Move only the explicitly user-requested artifact to recoverable trash at its exact baseRevision. Supports deck_ and artifact_ IDs. Native content, Profile and pending proposals are retained; old proposals become stale. Never delete artifacts merely because they appear unused. No permanent deletion.' : 'Restore a trashed artifact at its exact current baseRevision. Content and Profile are retained. Read the new revision before making proposals.',
    z.object(base).strict(), async ({ artifactId, baseRevision }) => artifactId.startsWith('deck_')
      ? { deck: await store.setDeleted(artifactId, baseRevision, deleted) }
      : { artifact: await artifacts.setDeleted(artifactId, baseRevision, deleted) }, { destructive: deleted });
  tool('save_artifact_draft', 'Save native manual edits', 'UI-only native draft save with exact revision checking.', z.object({ ...base, content: z.unknown() }).strict(),
    async (args) => ({ artifact: await artifacts.save(args.artifactId, args.baseRevision, args.content) }), { appOnly: true });
  tool('apply_artifact_proposal', 'Apply reviewed native proposal', 'UI-only proposal acceptance with stale revision rejection.', artifactDecision,
    async (args) => ({ artifact: await artifacts.decide(args.artifactId, args.proposalId, true) }), { appOnly: true });
  tool('reject_artifact_proposal', 'Reject native proposal', 'UI-only rejection without changing saved content.', artifactDecision,
    async (args) => ({ artifact: await artifacts.decide(args.artifactId, args.proposalId, false) }), { appOnly: true });
  tool('set_artifact_selection', 'Share native selection', 'UI-only sharing of saved native element IDs.', z.object({ ...base, ids: z.array(artifactId).max(100) }).strict(),
    async (args) => ({ artifact: await artifacts.select(args.artifactId, args.baseRevision, args.ids) }), { appOnly: true, widget: false });
  return server;
}
const sharedArtifacts = new WeakMap<DeckStore, ArtifactStore>();
