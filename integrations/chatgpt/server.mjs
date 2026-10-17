// Source runtime: node --import tsx integrations/chatgpt/server.mjs [--check-config]
import { readFile, mkdir, access } from 'node:fs/promises';
import { resolve, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { once } from 'node:events';
import { startHttp } from '../../src/server/main.ts';
import { DeckStore } from '../../src/server/decks.ts';
import { lockWorkspace } from '../../src/claude-code/lock.ts';
import { verifier } from './gateway.mjs';
import { runtimeConfiguration, checkMetadata } from './readiness.mjs';

export async function loadConfiguration(path) {
  if (!path || !isAbsolute(path)) throw Error('EDITOR_OAUTH_CONFIG must be an absolute file path');
  const config = runtimeConfiguration(JSON.parse(await readFile(path, 'utf8')));
  const report = checkMetadata(config, JSON.parse(await readFile(config.metadataFile, 'utf8')));
  return { config, report };
}

export async function startRuntime(config, keys) {
  // Refuse missing UI before locking or opening a listener; no build/install at startup.
  await access(new URL('../../dist/editor.html', import.meta.url));
  await mkdir(config.dataDirectory, { recursive: true, mode: 0o700 });
  // Reuse the existing conservative lock, including its recovery semantics.
  const unlock = await lockWorkspace(config.dataDirectory);
  let server;
  const pending = new Set();
  try {
    server = startHttp({ host: '127.0.0.1', port: config.port,
      allowedHost: new URL(config.resource).hostname, store: new DeckStore(config.dataDirectory),
      oauth: { resource: config.resource, issuer: config.issuer, scope: config.scope,
        verifyAccessToken: verifier(config, keys) } });
    // Socket closure does not imply an async tool handler has finished. Retain
    // the lock until even disconnected requests finish their pending disk writes.
    const [handler] = server.listeners('request');
    server.removeListener('request', handler);
    server.on('request', (req, res) => {
      const task = Promise.resolve(handler.call(server, req, res));
      pending.add(task);
      void task.then(() => pending.delete(task), () => pending.delete(task));
    });
    await once(server, 'listening');
  } catch (error) { if (server) server.close(); await unlock(); throw error; }
  let closing;
  const close = () => closing ??= (async () => {
    let timer;
    try {
      // A disconnected MCP request can leave an SDK completion promise pending.
      // Bound shutdown, but never release the lock when drain is uncertain.
      await Promise.race([
        (async () => {
          await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
          await Promise.allSettled([...pending]);
        })(),
        new Promise((_, reject) => { timer = setTimeout(() => reject(Error('Shutdown did not drain; workspace lock retained')), 5000); }),
      ]);
      await unlock();
    } catch (error) { server.closeAllConnections(); throw error; }
    finally { clearTimeout(timer); }
  })();
  return { server, close };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.slice(2).some(arg => arg !== '--check-config')) throw Error('Unknown argument');
    const { config, report } = await loadConfiguration(process.env.EDITOR_OAUTH_CONFIG);
    if (process.argv.includes('--check-config')) console.log(JSON.stringify(report));
    else {
      const runtime = await startRuntime(config);
      console.error(`ChatGPT candidate listening on loopback port ${runtime.server.address().port}`);
      const stop = () => { void runtime.close().catch(() => { console.error('Shutdown incomplete; workspace lock retained for recovery.'); process.exitCode = 1; }); };
      process.once('SIGINT', stop); process.once('SIGTERM', stop);
    }
  } catch { console.error('ChatGPT candidate failed configuration/startup checks; inspect local configuration and workspace lock. No credentials are logged.'); process.exitCode = 1; }
}
