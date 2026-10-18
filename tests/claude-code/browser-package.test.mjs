// Maintainer-only isolated fictional-data acceptance. Never point this at a live user workspace.
// The OS opener is a capture stub; this is not signed-in Claude Code acceptance.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { execFileSync, spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { once } from 'node:events';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { chromium, expect } from '@playwright/test';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

for (const mode of ['stdio', 'shell']) test(`Linux archive ${mode} browser: three slides, native Undo/Redo, review, export and process restart`, { timeout: 120000 }, async () => {
  const archive = resolve(process.env.EDITOR_CODE_ARCHIVE ?? 'release/editor-platform-claude-code-0.1.3-linux-x64.tar.gz');
  const hash = createHash('sha256').update(await readFile(archive)).digest('hex');
  assert.equal(hash, (await readFile(archive + '.sha256', 'utf8')).split(' ')[0]);
  const temp = await mkdtemp(join(tmpdir(), 'archive-browser-'));
  const install = join(temp, '日本語 install path'); await mkdir(install);
  execFileSync('tar', ['-xzf', archive, '-C', install]);
  const plugin = join(install, 'plugins/editor-platform');
  // Only runtime files are available to the launched package; no source checkout.
  await rm(join(plugin, 'source'), { recursive: true });
  const home = join(temp, 'home'); await mkdir(home);
  const privateDir = join(temp, 'private'); await mkdir(privateDir, { mode: 0o700 });
  const urlFile = join(privateDir, 'url');
  const bin = join(temp, 'bin'); await mkdir(bin);
  await writeFile(join(bin, 'xdg-open'), '#!/bin/sh\numask 077\nprintf "%s" "$1" > "$EDITOR_TEST_URL_FILE"\n', { mode: 0o700 });
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ?? '/usr/bin/chromium', args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  let client, id, savedContent, oldUrl;
  const call = async (name, args = {}) => { const r = await client.callTool({ name, arguments: args }); assert.ok(!r.isError, JSON.stringify(r)); return r.structuredContent; };
  const start = async () => {
    const env = { PATH: bin, HOME: home, EDITOR_DATA_DIR: join(temp, 'data'), EDITOR_TEST_URL_FILE: urlFile };
    if (mode === 'stdio') {
      client = new Client({ name: 'archive-acceptance', version: '1' });
      await client.connect(new StdioClientTransport({ command: join(plugin, 'runtime/node'), args: [join(plugin, 'server/code.mjs')], cwd: temp, env, stderr: 'pipe' }));
    } else {
      const child = spawn(join(plugin, 'runtime/node'), [join(plugin, 'server/shell-client.mjs')], { cwd: temp, env, stdio: ['pipe', 'pipe', 'pipe'] });
      const exited = once(child, 'exit');
      const rows = createInterface({ input: child.stdout })[Symbol.asyncIterator]();
      const next = async () => { const row = await rows.next(); assert.equal(row.done, false); return JSON.parse(row.value); };
      let sequence = 0;
      client = {
        async callTool({ name, arguments: args }) {
          const id = ++sequence;
          child.stdin.write(JSON.stringify({ id, tool: name, arguments: args }) + '\n');
          const reply = await next(); assert.equal(reply.id, id); assert.equal(reply.error, undefined);
          return reply.result;
        },
        async close() {
          child.stdin.end();
          const timer = setTimeout(() => child.kill('SIGKILL'), 5000);
          try { const [code, signal] = await exited; assert.equal(code, 0); assert.equal(signal, null); }
          finally { clearTimeout(timer); }
        },
      };
      assert.deepEqual(await next(), { event: 'ready', channel: 'model-only', browserVerified: false });
      for (const name of ['save_slide_draft', 'apply_slide_proposal', 'reject_slide_proposal']) {
        assert.equal((await client.callTool({ name, arguments: {} })).isError, true);
      }
    }
    await call('open_editor'); return await readFile(urlFile, 'utf8');
  };
  try {
    oldUrl = await start();
    const guide = await call('get_editor_guide', { kind: 'slide' });
    const content = structuredClone(guide.exampleContent);
    const first = content.slides[0];
    content.slides = Array.from({ length: 3 }, (_, i) => ({ ...structuredClone(first), id: 'cafe_slide_' + i, objects: first.objects.map(o => ({ ...structuredClone(o), id: i ? o.id + '_' + i : o.id })) }));
    const made = await call('create_deck', { title: '星見台カフェ 配布物受入', content }); id = made.deck.id;
    await page.goto(oldUrl);
    await expect(page.locator('#status')).toContainText('Claude Codeに接続');
    assert.equal(new URL(page.url()).hash, '');
    const frame = page.frameLocator('#editor');
    await frame.getByRole('button', { name: '開く', exact: true }).click();
    const title = frame.locator('[data-canvas-target="strategy_title"]');
    await expect(title).toBeVisible();
    await expect(frame.locator('[data-canvas-target="investment_chart"]')).toBeVisible();
    await expect(frame.locator('[data-canvas-target="priority_table"]')).toBeVisible();
    await title.dblclick();
    await frame.getByLabel('Edit canvas text', { exact: true }).fill('星見台カフェ 秋の計画');
    await frame.getByLabel('Edit canvas text', { exact: true }).press('ControlOrMeta+Enter');
    await expect(title).toContainText('星見台カフェ 秋の計画');
    await frame.getByRole('button', { name: '元に戻す', exact: true }).click();
    await expect(title).not.toContainText('星見台カフェ 秋の計画');
    await frame.getByRole('button', { name: 'やり直す', exact: true }).click();
    await expect(title).toContainText('星見台カフェ 秋の計画');
    const picture = frame.locator('[data-canvas-target="strategy_image"]');
    const box = await picture.boundingBox(); assert.ok(box);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down(); await page.mouse.move(box.x + box.width / 2 + 25, box.y + box.height / 2 + 20, { steps: 5 }); await page.mouse.up();
    await frame.getByRole('button', { name: '保存', exact: true }).click();
    await expect(frame.locator('.save-state')).toContainText('v2');
    let saved = (await call('read_deck', { deckId: id })).deck;
    assert.equal(saved.content.slides.length, 3);
    assert.notDeepEqual(saved.content.slides[0].objects.find(o => o.id === 'strategy_image').bounds, first.objects.find(o => o.id === 'strategy_image').bounds);
    assert.equal(saved.content.slides[0].objects.find(o => o.id === 'strategy_title').text, '星見台カフェ 秋の計画');
    assert.deepEqual(saved.content.slides[0].objects.find(o => o.id === 'priority_table').table.rows, first.objects.find(o => o.id === 'priority_table').table.rows);
    const candidate = structuredClone(saved.content);
    candidate.slides[0].objects.find(o => o.id === 'title_band').fill = '#123456';
    for (const apply of [false, true]) {
      await call('propose_slide_changes', { deckId: id, baseRevision: 2, summary: '背景色の提案', content: candidate });
      await frame.getByRole('button', { name: '保存先から再読込', exact: true }).click();
      await frame.getByRole('button', { name: '変更案を表示', exact: true }).click();
      await expect(frame.getByRole('region', { name: '変更案プレビュー' })).toBeVisible();
      await frame.getByRole('button', { name: apply ? '適用' : '却下', exact: true }).click();
      await expect(frame.locator('.save-state')).toContainText(apply ? 'v3' : 'v2');
      const actual = (await call('read_deck', { deckId: id })).deck;
      assert.deepEqual(actual.content, apply ? candidate : saved.content);
    }
    const stale = await client.callTool({ name: 'propose_slide_changes', arguments: { deckId: id, baseRevision: 2, summary: 'Stale proposal', content: candidate } });
    assert.equal(stale.isError, true);
    savedContent = (await call('read_deck', { deckId: id })).deck.content;
    const downloadPromise = page.waitForEvent('download');
    await frame.getByRole('button', { name: '保存内容を出力', exact: true }).click();
    const download = await downloadPromise;
    assert.match(download.suggestedFilename(), /\.svg$/);
    assert.match(await readFile(await download.path(), 'utf8'), /星見台カフェ 秋の計画/);
    const nativeDownload = page.waitForEvent('download');
    await frame.getByRole('button', { name: 'ローカルJSON', exact: true }).click();
    assert.deepEqual(JSON.parse(await readFile(await (await nativeDownload).path(), 'utf8')), savedContent);
    const modelExport = await call('export_deck', { deckId: id });
    assert.equal(modelExport.slides.length, 3);
    assert.deepEqual(JSON.parse(modelExport.nativeJson), savedContent);
    await client.close(); client = undefined;
    await assert.rejects(fetch(new URL('/health', oldUrl)));
    const freshUrl = await start();
    assert.notEqual(new URL(freshUrl).hash, new URL(oldUrl).hash);
    const denial = await fetch(new URL('/mcp', freshUrl), { headers: { authorization: 'Bearer ' + new URL(oldUrl).hash.slice(1) } });
    assert.equal(denial.status, 401);
    assert.deepEqual((await call('read_deck', { deckId: id })).deck.content, savedContent);
    await page.goto(freshUrl);
    await frame.getByRole('button', { name: '開く', exact: true }).click();
    await expect(title).toContainText('星見台カフェ 秋の計画');
    await expect(frame.locator('.save-state')).toContainText('v3');
    assert.deepEqual(errors, []);
    await mkdir('work/distribution-acceptance', { recursive: true });
    await page.screenshot({ path: 'work/distribution-acceptance/archive-browser-' + mode + '.png', fullPage: true });
    console.log(JSON.stringify({ archiveSha256: hash, browser: browser.version(), slides: 3, savedRevision: 3, client: mode, host: 'automated archive regression directed from Codex; native Codex registration and actual Claude Code NOT RUN', opener: 'capture stub; native opener NOT RUN' }));
  } finally { await client?.close(); await browser.close(); await rm(temp, { recursive: true, force: true }); }
});
