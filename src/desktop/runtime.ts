import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { DeckStore } from '../server/decks';
import { createEditorServer } from '../server/mcp';
import { desktopDataDirectory } from './storage';

export async function startDesktop(bundleRoot: URL) {
  const store = new DeckStore(desktopDataDirectory());
  const server = createEditorServer(store, new URL('ui/editor.html', bundleRoot));
  // No HTTP listener, child process, package installation or model-provider call.
  await server.connect(new StdioServerTransport());
  return server;
}
