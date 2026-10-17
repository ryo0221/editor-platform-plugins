import { test as base, expect, type Page } from '@playwright/test';
import { artifactKinds, domainLabels } from '../../src/shared/domains';

// The restricted cloud's single-process Chromium cannot survive context teardown
// followed by a new context. Launch one browser per test without changing checks.
const test = base.extend({ page: async ({ playwright, browserName, launchOptions, contextOptions, baseURL, viewport }, use) => {
  const browser = await playwright[browserName].launch(launchOptions);
  try {
    const context = await browser.newContext({ ...contextOptions, baseURL, viewport, acceptDownloads: true });
    await use(await context.newPage());
  } finally { await browser.close(); }
} });

async function invoke(page: Page, name: string, args: Record<string, unknown>, deliver = false): Promise<any> {
  return page.evaluate(async ({ name, args, deliver }) => (window as any).__editorTest.invoke(name, args, deliver), { name, args, deliver });
}
async function start(page: Page, kind = 'slide') {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/demo'); await expect(page.locator('#host-status')).toHaveText('Connected');
  const frame = page.frameLocator('#editor');
  await frame.getByLabel('Editorの種類').selectOption(kind);
  await frame.getByRole('button', { name: '成果物を作成', exact: true }).click();
  await expect(frame.locator('header h1')).toContainText(domainLabels[kind as keyof typeof domainLabels]);
  return { frame, errors };
}
for (const kind of artifactKinds) {
  test(`${kind}: mount real native surface, save and download retained native JSON`, async ({ page }) => {
    const { frame, errors } = await start(page, kind);
    await expect(frame.getByRole('region', { name: `${domainLabels[kind]} Editor`, exact: true })).toBeVisible();
    await frame.getByRole('button', { name: '保存', exact: true }).click();
    await expect(frame.locator('.save-state')).toContainText('v2');
    const download = page.waitForEvent('download');
    await frame.getByRole('button', { name: 'ローカルJSON', exact: true }).click();
    expect((await download).suggestedFilename()).toMatch(/\.json$/);
    if (kind === 'react-ui') await expect(frame.getByText('実コンポーネントの描画には独立preview runtimeの設定が必要です。', { exact: false })).toBeVisible();
    expect(errors).toEqual([]);
    await page.screenshot({ path: `test-results/${kind}.png`, fullPage: true });
  });
}
test('Slide: model proposal previews, rejects, then explicitly applies', async ({ page }) => {
  const { frame, errors } = await start(page);
  await page.getByRole('button', { name: 'Model: propose title change' }).click();
  await expect(frame.getByRole('complementary', { name: 'AIの変更案' })).toBeVisible();
  await frame.getByRole('button', { name: '変更案を表示', exact: true }).click();
  await expect(frame.getByRole('region', { name: '変更案プレビュー' })).toBeVisible();
  await expect(frame.getByRole('region', { name: '変更案プレビュー' }).getByText('AIと、一緒に仕上げる。', { exact: true }).first()).toBeVisible();
  await frame.getByRole('button', { name: '却下', exact: true }).click();
  await expect(frame.locator('.save-state')).toContainText('v1');
  await page.getByRole('button', { name: 'Model: propose title change' }).click();
  await frame.getByRole('button', { name: '変更案を表示', exact: true }).click();
  await frame.getByRole('button', { name: '適用', exact: true }).click();
  await expect(frame.locator('.save-state')).toContainText('v2');
  expect(errors).toEqual([]);
});
test('Document: actual text editing survives save and reload', async ({ page }) => {
  const { frame, errors } = await start(page, 'document');
  const body = frame.locator('[contenteditable="true"]').first();
  await body.fill('会話と手編集をつなぐ。');
  await frame.getByRole('button', { name: '保存', exact: true }).click();
  await expect(frame.locator('.save-state')).toContainText('v2');
  await frame.getByRole('button', { name: '保存先から再読込', exact: true }).click();
  await expect(frame.locator('[contenteditable="true"]').first()).toContainText('会話と手編集をつなぐ。');
  expect(errors).toEqual([]);
});
test('Document: proposed native change is reviewed and saved only on explicit acceptance', async ({ page }) => {
  const { frame, errors } = await start(page, 'document');
  const native = await frame.getByRole('button', { name: 'ローカルJSON', exact: true }).isEnabled(); expect(native).toBe(true);
  // Read the current artifact through the UI's own save response by intercepting
  // the same-origin MCP request. This checks real transport and the native schema.
  let artifact: any;
  page.on('response', async (response) => {
    if (response.url().endsWith('/mcp')) { try { const data = await response.json(); if (data.result?.structuredContent?.artifact) artifact = data.result.structuredContent.artifact; } catch {} }
  });
  await frame.getByRole('button', { name: '保存', exact: true }).click();
  await expect.poll(() => artifact?.revision).toBe(2);
  const candidate = structuredClone(artifact.content); candidate.blocks[0].text = '提案から完成へ';
  const result = await invoke(page, 'propose_artifact_changes', { artifactId: artifact.id, baseRevision: 2, summary: '見出しを改善', content: candidate }, true);
  expect(result.isError).not.toBe(true);
  await frame.getByRole('button', { name: '変更案を表示', exact: true }).click();
  await frame.getByRole('button', { name: '適用', exact: true }).click();
  await expect(frame.locator('.save-state')).toContainText('v3');
  await expect(frame.locator('[contenteditable="true"]').first()).toContainText('提案から完成へ');
  expect(errors).toEqual([]);
});
test('Document: concurrent remote save cannot overwrite an unsaved manual draft', async ({ page }) => {
  const { frame, errors } = await start(page, 'document');
  const artifact = await page.evaluate(() => (window as any).__editorTest.record());
  await frame.locator('[contenteditable="true"]').first().fill('保持する手編集');
  const remote = structuredClone(artifact.content); remote.blocks[0].text = 'Remote saved text';
  await invoke(page, 'save_artifact_draft', { artifactId: artifact.id, baseRevision: 1, content: remote }, true);
  await expect(frame.getByRole('status')).toContainText('手元の編集を保持');
  await expect(frame.locator('[contenteditable="true"]').first()).toContainText('保持する手編集');
  await frame.getByRole('button', { name: '保存', exact: true }).click();
  await expect(frame.getByRole('status')).toContainText('artifact has changed');
  await expect(frame.locator('[contenteditable="true"]').first()).toContainText('保持する手編集');
  expect(errors).toEqual([]);
});
test('Graph: native node command saves and reloads with its Profile', async ({ page }) => {
  const { frame, errors } = await start(page, 'graph');
  await frame.getByRole('button', { name: 'Add node', exact: true }).click();
  await frame.getByRole('button', { name: '保存', exact: true }).click();
  await expect(frame.locator('.save-state')).toContainText('v2');
  const artifact = await page.evaluate(() => (window as any).__editorTest.record());
  expect(artifact.content.nodes.length).toBe(3);
  expect(artifact.content.profile.id).toBe('relations');
  await frame.getByRole('button', { name: '保存先から再読込', exact: true }).click();
  expect(errors).toEqual([]);
});

