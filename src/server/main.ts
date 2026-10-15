import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { DeckStore } from './decks';
import { createEditorServer } from './mcp';

const root = fileURLToPath(new URL('../../', import.meta.url));
const store = new DeckStore(resolve(process.env.EDITOR_DATA_DIR ?? resolve(root, 'data')));
const html = new URL('../../dist/editor.html', import.meta.url);

function authenticated(req: IncomingMessage, token: string) {
  const received = Buffer.from(req.headers.authorization ?? '');
  const expected = Buffer.from(`Bearer ${token}`);
  return received.length === expected.length && timingSafeEqual(received, expected);
}
export function startHttp(options: {
  host: string; port: number; token?: string; demo?: boolean;
  store: DeckStore; html?: URL; allowedHost?: string;
}) {
  const local = ['127.0.0.1', '::1', 'localhost'].includes(options.host);
  if (!local && (!options.token || options.token.length < 32)) throw Error('Remote binding requires EDITOR_ACCESS_TOKEN of at least 32 characters.');
  if (options.demo && !local) throw Error('The demo harness is loopback-only.');
  const htmlFile = options.html ?? html;
  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    try {
      const hostname = (req.headers.host ?? '').replace(/:\d+$/, '');
      const allowed = new Set(['127.0.0.1', 'localhost', '[::1]', options.allowedHost].filter(Boolean));
      if (!allowed.has(hostname)) { res.writeHead(403).end('Host not allowed'); return; }
      const path = new URL(req.url ?? '/', 'http://localhost').pathname;
      if (req.method === 'GET' && path === '/health') { res.writeHead(200, { 'Content-Type': 'application/json' }).end('{"status":"ok"}'); return; }
      if (options.token && !authenticated(req, options.token)) {
        res.writeHead(401, { 'WWW-Authenticate': 'Bearer', 'Cache-Control': 'no-store' }).end('Unauthorized'); return;
      }
      // Non-browser clients (ChatGPT/Claude cloud) send no Origin. Browser requests
      // must be same-origin. The MCP View calls through the host bridge, not fetch.
      if (req.headers.origin && req.headers.origin !== `http://${req.headers.host}` && req.headers.origin !== `https://${req.headers.host}`) {
        res.writeHead(403).end('Origin not allowed'); return;
      }
      if (options.demo && req.method === 'GET' && path === '/demo') {
        res.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' }).end(await readFile(resolve(root, 'dist-test/tests/host.html'), 'utf8')); return;
      }
      if (options.demo && req.method === 'GET' && path === '/editor.html') {
        res.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' }).end(await readFile(htmlFile, 'utf8')); return;
      }
      if (path === '/mcp' && req.method === 'GET' && req.headers.accept?.includes('text/event-stream')) {
        // MCP clients may open the optional server event stream. Updates in this
        // preview are fetched explicitly; keep the connection alive without
        // pretending to implement replay or resumable server-origin events.
        res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
        res.write(': connected\n\n');
        const heartbeat = setInterval(() => res.write(': keepalive\n\n'), 15000);
        res.on('close', () => clearInterval(heartbeat));
        return;
      }
      if (path !== '/mcp' || req.method !== 'POST') { res.writeHead(path === '/mcp' ? 405 : 404).end(); return; }
      let size = 0; const chunks: Buffer[] = [];
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 3_000_000) { res.writeHead(413).end('Request too large'); return; }
        chunks.push(Buffer.from(chunk));
      }
      let body: unknown;
      try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
      catch { res.writeHead(400).end('Invalid JSON'); return; }
      const mcp = createEditorServer(options.store, htmlFile);
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
      res.on('close', () => { void transport.close(); void mcp.close(); });
      res.setHeader('Cache-Control', 'no-store');
      await mcp.connect(transport);
      await transport.handleRequest(req, res, body);
    } catch {
      if (!res.headersSent) res.writeHead(500).end('Internal server error');
      else res.end();
    }
  });
  return server.listen(options.port, options.host);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--stdio')) {
    await createEditorServer(store, html).connect(new StdioServerTransport());
  } else {
    const host = process.env.HOST ?? '127.0.0.1';
    const http = startHttp({ host, port: Number(process.env.PORT ?? 8787), token: process.env.EDITOR_ACCESS_TOKEN,
      demo: process.env.EDITOR_ENABLE_DEMO === '1', store, allowedHost: process.env.EDITOR_ALLOWED_HOST });
    http.on('listening', () => console.error(`Editor MCP listening at http://${host}:${(http.address() as { port: number }).port}/mcp`));
  }
}
