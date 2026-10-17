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
export type HttpOAuth = {
  resource: string; issuer: string; scope: string;
  // Trusted application callback; validates signature/issuer/audience/owner/client.
  // true = authorized, false = insufficient scope, throw = invalid token.
  verifyAccessToken: (token: string) => Promise<boolean>;
};
export function startHttp(options: {
  host: string; port: number; token?: string; demo?: boolean;
  store: DeckStore; html?: URL; allowedHost?: string; browserHtml?: URL; oauth?: HttpOAuth;
}) {
  const local = ['127.0.0.1', '::1', 'localhost'].includes(options.host);
  if (!local && (!options.token || options.token.length < 32)) throw Error('Remote binding requires EDITOR_ACCESS_TOKEN of at least 32 characters.');
  if (options.demo && !local) throw Error('The demo harness is loopback-only.');
  if (options.browserHtml && (!local || !options.token)) throw Error('The browser host requires loopback and an access token.');
  const oauth = options.oauth;
  if (oauth) {
    if (!local || options.token || options.demo || options.browserHtml) throw Error('OAuth candidate requires exclusive loopback HTTP mode.');
    for (const value of [oauth.resource, oauth.issuer]) {
      const url = new URL(value);
      if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw Error('OAuth URLs require HTTPS.');
    }
    if (new URL(oauth.resource).pathname !== '/mcp' || typeof oauth.scope !== 'string' || !/^[\w:.-]+$/.test(oauth.scope)) throw Error('Invalid OAuth resource or scope.');
  }
  const metadata = oauth ? `${new URL(oauth.resource).origin}/.well-known/oauth-protected-resource/mcp` : undefined;
  const htmlFile = options.html ?? html;
  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    try {
      const hostname = (req.headers.host ?? '').replace(/:\d+$/, '');
      const allowed = new Set(['127.0.0.1', 'localhost', '[::1]', options.allowedHost].filter(Boolean));
      if (!allowed.has(hostname)) { res.writeHead(403).end('Host not allowed'); return; }
      if (oauth && req.headers.host !== new URL(oauth.resource).host) { res.writeHead(403).end('Host not allowed'); return; }
      const path = new URL(req.url ?? '/', 'http://localhost').pathname;
      if (req.method === 'GET' && path === '/favicon.ico') { res.writeHead(204).end(); return; }
      if (req.method === 'GET' && path === '/health') { res.writeHead(200, { 'Content-Type': 'application/json' }).end('{"status":"ok"}'); return; }
      // The shell and generic editor contain no user data or credentials. The
      // fragment capability never reaches HTTP logs; every MCP call needs it.
      if (options.browserHtml && req.method === 'GET' && (path === '/browser' || path === '/editor.html')) {
        res.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-store',
          'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff',
          'Content-Security-Policy': "frame-ancestors 'self'" }).end(await readFile(path === '/browser' ? options.browserHtml : htmlFile, 'utf8')); return;
      }
      if (oauth && req.method === 'GET' && ['/.well-known/oauth-protected-resource/mcp', '/.well-known/oauth-protected-resource'].includes(req.url ?? '')) {
        res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }).end(JSON.stringify({ resource: oauth.resource, authorization_servers: [oauth.issuer], scopes_supported: [oauth.scope], bearer_methods_supported: ['header'] })); return;
      }
      // Capture only the actual Authorization header, never forwarded identity,
      // RPC _meta or tool arguments. Revalidate inside the tool handler as well.
      const authorize = async (): Promise<string | undefined> => {
        let error = 'invalid_token';
        try {
          const match = /^Bearer ([^\s]+)$/i.exec(req.headers.authorization ?? '');
          if (match && oauth) {
            if (await oauth.verifyAccessToken(match[1]) === true) return undefined;
            error = 'insufficient_scope';
          }
        } catch { /* Do not reveal verifier errors, credentials or owner identity. */ }
        return `Bearer resource_metadata="${metadata}", scope="${oauth?.scope}", error="${error}", error_description="Reconnect to authorize this workspace"`;
      };
      const denied = oauth ? await authorize() : undefined;
      const rejectOAuth = () => { res.writeHead(denied?.includes('error="insufficient_scope"') ? 403 : 401, { 'WWW-Authenticate': denied!, 'Cache-Control': 'no-store' }).end('Authentication required'); };
      if (oauth && (req.url !== '/mcp' || req.method !== 'POST') && denied) { rejectOAuth(); return; }
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
      // Only tools/call may reach an auth-error handler without a valid token.
      // Discovery/resources/unknown methods and batches stay transport-protected.
      if (denied && (!body || typeof body !== 'object' || Array.isArray(body) || !('method' in body) || body.method !== 'tools/call')) { rejectOAuth(); return; }
      const mcp = createEditorServer(options.store, htmlFile, oauth ? { oauth: { scope: oauth.scope, authorize } } : {});
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