test('Slide: rich native creation renders actual chart, table, image and styled objects, then manual edits persist', async ({ page }) => {
  const { frame, errors } = await start(page);
  const guide = (await invoke(page, 'get_editor_guide', { kind: 'slide' })).structuredContent;
  const result = await invoke(page, 'create_deck', { title: '図表とレイアウト', content: guide.exampleContent }, true);
  expect(result.isError).not.toBe(true);
  const surface = frame.getByRole('region', { name: 'Slide Editor', exact: true });
  const chart = surface.locator('[data-canvas-target="investment_chart"]');
  const table = surface.locator('[data-canvas-target="priority_table"]');
  await expect(chart).toBeVisible();
  expect(await chart.locator('rect').count()).toBeGreaterThanOrEqual(3);
  await expect(table).toContainText('投資比率');
  expect(await table.locator('rect').count()).toBeGreaterThanOrEqual(6);
  await expect(surface.locator('[data-canvas-target="strategy_image"] image')).toHaveAttribute('href', /^data:image\/svg\+xml;base64,/);
  await expect(surface.locator('[data-canvas-target="title_band"] rect').first()).toHaveAttribute('fill', '#172c47');
  await expect(surface.locator('[data-canvas-target="strategy_title"] text').first()).toHaveAttribute('font-size', '30');
  await surface.locator('[data-canvas-target="priority_heading"]').dblclick();
  await frame.getByLabel('Edit canvas text', { exact: true }).fill('重点投資 65%');
  await frame.getByRole('button', { name: '保存', exact: true }).click();
  await expect(frame.locator('.save-state')).toContainText('v2');
  const saved = (await invoke(page, 'read_deck', { deckId: result.structuredContent.deck.id })).structuredContent.deck;
  expect(saved.content.slides[0].objects.find((o: any) => o.id === 'priority_heading').text).toBe('重点投資 65%');
  expect(saved.content.slides[0].objects.find((o: any) => o.id === 'priority_table').table.rows).toEqual(guide.exampleContent.slides[0].objects.find((o: any) => o.id === 'priority_table').table.rows);
  await frame.getByRole('button', { name: '保存先から再読込', exact: true }).click();
  await expect(surface.locator('[data-canvas-target="priority_heading"]')).toContainText('重点投資 65%');
  expect(errors).toEqual([]);
  await surface.locator('[data-canvas-target="strategy_title"]').click();
  await frame.getByRole('button', { name: '選択箇所を会話に共有', exact: true }).click();
  await expect(frame.getByRole('status')).toContainText('選択箇所を会話に共有しました');
  await expect(page.locator('#host-status')).toContainText('strategy_title');
  await page.screenshot({ path: 'test-results/rich-slide.png', fullPage: true });
});

