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
