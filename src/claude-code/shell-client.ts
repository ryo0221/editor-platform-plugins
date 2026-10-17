import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';

// A shell-accessible model client, not a browser client or Codex registration.
// The packaged server retains the authoritative model-only tool boundary.
if (process.argv.includes('--help')) {
  console.log('Editor shell client: keep stdin open for the browser session.');
  console.log('Send one JSON object per line: {"id":1,"method":"tools/list"}');
  console.log('or {"id":2,"tool":"get_editor_guide","arguments":{"kind":"document"}}');
  console.log('Use EDITOR_DATA_DIR for a dedicated absolute data directory. EOF stops the server.');
} else {
  const client = new Client({ name: 'editor-platform-shell', version: '1' });
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [fileURLToPath(new URL('./code.mjs', import.meta.url))],
    env: Object.fromEntries(Object.entries(process.env).filter((entry): entry is [string, string] => typeof entry[1] === 'string')),
    stderr: 'inherit',
  });
  const lines = createInterface({ input: process.stdin, crlfDelay: Infinity });
  // Subscribe before the async connection: piped input and EOF may arrive now.
  const input = lines[Symbol.asyncIterator]();
  const output = (value: unknown) => process.stdout.write(JSON.stringify(value) + '\n');
  try {
    await client.connect(transport);
    output({ event: 'ready', channel: 'model-only', browserVerified: false });
    for await (const line of input) {
      if (!line.trim()) continue;
      let id: string | number | null = null;
      try {
        if (Buffer.byteLength(line) > 2 * 1024 * 1024) throw Error('Request exceeds 2 MiB.');
        const request = JSON.parse(line);
        if (!request || typeof request !== 'object' || Array.isArray(request)) throw Error('Expected a JSON object.');
        if (typeof request.id === 'string' || typeof request.id === 'number') id = request.id;
        if (request.method === 'tools/list' && request.tool === undefined) {
          output({ id, result: await client.listTools() });
        } else if (typeof request.tool === 'string' && request.method === undefined &&
            request.arguments && typeof request.arguments === 'object' && !Array.isArray(request.arguments)) {
          output({ id, result: await client.callTool({ name: request.tool, arguments: request.arguments }) });
        } else throw Error('Use method tools/list or tool with an arguments object.');
      } catch (error) {
        // Do not echo a malformed input line or a browser capability.
        output({ id, error: error instanceof SyntaxError ? 'Invalid JSON.' : (error as Error).message });
      }
    }
  } catch {
    output({ event: 'startup-failed', error: 'Could not connect to the packaged model-only server. See its startup error on stderr.' });
    process.exitCode = 1;
  } finally {
    lines.close();
    await client.close();
  }
}