test('Slide: native chart and layout proposal renders a preview and applies only after review', async ({ page }) => {
  const { frame, errors } = await start(page);
  const content = (await invoke(page, 'get_editor_guide', { kind: 'slide' })).structuredContent.exampleContent;
  const created = await invoke(page, 'create_artifact', { kind: 'slide', title: 'Native review', content }, true);
  const deck = created.structuredContent.deck;
  const candidate = structuredClone(content);
  candidate.slides[0].background = '#f4f7f5';
  candidate.slides[0].objects.find((o: any) => o.id === 'investment_chart').chart.values = [20, 65, 15];
  const proposed = await invoke(page, 'propose_slide_changes', { deckId: deck.id, baseRevision: 1, summary: '配分と背景を変更', content: candidate }, true);
  expect(proposed.isError).not.toBe(true);
  expect((await invoke(page, 'read_deck', { deckId: deck.id })).structuredContent.deck.content).toEqual(content);
  await frame.getByRole('button', { name: '変更案を表示', exact: true }).click();
  await expect(frame.getByRole('region', { name: '変更案プレビュー' }).locator('[data-canvas-target="investment_chart"]')).toBeVisible();
  await frame.getByRole('button', { name: '適用', exact: true }).click();
  await expect(frame.locator('.save-state')).toContainText('v2');
  expect((await invoke(page, 'read_deck', { deckId: deck.id })).structuredContent.deck.content).toEqual(candidate);
  expect(errors).toEqual([]);
});

