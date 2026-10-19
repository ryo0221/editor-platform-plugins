import { test, expect, type Page } from '@playwright/test';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { unzipSync, strFromU8 } from 'fflate';
import { extractCandidate, workspace, startServer, watchErrors, openEditor, openSaved, record, hash, type Candidate, type Server } from './candidate-harness';

// L1 packaged-candidate acceptance. CANDIDATE_ARCHIVE is required; PREVIOUS_ARCHIVE
// (optional) adds the data-retention-through-update check. Results go to
// work/acceptance/automated/checks/<id>.json and are summarized by globalTeardown.
const archive = process.env.CANDIDATE_ARCHIVE;
const previous = process.env.PREVIOUS_ARCHIVE;
const checks = resolve('work/acceptance/automated/checks');
const evidence = resolve('work/acceptance/automated/evidence');

let root = '', candidate: Candidate;
let ev: Record<string, unknown> = {};
let errors: string[] = [];
const servers: Server[] = [];
const cleanups: (() => Promise<void>)[] = [];

test.beforeAll(async () => {
  if (!archive) throw Error('Set CANDIDATE_ARCHIVE to the release .tar.gz to test.');
  root = await mkdtemp(join(tmpdir(), 'candidate-acceptance-'));
  candidate = await extractCandidate(archive, root);
});
test.afterAll(async () => { if (root) await rm(root, { recursive: true, force: true }); });
test.beforeEach(({ page }) => { ev = {}; errors = []; watchErrors(page, errors); });
test.afterEach(async ({ page }, info) => {
  const id = info.title.split(' ')[0];
  await page.screenshot({ path: join(evidence, `${id}.png`), fullPage: true }).catch(() => undefined);
  // Snapshot before shutdown: closing the server ends the page's open streams.
  const browserErrors = [...errors], serverErrors = servers.flatMap((s) => s.stderr);
  for (const server of servers.splice(0)) await server.close().catch(() => undefined);
  for (const cleanup of cleanups.splice(0)) await cleanup().catch(() => undefined);
  await record(checks, id, { title: info.title, status: info.status, durationMs: info.duration,
    error: info.error?.message?.replace(/\u001b\[[0-9;]*m/g, '').slice(0, 1500), evidence: ev, browserErrors, serverErrors,
    browser: page.context().browser()?.version(),
    package: { version: candidate?.info.version, sourceCommit: candidate?.info.sourceCommit, archiveSha256: candidate?.archiveSha256 } });
});

async function server(space?: Awaited<ReturnType<typeof workspace>>, plugin = candidate.plugin, label = 'server') {
  if (!space) { space = await workspace('candidate-check-'); cleanups.push(space.cleanup); }
  const s = await startServer(plugin, space, label); servers.push(s); return { s, space };
}

// Three fictional slides: the guide example plus two copies with distinct IDs.
async function threeSlideDeck(s: Server, title: string) {
  const guide = await s.call('get_editor_guide', { kind: 'slide' });
  const content = structuredClone(guide.exampleContent);
  for (const n of [2, 3]) {
    const copy = structuredClone(guide.exampleContent.slides[0]); copy.id = `${copy.id}_${n}`; copy.title = `${copy.title} ${n}`;
    for (const object of copy.objects) object.id = `${object.id}_${n}`;
    content.slides.push(copy);
  }
  const { deck } = await s.call('create_deck', { title, content });
  return deck as { id: string; revision: number; content: any };
}
const object = (deck: any, id: string) => deck.content.slides.flatMap((slide: any) => slide.objects).find((o: any) => o.id === id);
const read = async (s: Server, id: string) => (await s.call('read_deck', { deckId: id })).deck;
const older = (a: string, b: string) => {
  const [x, y] = [a, b].map((v) => v.split('.').map(Number));
  const i = x.findIndex((n, k) => n !== y[k]);
  return i >= 0 && x[i] < y[i];
};
const surfaceOf = (frame: ReturnType<Page['frameLocator']>) => frame.getByRole('region', { name: 'Slide Editor', exact: true });
const button = (frame: ReturnType<Page['frameLocator']>, name: string) => frame.getByRole('button', { name, exact: true });
// Compare everything except the listed objects.
function others(deck: any, except: string[]) {
  return deck.content.slides.map((slide: any) => ({ ...slide, objects: slide.objects.filter((o: any) => !except.includes(o.id)) }));
}

async function editCanvasText(frame: ReturnType<Page['frameLocator']>, target: string, text: string) {
  await surfaceOf(frame).locator(`[data-canvas-target="${target}"]`).dblclick();
  // Select the existing text and type over it, as a person would.
  const input = frame.getByLabel('Edit canvas text', { exact: true });
  await input.press('ControlOrMeta+a');
  await input.page().keyboard.insertText(text);
  await input.blur();
  await expect(surfaceOf(frame).locator(`[data-canvas-target="${target}"]`)).toContainText(text);
}

test('L1-C2 open: three native slides with chart/table reach the real Editor via the OS opener', async ({ page }) => {
  const { s, space } = await server();
  const deck = await threeSlideDeck(s, '架空 受け入れ C2');
  const handoff = await s.call('open_editor');
  ev.handoff = handoff.status;
  expect(handoff.status).toBe('launch_requested');
  const frame = await openEditor(page, await readFile(join(space.directory, 'url'), 'utf8'));
  await openSaved(frame, '架空 受け入れ C2');
  const surface = surfaceOf(frame);
  await expect(surface.getByRole('button', { name: /^Slide \d+:/ })).toHaveCount(3);
  for (const suffix of ['', '_2', '_3']) {
    if (suffix) await surface.getByRole('button', { name: new RegExp(`^Slide ${suffix.slice(1)}:`) }).click();
    await expect(surface.locator(`[data-canvas-target="investment_chart${suffix}"]`)).toBeVisible();
    expect(await surface.locator(`[data-canvas-target="investment_chart${suffix}"] rect`).count()).toBeGreaterThanOrEqual(3);
    await expect(surface.locator(`[data-canvas-target="priority_table${suffix}"]`)).toContainText('投資比率');
  }
  ev.slides = deck.content.slides.length;
  expect(errors).toEqual([]);
});

test('L1-C3 edit: title text + shape move, Undo/Redo, explicit Save changes only those objects', async ({ page }) => {
  const { s } = await server();
  const deck = await threeSlideDeck(s, '架空 受け入れ C3');
  const frame = await openEditor(page, await s.url());
  await openSaved(frame, '架空 受け入れ C3');
  const surface = surfaceOf(frame);
  await editCanvasText(frame, 'strategy_title', '架空の見出しを手で修正');
  const card = surface.locator('[data-canvas-target="priority_card"]');
  const before = (await card.boundingBox())!;
  // Grab the card's lower-right margin; its centre is covered by text objects.
  const grab = { x: before.x + before.width - 8, y: before.y + before.height - 8 };
  await page.mouse.move(grab.x, grab.y);
  await page.mouse.down();
  await page.mouse.move(grab.x + 40, grab.y + 30, { steps: 8 });
  await page.mouse.up();
  const moved = (await card.boundingBox())!;
  expect(Math.abs(moved.x - before.x) + Math.abs(moved.y - before.y), 'shape moved by drag').toBeGreaterThan(10);
  await button(frame, '元に戻す').click();
  await expect.poll(async () => (await card.boundingBox())!.x).toBeCloseTo(before.x, 0);
  await button(frame, 'やり直す').click();
  await expect.poll(async () => (await card.boundingBox())!.x).toBeCloseTo(moved.x, 0);
  await expect(frame.locator('.save-state')).toContainText('未保存');
  await button(frame, '保存').click();
  await expect(frame.locator('.save-state')).toContainText('v2');
  const saved = await read(s, deck.id);
  ev.revision = saved.revision;
  ev.cardBounds = { before: object(deck, 'priority_card').bounds, after: object(saved, 'priority_card').bounds };
  expect(object(saved, 'strategy_title').text).toBe('架空の見出しを手で修正');
  expect(object(saved, 'priority_card').bounds).not.toEqual(object(deck, 'priority_card').bounds);
  expect(others(saved, ['strategy_title', 'priority_card'])).toEqual(others(deck, ['strategy_title', 'priority_card']));
  expect(errors).toEqual([]);
});

test('L1-C4 review: proposal appears without reload; Reject keeps content; Apply changes only the proposal', async ({ page }) => {
  const { s } = await server();
  const deck = await threeSlideDeck(s, '架空 受け入れ C4');
  const frame = await openEditor(page, await s.url());
  await openSaved(frame, '架空 受け入れ C4');
  const edits = [{ kind: 'set_text', slideId: 'strategy_page', objectId: 'priority_heading', text: '重点投資 60%（提案）' }];
  for (const accept of [false, true]) {
    await s.call('propose_slide_changes', { deckId: deck.id, baseRevision: 1, summary: accept ? '架空の提案 2' : '架空の提案 1', edits });
    const show = button(frame, '変更案を表示');
    await expect(show, 'proposal arrives by polling, no reload').toBeVisible({ timeout: 10000 });
    await show.click();
    await expect(frame.getByRole('region', { name: '変更案プレビュー' }).locator('[data-canvas-target="priority_heading"]')).toContainText('重点投資 60%（提案）');
    await button(frame, accept ? '適用' : '却下').click();
    // v1 is shown before and after Reject; wait for the decision itself.
    await expect(frame.getByRole('status')).toContainText(accept ? '変更案を適用しました。' : '変更案を却下しました。');
    await expect(frame.locator('.save-state')).toContainText(accept ? 'v2' : 'v1');
    const after = await read(s, deck.id);
    expect(after.proposals).toEqual([]);
    if (!accept) expect(after.content).toEqual(deck.content);
    else {
      expect(object(after, 'priority_heading').text).toBe('重点投資 60%（提案）');
      expect(others(after, ['priority_heading'])).toEqual(others(deck, ['priority_heading']));
    }
    ev[accept ? 'apply' : 'reject'] = { revision: after.revision };
  }
  expect(errors).toEqual([]);
});

test('L1-C5a draft: unsaved edit survives proposal arrival, reload prompt and reread prompt', async ({ page }) => {
  const { s } = await server();
  const deck = await threeSlideDeck(s, '架空 受け入れ C5a');
  const frame = await openEditor(page, await s.url());
  await openSaved(frame, '架空 受け入れ C5a');
  await editCanvasText(frame, 'priority_heading', '重点投資 99%（下書き）');
  await expect(frame.locator('.save-state')).toContainText('未保存');
  await s.call('propose_slide_changes', { deckId: deck.id, baseRevision: 1, summary: '架空の提案（下書き中）',
    edits: [{ kind: 'set_text', slideId: 'strategy_page', objectId: 'strategy_subtitle', text: '提案された副題' }] });
  await expect(button(frame, '変更案を表示')).toBeVisible({ timeout: 10000 });
  await expect(button(frame, '変更案を表示')).toBeDisabled();
  await expect(button(frame, '適用')).toBeDisabled();
  const target = surfaceOf(frame).locator('[data-canvas-target="priority_heading"]');
  await expect(target).toContainText('重点投資 99%（下書き）');
  const prompt = page.waitForEvent('dialog', { timeout: 5000 });
  const reload = page.reload({ timeout: 3000 }).catch(() => undefined);
  const dialog = await prompt.catch(() => { throw Error('No leave-page prompt on reload with an unsaved draft'); });
  ev.reloadDialog = dialog.type();
  expect(dialog.type()).toBe('beforeunload');
  await dialog.dismiss(); await reload;
  await expect(target).toContainText('重点投資 99%（下書き）');
  page.once('dialog', (d) => { ev.rereadDialog = d.message(); void d.dismiss(); });
  await button(frame, '保存先から再読込').click();
  await expect(target).toContainText('重点投資 99%（下書き）');
  expect(ev.rereadDialog).toContain('未保存');
  expect((await read(s, deck.id)).revision).toBe(1);
  expect(errors).toEqual([]);
});

test('L1-C5b stale: old-base proposal refused; pending proposal expires after a manual save', async ({ page }) => {
  const { s } = await server();
  const deck = await threeSlideDeck(s, '架空 受け入れ C5b');
  const frame = await openEditor(page, await s.url());
  await openSaved(frame, '架空 受け入れ C5b');
  await s.call('propose_slide_changes', { deckId: deck.id, baseRevision: 1, summary: '架空の提案（失効予定）',
    edits: [{ kind: 'set_text', slideId: 'strategy_page', objectId: 'strategy_subtitle', text: '提案された副題' }] });
  await expect(button(frame, '変更案を表示')).toBeVisible({ timeout: 10000 });
  await editCanvasText(frame, 'priority_heading', '重点投資 70%（手で保存）');
  await button(frame, '保存').click();
  await expect(frame.locator('.save-state')).toContainText('v2');
  const stale = await s.raw('propose_slide_changes', { deckId: deck.id, baseRevision: 1, summary: '古い版の提案',
    edits: [{ kind: 'set_text', slideId: 'strategy_page', objectId: 'priority_heading', text: '上書きされてはいけない' }] });
  ev.staleProposal = JSON.stringify(stale.content).slice(0, 200);
  expect(stale.isError).toBe(true);
  expect(JSON.stringify(stale.content)).toContain('CONFLICT');
  const saved = await read(s, deck.id);
  expect(saved.revision).toBe(2);
  expect(object(saved, 'priority_heading').text).toBe('重点投資 70%（手で保存）');
  expect(saved.proposals.map((p: any) => p.baseRevision)).toEqual([1]);
  await expect(frame.getByRole('complementary', { name: 'AIの変更案' })).toContainText('失効');
  await button(frame, '変更案を表示').click();
  await expect(button(frame, '適用'), 'expired proposal cannot be applied').toBeDisabled();
  await button(frame, '編集に戻る').click();
  expect((await read(s, deck.id)).revision).toBe(2);
  expect(errors).toEqual([]);
});

test('L1-C5c tabs: a competing save from a second tab is refused and keeps the first save', async ({ page, context }) => {
  const { s } = await server();
  const deck = await threeSlideDeck(s, '架空 受け入れ C5c');
  const url = await s.url();
  const frame = await openEditor(page, url);
  await openSaved(frame, '架空 受け入れ C5c');
  const second = await context.newPage(); watchErrors(second, errors, 'tab2');
  const frame2 = await openEditor(second, url);
  await openSaved(frame2, '架空 受け入れ C5c');
  await editCanvasText(frame2, 'strategy_subtitle', 'タブ2の下書き');
  await editCanvasText(frame, 'priority_heading', 'タブ1が先に保存');
  await button(frame, '保存').click();
  await expect(frame.locator('.save-state')).toContainText('v2');
  // Tab 2 keeps its buffered draft while polling sees the newer revision.
  await expect(frame2.getByRole('status')).toContainText('保存先が更新されています', { timeout: 10000 });
  await button(frame2, '保存').click();
  // Wait for the save request to settle with the server's CONFLICT refusal.
  await expect(frame2.getByRole('status')).toContainText('The deck has changed', { timeout: 10000 });
  ev.tab2Message = await frame2.getByRole('status').textContent();
  const saved = await read(s, deck.id);
  ev.revision = saved.revision;
  expect(saved.revision).toBe(2);
  expect(object(saved, 'priority_heading').text).toBe('タブ1が先に保存');
  expect(object(saved, 'strategy_subtitle').text).toBe(object(deck, 'strategy_subtitle').text);
  await expect(surfaceOf(frame2).locator('[data-canvas-target="strategy_subtitle"]'), 'tab 2 draft not discarded').toContainText('タブ2の下書き');
  // The refusal is a console-free UI message; any browser error still fails.
  expect(errors.filter((e) => !/CONFLICT|409/.test(e))).toEqual([]);
  ev.consoleConflict = errors.length;
  await second.close();
});

test('L1-C7 export: every slide as SVG zip and native JSON match the saved deck; no Office export', async ({ page }) => {
  const { s } = await server();
  const deck = await threeSlideDeck(s, '架空 受け入れ C7');
  const frame = await openEditor(page, await s.url());
  await openSaved(frame, '架空 受け入れ C7');
  await expect(frame.locator('.save-state')).toContainText('v1');
  const zipped = page.waitForEvent('download');
  await button(frame, '保存内容を出力').click();
  const zip = await zipped;
  expect(zip.suggestedFilename()).toBe(`${deck.id}-svg.zip`);
  const entries = unzipSync(await readFile((await zip.path())!));
  const host = await s.call('export_deck', { deckId: deck.id });
  expect(Object.keys(entries)).toEqual(deck.content.slides.map((slide: any, i: number) => `${i + 1}-${slide.id}.svg`));
  Object.values(entries).forEach((bytes, i) => expect(strFromU8(bytes)).toBe(host.slides[i].svg));
  ev.svgFiles = Object.keys(entries); ev.zipSha256 = hash(await readFile((await zip.path())!));
  const json = page.waitForEvent('download');
  await button(frame, 'ローカルJSON').click();
  const local = await json;
  expect(local.suggestedFilename()).toBe(`${deck.id}.json`);
  const exported = JSON.parse(await readFile((await local.path())!, 'utf8'));
  expect(exported.slides.map((slide: any) => slide.id)).toEqual(deck.content.slides.map((slide: any) => slide.id));
  expect(object({ content: exported }, 'strategy_title').text).toBe(object(deck, 'strategy_title').text);
  await surfaceOf(frame).getByRole('button', { name: 'Export visual', exact: true }).click();
  // Office output is unavailable on this host: the PPTX entry must be present but disabled.
  const pptx = frame.getByText('Export PPTX', { exact: true });
  await expect(pptx).toBeVisible();
  ev.pptxEntry = await pptx.evaluate((element) => {
    const control = element.closest('button,label,[role]') ?? element;
    const input = control.querySelector('input,button') ?? control;
    return { tag: control.tagName, disabled: (input as HTMLInputElement).disabled === true || control.getAttribute('aria-disabled') === 'true' || input.getAttribute('aria-disabled') === 'true' };
  });
  expect((ev.pptxEntry as { disabled: boolean }).disabled, 'PPTX export disabled').toBe(true);
  expect(errors).toEqual([]);
});

test('L1-R1 react: registered components preview, Interact state persists without user action, TSX export', async ({ page }) => {
  const { s } = await server();
  const guide = await s.call('get_editor_guide', { kind: 'react-ui' });
  const { artifact } = await s.call('create_artifact', { kind: 'react-ui', title: '架空 受け入れ R1', content: guide.exampleContent });
  const frame = await openEditor(page, await s.url());
  await openSaved(frame, '架空 受け入れ R1');
  await expect(frame.getByText('Preview ready', { exact: true })).toBeVisible();
  const preview = frame.frameLocator('iframe[title="React component preview"]');
  await button(frame, 'Interact').click();
  const counter = preview.getByRole('button', { name: /: \d+$/ }).first();
  const label = (await counter.textContent())!; ev.counterInitial = label;
  const [, name, start] = /^(.*): (\d+)$/.exec((await counter.getAttribute('aria-label')) ?? label)!;
  await counter.click();
  const next = preview.getByRole('button', { name: `${name}: ${Number(start) + 1}`, exact: true });
  await expect(next).toBeVisible();
  // The Editor polls saved state every 4 s; interaction state must survive it.
  await page.waitForTimeout(10000);
  ev.counterAfter10s = await preview.getByRole('button', { name: new RegExp(`^${name}: \\d+$`) }).first().textContent();
  // Soft: a reset is a FAIL, but the TSX export below is still checked and recorded.
  await expect.soft(next, 'counter not reset by background refresh').toBeVisible();
  const download = page.waitForEvent('download');
  await button(frame, 'Export React TSX').click();
  const output = await download;
  expect(output.suggestedFilename()).toBe('react-screen.zip');
  const files = unzipSync(await readFile((await output.path())!));
  ev.tsxFiles = Object.keys(files).sort();
  expect(Object.keys(files)).toEqual(expect.arrayContaining(['Screen.tsx', 'PluginComponents.tsx', 'manifest.json', 'composition.json']));
  expect(JSON.parse(strFromU8(files['composition.json']))).toEqual((await s.call('read_artifact', { artifactId: artifact.id })).artifact.content);
  const manifest = JSON.parse(strFromU8(files['manifest.json']));
  ev.manifestFiles = manifest.files;
  expect(errors).toEqual([]);
});

test('L1-C6 retention: data survives server restart and update; workspace lock refuses a second session', async ({ page }) => {
  const space = await workspace('candidate-retention-'); cleanups.push(space.cleanup);
  let source = candidate.plugin;
  if (previous) {
    const old = await extractCandidate(previous, await mkdtemp(join(root, 'previous-')));
    // Only an older, distinct archive exercises an update.
    expect(old.archiveSha256, 'PREVIOUS_ARCHIVE differs from the candidate').not.toBe(candidate.archiveSha256);
    expect(older(old.info.version, candidate.info.version), `PREVIOUS_ARCHIVE ${old.info.version} is older than ${candidate.info.version}`).toBe(true);
    source = old.plugin; ev.previous = { version: old.info.version, archiveSha256: old.archiveSha256 };
  } else ev.notRun = 'PREVIOUS_ARCHIVE not set; restart-only retention, update not exercised';
  const first = (await server(space, source, 'previous')).s;
  const deck = await threeSlideDeck(first, '架空 受け入れ C6');
  const frame = await openEditor(page, await first.url());
  await openSaved(frame, '架空 受け入れ C6');
  await editCanvasText(frame, 'strategy_title', '更新前に保存');
  await button(frame, '保存').click();
  await expect(frame.locator('.save-state')).toContainText('v2');
  const before = await read(first, deck.id);
  const locked = await startServer(candidate.plugin, space, 'second').then(async (s) => { servers.push(s); return s.raw('list_artifacts'); }).catch((error: Error) => error);
  ev.secondSession = locked instanceof Error ? locked.message.slice(0, 300) : 'started';
  expect(ev.secondSession, 'second session on the same workspace is refused').toContain('already open in another Claude Code session');
  await page.goto('about:blank');
  await first.close(); servers.splice(servers.indexOf(first), 1);
  const s = (await server(space, candidate.plugin, 'candidate')).s;
  expect((await s.call('list_artifacts')).artifacts.map((a: any) => a.id)).toContain(deck.id);
  expect(await read(s, deck.id)).toEqual(before);
  const reopened = await openEditor(page, await s.url());
  await openSaved(reopened, '架空 受け入れ C6');
  await editCanvasText(reopened, 'strategy_title', '更新後に保存');
  await button(reopened, '保存').click();
  await expect(reopened.locator('.save-state')).toContainText('v3');
  const after = await read(s, deck.id);
  expect(object(after, 'strategy_title').text).toBe('更新後に保存');
  expect(others(after, ['strategy_title'])).toEqual(others(before, ['strategy_title']));
  ev.revisions = [before.revision, after.revision];
  expect(errors).toEqual([]);
});
