import { test, expect } from '@playwright/test';
import { mkdtemp, mkdir, cp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { unzipSync } from 'fflate';

test('Code local browser: real manual edits, saved reread, reject/apply and export', async ({ page }) => {
  test.setTimeout(60000);
  const directory = await mkdtemp(join(tmpdir(), 'code-browser-'));
  const bundle = join(directory, 'bundle');
  await mkdir(join(bundle, 'ui'), { recursive: true });
  await cp('dist-react-preview/react-preview.html', join(bundle, 'ui/react-preview.html'));
  await cp('dist/editor.html', join(bundle, 'ui/editor.html'));
  await cp('dist-browser/browser.html', join(bundle, 'ui/browser.html'));
  const client = new Client({ name: 'code-browser-model', version: '1' });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  try {
    await client.connect(new StdioClientTransport({ command: process.execPath,
      args: ['--import', 'tsx', 'tests/code-host.mjs'], cwd: process.cwd(),
      env: { ...process.env, EDITOR_DATA_DIR: join(directory, 'data'), EDITOR_TEST_BUNDLE: bundle, EDITOR_TEST_URL_FILE: join(directory, 'url') } as Record<string, string> }));
    const call = async (name: string, args: Record<string, unknown>) => {
      const reply = await client.callTool({ name, arguments: args });
      expect(reply.isError, JSON.stringify(reply)).not.toBe(true); return reply.structuredContent as any;
    };
    const guide = await call('get_editor_guide', { kind: 'document' });
    const { artifact } = await call('create_artifact', { kind: 'document', title: 'Code browser acceptance fixture ' + '長い成果物名'.repeat(8), content: guide.exampleContent });
    const handoff = await call('open_editor', {});
    expect(handoff.status).toBe('launch_requested');
    expect(handoff.browserVerified).toBe(false);
    expect(JSON.stringify(handoff)).not.toContain('http://');
    await page.goto(await readFile(join(directory, 'url'), 'utf8'));
    await expect(page.locator('#status')).toContainText('Claude Codeに接続');
    expect(new URL(page.url()).hash).toBe('');
    const frame = page.frameLocator('#editor');
    await expect(frame.getByRole('complementary', { name: '保存済みの成果物' })).toBeVisible();
    await expect(frame.getByText('Code browser acceptance fixture', { exact: false })).toBeVisible();
    await expect(frame.getByRole('region', { name: 'Slide Editor', exact: true })).toHaveCount(0);
    expect((await call('read_artifact', { artifactId: artifact.id })).artifact.revision).toBe(1);
    expect((await call('list_artifacts', {})).artifacts).toHaveLength(1);
    const row = frame.getByRole('group', { name: /Code browser acceptance fixture/ });
    for (const width of [1280, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await expect(row).toBeVisible();
      const label = await row.locator(':scope > span').boundingBox();
      const button = await row.getByRole('button', { name: '開く', exact: true }).boundingBox();
      expect(label).not.toBeNull(); expect(button).not.toBeNull();
      expect(button!.x - (label!.x + label!.width)).toBeGreaterThanOrEqual(0);
      expect(button!.x - (label!.x + label!.width)).toBeLessThanOrEqual(12);
      expect(await row.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
      expect(button!.x + button!.width).toBeLessThanOrEqual(width);
    }
    await frame.getByRole('button', { name: '一覧を閉じる', exact: true }).focus();
    await page.keyboard.press('Tab');
    await expect(row.getByRole('button', { name: '開く', exact: true })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(frame.getByRole('region', { name: 'Document Editor', exact: true })).toBeVisible();
    await page.setViewportSize({ width: 1280, height: 900 });
    const text = frame.getByRole('textbox', { name: 'Document body', exact: true });
    const originalHeading = guide.exampleContent.blocks[0].text;
    // Keyboard selection is observed by the native editor. fill() selects DOM
    // contents directly and can race its focus-time selection restoration.
    await text.click();
    // Focus restoration can also interrupt an immediate key sequence. Retry
    // selection only, before entering text; never retry or weaken the saved result.
    await expect(async () => {
      await text.press('ControlOrMeta+Home');
      for (const _ of originalHeading) await text.press('Shift+ArrowRight');
      expect(await text.evaluate(el => el.ownerDocument.getSelection()?.toString())).toBe(originalHeading);
    }).toPass({ timeout: 3000 });
    await page.keyboard.insertText('人が保存した文章');
    await frame.getByRole('button', { name: '保存', exact: true }).click();
    await expect(frame.locator('.save-state')).toContainText('v2');
    const saved = (await call('read_artifact', { artifactId: artifact.id })).artifact;
    expect(saved.content.blocks[0].text).toBe('人が保存した文章');
    // Native saving normalizes layout/default properties; retain the other
    // original paragraph's identity and text rather than its sparse input shape.
    for (const block of guide.exampleContent.blocks.slice(1)) {
      expect(saved.content.blocks.find((item: { id: string }) => item.id === block.id)?.text).toBe(block.text);
    }
    const candidate = structuredClone(saved.content); candidate.blocks[0].text = 'レビュー後の文章';
    candidate.blocks[0].rich = [{ ...candidate.blocks[0].rich?.[0], text: 'レビュー後の文章' }];
    for (const accept of [false, true]) {
      await call('propose_artifact_changes', { artifactId: artifact.id, baseRevision: 2, summary: 'Review in local browser', content: candidate });
      await frame.getByRole('button', { name: '保存先から再読込', exact: true }).click();
      await frame.getByRole('button', { name: '変更案を表示', exact: true }).click();
      await expect(frame.getByRole('region', { name: '変更案プレビュー' })).toBeVisible();
      await frame.getByRole('button', { name: accept ? '適用' : '却下', exact: true }).click();
      await expect(frame.locator('.save-state')).toContainText(accept ? 'v3' : 'v2');
      const result = (await call('read_artifact', { artifactId: artifact.id })).artifact;
      expect(result.content.blocks[0].text).toBe(accept ? 'レビュー後の文章' : '人が保存した文章');
    }
    const download = page.waitForEvent('download');
    await frame.getByRole('button', { name: '保存内容を出力', exact: true }).click();
    expect((await download).suggestedFilename()).toMatch(/\.md$/);
    await page.reload();
    await expect(page.locator('#status')).toContainText('Claude Codeに接続');
    await frame.getByRole('button', { name: '成果物の一覧', exact: true }).click();
    await frame.getByRole('button', { name: '開く', exact: true }).click();
    await expect(frame.locator('[contenteditable="true"]').first()).toContainText('レビュー後の文章');
    const slideGuide = await call('get_editor_guide', { kind: 'slide' });
    const { deck } = await call('create_deck', { title: 'Code selection fixture', content: slideGuide.exampleContent });
    await frame.getByRole('button', { name: '成果物の一覧', exact: true }).click();
    await frame.locator('.proposal').filter({ hasText: 'Code selection fixture' }).getByRole('button', { name: '開く', exact: true }).click();
    await frame.locator('[data-canvas-target="strategy_title"]').click();
    const selectionButton = frame.getByRole('button', { name: '選択箇所を保存（チャットで読込）', exact: true });
    await expect(selectionButton).toBeEnabled();
    await expect(frame.getByRole('button', { name: '選択箇所を会話に共有', exact: true })).toHaveCount(0);
    await selectionButton.click();
    await expect(frame.getByRole('status')).toContainText('チャットで「選択箇所を読み込んで」と依頼してください');
    await expect(frame.getByRole('status')).toContainText('会話には自動送信されません');
    const selectedDeck = (await call('read_deck', { deckId: deck.id })).deck;
    expect(selectedDeck.selection).toContain('strategy_title');
    const singleExport = page.waitForEvent('download');
    await frame.getByRole('button', { name: '保存内容を出力', exact: true }).click();
    expect((await singleExport).suggestedFilename()).toBe(`${slideGuide.exampleContent.slides[0].id}.svg`);
    const multi = structuredClone(slideGuide.exampleContent);
    for (const n of [2, 3]) {
      const copy = structuredClone(slideGuide.exampleContent.slides[0]); copy.id = `${copy.id}_${n}`;
      for (const object of copy.objects) object.id = `${object.id}_${n}`;
      multi.slides.push(copy);
    }
    const { deck: multiDeck } = await call('create_deck', { title: 'Code multi-slide export fixture', content: multi });
    await frame.getByRole('button', { name: '成果物の一覧', exact: true }).click();
    await frame.locator('.proposal').filter({ hasText: 'Code multi-slide export fixture' }).getByRole('button', { name: '開く', exact: true }).click();
    await expect(frame.locator('.save-state')).toContainText('v1');
    const zipExport = page.waitForEvent('download');
    await frame.getByRole('button', { name: '保存内容を出力', exact: true }).click();
    const zipped = await zipExport;
    expect(zipped.suggestedFilename()).toBe(`${multiDeck.id}-svg.zip`);
    const entries = unzipSync(await readFile(await zipped.path()));
    expect(Object.keys(entries)).toEqual(multi.slides.map((slide: { id: string }, index: number) => `${index + 1}-${slide.id}.svg`));
    for (const bytes of Object.values(entries)) expect(Buffer.from(bytes).toString('utf8')).toMatch(/^<svg[\s>]/);
    // An unsaved draft must not be silently discarded by a browser reload.
    const surface = frame.getByRole('region', { name: 'Slide Editor', exact: true });
    await surface.locator('[data-canvas-target="priority_table"]').click();
    const cell = frame.getByRole('textbox', { name: 'Cell 2,2', exact: true });
    await cell.fill('60%'); await cell.press('Tab');
    await expect(frame.locator('.save-state')).toContainText('未保存');
    const prompt = page.waitForEvent('dialog');
    const reload = page.reload({ timeout: 3000 }).catch(() => undefined);
    const dialog = await prompt;
    expect(dialog.type()).toBe('beforeunload');
    await dialog.dismiss(); await reload;
    await expect(frame.locator('.save-state')).toContainText('未保存');
    await expect(cell).toHaveValue('60%');
    expect((await call('read_deck', { deckId: multiDeck.id })).deck.revision).toBe(1);
    expect(errors).toEqual([]);
    await page.screenshot({ path: 'test-results/claude-code-browser.png', fullPage: true });
  } finally { await client.close(); await rm(directory, { recursive: true, force: true }); }
});
