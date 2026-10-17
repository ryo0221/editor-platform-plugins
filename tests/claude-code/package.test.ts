import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm, rename } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

test('Code archive: standalone runtime/UI, human-only channel, relocation and restart retention', async () => {
  const archive = resolve('release/editor-platform-claude-code-0.1.3-linux-x64.tar.gz');
  const expected = (await readFile(`${archive}.sha256`, 'utf8')).split(' ')[0];
  assert.equal(createHash('sha256').update(await readFile(archive)).digest('hex'), expected);
  const temp = await mkdtemp(join(tmpdir(), 'code-package-'));
  let install = join(temp, '日本語 path with spaces');
  await mkdir(install);
  execFileSync('tar', ['-xzf', archive, '-C', install]);
  const bin = join(temp, 'bin'); await mkdir(bin);
  // An isolated fake OS opener captures the capability without launching a GUI.
  await writeFile(join(bin, 'xdg-open'), '#!/bin/sh\nprintf "%s" "$1" > "$EDITOR_TEST_URL_FILE"\n', { mode: 0o700 });
  const data = join(temp, 'persistent-data');
  let id = '';
  try {
    for (let restart = 0; restart < 2; restart++) {
      const plugin = join(install, 'plugins/editor-platform');
      const info = JSON.parse(await readFile(join(plugin, 'build-info.json'), 'utf8'));
      const pin = JSON.parse(await readFile('scripts/claude-code-node.json', 'utf8'));
      assert.deepEqual(info.nodeDistribution, pin);
      assert.equal(createHash('sha256').update(await readFile(join(plugin, 'runtime/node'))).digest('hex'), info.nodeSha256);
      assert.equal(createHash('sha256').update(await readFile(join(plugin, 'runtime/LICENSE'))).digest('hex'), info.nodeLicenseSha256);
      const client = new Client({ name: 'installed-code-model', version: '1' });
      const browser = new Client({ name: 'installed-browser', version: '1' });
      await client.connect(new StdioClientTransport({ command: join(plugin, 'runtime/node'), args: [join(plugin, 'server/code.mjs')],
        cwd: temp, env: { PATH: bin, EDITOR_DATA_DIR: data, EDITOR_TEST_URL_FILE: join(temp, 'url') }, stderr: 'pipe' }));
      const call = async (name: string, args: Record<string, unknown>) => {
        const reply = await client.callTool({ name, arguments: args });
        assert.ok(!reply.isError, JSON.stringify(reply)); return reply.structuredContent as any;
      };
      try {
        const names = (await client.listTools()).tools.map((tool) => tool.name);
        assert.ok(!names.includes('apply_slide_proposal'));
        if (!restart) {
          for (const kind of ['slide', 'document', 'design', 'whiteboard', 'data', 'graph', 'review', 'file', 'react-ui', 'animation']) {
            const guide = await call('get_editor_guide', { kind });
            const made = await call('create_artifact', { kind, title: `Standalone ${kind}`, content: guide.exampleContent });
            const record = made.deck ?? made.artifact;
            assert.deepEqual(record.content, guide.exampleContent);
            await call('export_artifact', { artifactId: record.id });
            if (kind === 'slide') id = record.id;
          }
        } else {
          const listed = await call('list_artifacts', {}); assert.equal(listed.artifacts.length, 10);
          const saved = await call('read_deck', { deckId: id }); assert.equal(saved.deck.revision, 2);
        }
        if (restart) {
          await writeFile(join(bin, 'xdg-open'), '#!/bin/sh\nexit 1\n', { mode: 0o700 });
          const failure = await client.callTool({ name: 'open_editor', arguments: {} });
          assert.equal(failure.isError, true);
          assert.match(JSON.stringify(failure), /BROWSER_UNAVAILABLE/);
          await writeFile(join(bin, 'xdg-open'), '#!/bin/sh\nprintf \"%s\" \"$1\" > \"$EDITOR_TEST_URL_FILE\"\n', { mode: 0o700 });
        }
        const opened = await call('open_editor', {});
        assert.ok(!JSON.stringify(opened).includes('http://'));
        const url = new URL(await readFile(join(temp, 'url'), 'utf8'));
        const token = url.hash.slice(1);
        const html = await (await fetch(new URL('/browser', url))).text();
        assert.match(html, /iframe/); assert.ok(!html.includes(token));
        const ui = await (await fetch(new URL('/editor.html', url))).text();
        assert.ok(ui.length > 1_000_000);
        await browser.connect(new StreamableHTTPClientTransport(new URL('/mcp', url), { requestInit: { headers: { Authorization: `Bearer ${token}` } } }));
        if (!restart) {
          const saved = await call('read_deck', { deckId: id });
          const result = await browser.callTool({ name: 'save_slide_draft', arguments: { deckId: id, baseRevision: 1, content: saved.deck.content } });
          assert.equal((result.structuredContent as any).deck.revision, 2);
        }
      } finally { await browser.close(); await client.close(); }
      if (!restart) {
        const moved = join(temp, 'relocated-install'); await rename(install, moved); install = moved;
      }
    }
  } finally { await rm(temp, { recursive: true, force: true }); }
});