test('Document: native authoring renders formatted text, a real table, image and Mermaid diagram', async ({ page }) => {
  const { frame, errors } = await start(page, 'document');
  const content = (await invoke(page, 'get_editor_guide', { kind: 'document' })).structuredContent.exampleContent;
  const created = await invoke(page, 'create_artifact', { kind: 'document', title: '構造を持つ文書', content }, true);
  expect(created.isError).not.toBe(true);
  const body = frame.getByLabel('Document body', { exact: true });
  await expect(body.locator('table')).toBeVisible();
  await expect(body.locator('table')).toContainText('収益と継続率');
  await expect(body.locator('strong').filter({ hasText: '判断基準を揃え' })).toBeVisible();
  await expect(body.locator('img[alt="成長の例"]')).toBeVisible();
  const diagram = body.getByRole('img', { name: 'Mermaid diagram', exact: true });
  await expect(diagram).toBeVisible();
  await expect.poll(() => diagram.evaluate((img) => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await frame.getByRole('button', { name: '保存', exact: true }).click();
  await expect(frame.locator('.save-state')).toContainText('v2');
  const artifact = (await invoke(page, 'read_artifact', { artifactId: created.structuredContent.artifact.id })).structuredContent.artifact;
  expect(artifact.content.blocks.map((b: any) => b.type)).toEqual(content.blocks.map((b: any) => b.type));
  expect(errors).toEqual([]);
  await page.screenshot({ path: 'test-results/rich-document.png', fullPage: true });
});

test('Graph: custom types render, native property edits save with the owned Profile and export it', async ({ page }) => {
  const { frame, errors } = await start(page, 'graph');
  const guide = (await invoke(page, 'get_editor_guide', { kind: 'graph' })).structuredContent;
  const result = await invoke(page, 'create_artifact', guide.customCreateExample.arguments, true);
  expect(result.isError).not.toBe(true);
  const artifact = result.structuredContent.artifact;
  const graph = frame.getByRole('region', { name: 'Graph Editor', exact: true });
  await expect(graph.getByLabel('Node type')).toContainText('platform');
  await expect(graph.locator('[data-edge-id="source_hub"]')).toContainText('取り込み');
  await expect(graph.locator('[data-edge-id="hub_operator"]')).toContainText('例外のみ');
  await expect(graph.getByRole('button', { name: 'Select node 入力元', exact: true })).toBeVisible();
  await graph.getByRole('button', { name: 'Select node 入力元', exact: true }).click();
  await graph.getByRole('form', { name: 'Graph attributes' }).getByLabel('name', { exact: true }).fill('更新した入力元');
  // Host save must flush the native input before making the surface read-only.
  await frame.getByRole('button', { name: '保存', exact: true }).click();
  await expect(frame.locator('.save-state')).toContainText('v2');
  await frame.getByRole('button', { name: '保存先から再読込', exact: true }).click();
  await expect(graph.getByRole('button', { name: 'Select node 更新した入力元', exact: true })).toBeVisible();
  const saved = (await invoke(page, 'read_artifact', { artifactId: artifact.id })).structuredContent.artifact;
  expect(saved.profile).toEqual(guide.customGraph.profile);
  expect(saved.content.nodes[0].attributes.name).toBe('更新した入力元');
  const download = page.waitForEvent('download');
  await frame.getByRole('button', { name: 'ローカルJSON', exact: true }).click();
  const path = await (await download).path();
  const { readFile } = await import('node:fs/promises');
  expect(JSON.parse(await readFile(path!, 'utf8'))).toEqual({ graph: saved.content, profile: saved.profile });
  expect(errors).toEqual([]);
  await page.screenshot({ path: 'test-results/custom-graph.png', fullPage: true });
});

for (const kind of ['slide', 'document']) test(`${kind}: discover, trash and restore the same saved artifact through real UI`, async ({ page }) => {
  const { frame, errors } = await start(page, kind);
  const title = `Trash UI ${kind} ${Date.now()}`;
  const created = await invoke(page, 'create_artifact', { kind, title }, true);
  const record = created.structuredContent.deck ?? created.structuredContent.artifact;
  await frame.getByRole('button', { name: 'ゴミ箱へ移動', exact: true }).click();
  await expect(frame.locator('.save-state')).toContainText('ゴミ箱');
  await expect(frame.getByRole('button', { name: '保存', exact: true })).toHaveCount(0);
  await frame.getByRole('button', { name: '成果物の一覧', exact: true }).click();
  const inventory = frame.getByRole('complementary', { name: '保存済みの成果物' });
  await inventory.getByLabel('一覧の対象').selectOption('deleted');
  await expect(inventory.getByText(title, { exact: false })).toBeVisible();
  // Switch to another artifact and reopen this exact ID from trash.
  await frame.getByRole('button', { name: '成果物を作成', exact: true }).click();
  await inventory.locator('.proposal').filter({ hasText: title }).getByRole('button', { name: '開く', exact: true }).click();
  await expect(frame.locator('header h1')).toHaveText(title);
  await frame.getByRole('button', { name: '成果物を復元', exact: true }).click();
  await expect(frame.locator('.save-state')).toContainText('v3');
  await expect(frame.getByRole('region', { name: `${domainLabels[kind as keyof typeof domainLabels]} Editor`, exact: true })).toBeVisible();
  const saved = (await invoke(page, 'read_artifact', { artifactId: record.id })).structuredContent;
  expect((saved.deck ?? saved.artifact).content).toEqual(record.content);
  expect((saved.deck ?? saved.artifact).deletedAt).toBeUndefined();
  expect(errors).toEqual([]);
});

test('Data reference: real Slide follows committed source, preserves destination and shows broken link', async ({ page }) => {
  const { frame, errors } = await start(page, 'slide');
  const deck = await page.evaluate(() => (window as any).__editorTest.record());
  const guide = (await invoke(page, 'get_editor_guide', { kind: 'data' })).structuredContent;
  const source = (await invoke(page, 'create_artifact', { kind: 'data', title: 'Linked source', content: guide.exampleContent })).structuredContent.artifact;
  const prepared = (await invoke(page, 'create_reference', { source: { artifactId: source.id, domain: 'data', target: { kind: 'table', viewId: 'default' } }, mode: 'follow' })).structuredContent;
  const content = structuredClone(deck.content);
  content.slides[0].objects.push({ id: 'linked_data', type: 'image', bounds: { x: 20, y: 150, width: 600, height: 200 }, text: '', fill: '#ffffff', src: prepared.src, reference: prepared.reference });
  await invoke(page, 'propose_artifact_changes', { artifactId: deck.id, baseRevision: 1, summary: 'Embed Data', content }, true);
  await frame.getByRole('button', { name: '変更案を表示', exact: true }).click();
  await frame.getByRole('button', { name: '適用', exact: true }).click();
  await expect(frame.locator('.save-state')).toContainText('v2');
  const projected = () => frame.locator('image').evaluateAll((nodes) => nodes.map((node) => {
    const value = node.getAttribute('href') ?? node.getAttribute('xlink:href') ?? '';
    try { return value.startsWith('data:image/svg+xml;base64,') ? atob(value.split(',')[1]) : ''; } catch { return ''; }
  }).join('\n'));
  await expect.poll(projected).toContain('550');
  const next = structuredClone(source.content); next.rows[0].values.investment = 987654;
  await invoke(page, 'save_artifact_draft', { artifactId: source.id, baseRevision: 1, content: next });
  await expect.poll(projected, { timeout: 12000 }).toContain('987,654');
  const unchanged = (await invoke(page, 'read_deck', { deckId: deck.id })).structuredContent.deck;
  expect(unchanged.revision).toBe(2);
  expect(unchanged.content.slides[0].objects.at(-1).reference.snapshot.revision).toBe(1);
  await frame.getByRole('button', { name: '保存', exact: true }).click();
  await expect(frame.locator('.save-state')).toContainText('v3');
  const captured = (await invoke(page, 'read_deck', { deckId: deck.id })).structuredContent.deck;
  expect(captured.content.slides[0].objects.at(-1).reference.snapshot.revision).toBe(2);
  await page.screenshot({ path: 'test-results/data-slide-reference.png', fullPage: true });
  await invoke(page, 'delete_artifact', { artifactId: source.id, baseRevision: 2 });
  await expect(frame.getByText('参照元が見つかりません', { exact: false }).first()).toBeVisible({ timeout: 12000 });
  expect(errors).toEqual([]);
});
