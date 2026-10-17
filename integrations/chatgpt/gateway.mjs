// OAuth resource-server adapter only. Login, PKCE, consent and token issuance belong to the IdP.
import { createServer, request } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRemoteJWKSet, jwtVerify } from 'jose';

export function configuration(input) {
  const c = { ...input };
  for (const name of ['resource', 'issuer', 'jwks']) {
    const u = new URL(c[name]);
    if (u.protocol !== 'https:' || u.username || u.password || u.search || u.hash) throw Error(`Invalid ${name}`);
    if (name === 'resource' && u.pathname !== '/mcp') throw Error('Resource must end in /mcp');
  }
  if (!c.subject || !c.clientId || !/^[\w:.-]+$/.test(c.scope)) throw Error('Owner, client and scope required');
  if (!['RS256', 'ES256'].includes(c.algorithm)) throw Error('Unsupported algorithm');
  const u = new URL(c.upstream);
  if (u.protocol !== 'http:' || u.hostname !== '127.0.0.1' || u.pathname !== '/mcp' || u.username || u.password || u.search || u.hash) throw Error('Upstream must be fixed loopback /mcp');
  if (!/^[A-Za-z0-9_-]{32,}$/.test(c.upstreamToken)) throw Error('Internal token must be >=32 base64url characters');
  return Object.freeze(c);
}

export function verifier(c, keys = createRemoteJWKSet(new URL(c.jwks), { timeoutDuration: 5000 })) {
  return async (token) => {
    const { payload } = await jwtVerify(token, keys, {
      issuer: c.issuer, audience: c.resource, algorithms: [c.algorithm], typ: 'at+jwt',
      requiredClaims: ['exp', 'iat', 'sub', 'client_id'], maxTokenAge: '10m',
    });
    if (payload.sub !== c.subject || payload.client_id !== c.clientId) throw Error('Wrong owner/client');
    if (typeof payload.scope !== 'string' || !payload.scope.split(' ').includes(c.scope)) return false;
    return true;
  };
}

export function gateway(c, verify = verifier(c)) {
  const origin = new URL(c.resource).origin;
  const metadata = `${origin}/.well-known/oauth-protected-resource/mcp`;
  const challenge = `Bearer resource_metadata="${metadata}", scope="${c.scope}"`;
  const server = createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const end = (status, message = '') => res.writeHead(status).end(message);
    // TLS terminator must preserve public Host; never trust forwarded identity headers.
    if (req.headers.host !== new URL(c.resource).host) return end(403);
    if (req.headers.origin && req.headers.origin !== origin) return end(403);
    if (req.method === 'GET' && ['/.well-known/oauth-protected-resource/mcp', '/.well-known/oauth-protected-resource'].includes(req.url)) {
      res.setHeader('Content-Type', 'application/json');
      return end(200, JSON.stringify({ resource: c.resource, authorization_servers: [c.issuer], scopes_supported: [c.scope], bearer_methods_supported: ['header'] }));
    }
    if (req.url !== '/mcp') return end(404);
    if (!['POST', 'GET', 'DELETE'].includes(req.method)) return end(405);
    const match = /^Bearer ([^\s]+)$/i.exec(req.headers.authorization ?? '');
    try {
      if (!match) throw Error('Missing token');
      if (!await verify(match[1])) {
        res.setHeader('WWW-Authenticate', `${challenge}, error="insufficient_scope"`);
        return end(403);
      }
    } catch {
      res.setHeader('WWW-Authenticate', challenge);
      return end(401);
    }
    const chunks = []; let size = 0;
    try {
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 3_000_000) return end(413);
        chunks.push(chunk);
      }
    } catch { return end(400); }
    // Allowlist headers. The external token, cookies, identity and forwarding headers never cross this boundary.
    const headers = { authorization: `Bearer ${c.upstreamToken}` };
    for (const name of ['accept', 'content-type', 'mcp-protocol-version', 'mcp-session-id', 'last-event-id']) {
      if (req.headers[name]) headers[name] = req.headers[name];
    }
    const upstream = request(c.upstream, { method: req.method, headers }, (response) => {
      for (const name of ['content-type', 'mcp-session-id', 'mcp-protocol-version']) {
        if (response.headers[name]) res.setHeader(name, response.headers[name]);
      }
      res.writeHead(response.statusCode ?? 502);
      response.pipe(res);
      response.on('error', () => res.destroy());
    });
    upstream.setTimeout(60000, () => upstream.destroy());
    upstream.on('error', () => { if (!res.headersSent) end(502); else res.destroy(); });
    res.on('close', () => upstream.destroy());
    upstream.end(Buffer.concat(chunks));
  });
  server.requestTimeout = 30000;
  server.headersTimeout = 10000;
  return server;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const input = JSON.parse(await readFile(process.env.EDITOR_OAUTH_CONFIG, 'utf8'));
  input.upstreamToken = (await readFile(process.env.EDITOR_UPSTREAM_TOKEN_FILE, 'utf8')).trim();
  const c = configuration(input);
  const port = Number(process.env.EDITOR_OAUTH_PORT ?? 8788);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw Error('Invalid port');
  gateway(c).listen(port, '127.0.0.1');
}
