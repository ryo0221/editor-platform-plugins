import { createServer } from 'node:http';
import { once } from 'node:events';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

// A static-only listener. It never receives a store, token, MCP server or filesystem
// path from a request. Its only file is a trusted, prebuilt distribution artifact.
export async function startReactPreview(editorOrigin: string, file: URL) {
  if (!/^http:\/\/127\.0\.0\.1:[1-9]\d{0,4}$/.test(editorOrigin) || new URL(editorOrigin).origin !== editorOrigin) throw Error('Preview requires a loopback Editor origin');
  const source = await readFile(file, 'utf8');
  const scripts = [...source.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)];
  if (scripts.length !== 1 || /\bsrc\s*=/.test(scripts[0][1])) throw Error('Preview must contain one bundled inline script');
  const hash = createHash('sha256').update(scripts[0][2]).digest('base64');
  const html = source.replace('<head>', `<head><meta name="editor-origin" content="${editorOrigin}">`);
  const policy = `default-src 'none'; script-src 'sha256-${hash}'; style-src 'unsafe-inline'; connect-src 'none'; img-src 'none'; font-src 'none'; media-src 'none'; frame-src 'none'; worker-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors ${editorOrigin}; sandbox allow-scripts allow-same-origin`;
  const server = createServer((req, res) => {
    const address = server.address();
    const host = typeof address === 'object' && address ? `127.0.0.1:${address.port}` : '';
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Security-Policy', policy);
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), clipboard-read=(), clipboard-write=()');
    if (req.headers.host !== host || (req.headers.origin !== undefined && req.headers.origin !== editorOrigin)) { res.writeHead(403).end(); return; }
    if (req.method !== 'GET') { res.writeHead(405).end(); return; }
    if (req.url !== '/react-preview.html') { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(html);
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const url = `http://127.0.0.1:${(server.address() as { port: number }).port}/react-preview.html`;
  let closed: Promise<void> | undefined;
  const close = () => closed ??= new Promise<void>(resolve => { server.closeAllConnections(); server.close(() => resolve()); });
  return { url, close };
}
