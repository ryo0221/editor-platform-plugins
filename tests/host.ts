import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { AppBridge, PostMessageTransport } from '@modelcontextprotocol/ext-apps/app-bridge';
import { CallToolResultSchema } from '@modelcontextprotocol/sdk/types.js';
import type { DeckRecord } from '../src/shared/contracts';
import type { ArtifactRecord } from '../src/shared/domains';

const client = new Client({ name: 'local-protocol-harness', version: '0.1.0' }, { capabilities: {} });
await client.connect(new StreamableHTTPClientTransport(new URL('/mcp', location.href)));
let deck: DeckRecord | undefined;
let currentRecord: DeckRecord | ArtifactRecord | undefined;
const frame = document.querySelector<HTMLIFrameElement>('#editor')!;
const bridge = new AppBridge(null, { name: 'Local test host', version: '0.1.0' }, { serverTools: {}, updateModelContext: {} }, { hostContext: { theme: 'light', displayMode: 'inline', availableDisplayModes: ['inline'], containerDimensions: { width: 1300, maxHeight: 1200 } } });
bridge.oncalltool = async (params) => {
  const result = CallToolResultSchema.parse(await client.callTool(params));
  if (result.structuredContent && 'deck' in result.structuredContent) deck = result.structuredContent.deck as DeckRecord;
  if (result.structuredContent) currentRecord = (result.structuredContent.deck ?? result.structuredContent.artifact ?? currentRecord) as DeckRecord | ArtifactRecord;
  return result;
};
bridge.onupdatemodelcontext = async (params) => { document.querySelector('#host-status')!.textContent = JSON.stringify(params); return {}; };
bridge.oninitialized = async () => {
  await bridge.sendToolInput({ arguments: {} });
  document.querySelector('#host-status')!.textContent = 'Connected';
};
await bridge.connect(new PostMessageTransport(frame.contentWindow!, frame.contentWindow!));
frame.src = '/editor.html';
Object.assign(window, { __editorTest: {
  record() { return structuredClone(currentRecord); },
  async invoke(name: string, args: Record<string, unknown>, deliver = false) {
    const result = CallToolResultSchema.parse(await client.callTool({ name, arguments: args }));
    if (deliver) await bridge.sendToolResult(result);
    return result;
  },
} });
document.querySelector('#model-proposal')!.addEventListener('click', () => { void (async () => {
  if (!deck) throw Error('Create a deck first');
  const current = CallToolResultSchema.parse(await client.callTool({ name: 'read_deck', arguments: { deckId: deck.id } }));
  deck = current.structuredContent!.deck as DeckRecord;
  const result = CallToolResultSchema.parse(await client.callTool({ name: 'propose_slide_changes', arguments: { deckId: deck.id, baseRevision: deck.revision, summary: 'タイトルをわかりやすく', edits: [{ kind: 'set_text', slideId: deck.content.slides[0].id, objectId: deck.content.slides[0].objects[0].id, text: 'AIと、一緒に仕上げる。' }] } }));
  await bridge.sendToolResult(result);
})(); });
document.querySelector('#model-refresh')!.addEventListener('click', () => { void (async () => {
  if (deck) await bridge.sendToolResult(CallToolResultSchema.parse(await client.callTool({ name: 'read_deck', arguments: { deckId: deck.id } })));
})(); });
