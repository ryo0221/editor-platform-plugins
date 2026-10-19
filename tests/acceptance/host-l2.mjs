#!/usr/bin/env node
// L2 actual-host automation: runs the installed Claude Code plugin through
// `claude -p` with natural-language prompts, then checks which tools the host
// chose and what was saved. Explicit, billed (model tokens), never part of CI.
//
// Isolation: EDITOR_DATA_DIR points the plugin at a temporary workspace, so the
// user's Editor data and any open session lock are untouched. A wslview/xdg-open
// shim first on PATH records the Editor URL instead of opening a browser.
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, readdir, readFile, writeFile, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const output = resolve(process.argv[2] ?? 'work/acceptance/host-l2');
const tool = (name) => `mcp__plugin_editor-platform_editor-platform__${name}`;

const root = await mkdtemp(join(tmpdir(), 'host-l2-'));
const bin = join(root, 'bin'), cwd = join(root, 'cwd'), data = join(root, 'data');
for (const dir of [bin, cwd, data, output]) await mkdir(dir, { recursive: true });
const shim = '#!/bin/sh\numask 077\nprintf "%s" "$1" > "$EDITOR_TEST_URL_FILE"\n';
for (const name of ['wslview', 'xdg-open']) await writeFile(join(bin, name), shim, { mode: 0o700 });
const env = { ...process.env, PATH: `${bin}:${process.env.PATH}`, EDITOR_DATA_DIR: data, EDITOR_TEST_URL_FILE: join(root, 'url') };

// Each session is a fresh conversation: no --continue/--resume.
async function session(id, prompt) {
  const args = ['-p', prompt, '--output-format', 'stream-json', '--verbose', '--allowedTools', 'mcp__plugin_editor-platform_editor-platform'];
  const child = spawn('claude', args, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] });
  let stdout = '', stderr = '';
  child.stdout.on('data', (chunk) => { stdout += chunk; });
  child.stderr.on('data', (chunk) => { stderr += chunk; });
  const timer = setTimeout(() => child.kill('SIGTERM'), 10 * 60 * 1000);
  const code = await new Promise((done) => child.on('close', done));
  clearTimeout(timer);
  await writeFile(join(output, `${id}.jsonl`), stdout);
  const events = stdout.split('\n').filter(Boolean).map((line) => JSON.parse(line));
  const calls = [], results = new Map();
  for (const event of events) for (const part of event.message?.content ?? []) {
    if (part.type === 'tool_use') calls.push({ id: part.id, name: part.name, input: part.input });
    if (part.type === 'tool_result') results.set(part.tool_use_id, { isError: !!part.is_error, text: JSON.stringify(part.content).slice(0, 2000) });
  }
  for (const call of calls) call.result = results.get(call.id);
  const init = events.find((e) => e.type === 'system' && e.subtype === 'init');
  const result = events.find((e) => e.type === 'result');
  return { code, stderr: stderr.slice(0, 500), calls, init, result };
}

async function saved() {
  const files = (await readdir(data)).filter((f) => /^deck_.*\.json$/.test(f));
  return Promise.all(files.map(async (f) => JSON.parse(await readFile(join(data, f), 'utf8'))));
}
const objects = (deck) => deck.content.slides.flatMap((s) => s.objects);
// A call counts only with an attached non-error result.
const ok = (c) => !!c.result && !c.result.isError;
const named = (s, name) => s.calls.filter((c) => c.name === tool(name));
const index = (s, name) => s.calls.findIndex((c) => c.name === tool(name) && ok(c));

const checks = [];
function check(id, scenario, s, assertions, evidence) {
  const failed = Object.entries(assertions).filter(([, ok]) => !ok).map(([label]) => label);
  const base = s ? { exit: s.code, outcome: s.result?.subtype, costUsd: s.result?.total_cost_usd,
    permissionDenials: s.result?.permission_denials?.length ?? null,
    tools: s.calls.map((c) => c.name.replace(tool(''), '')), answer: s.result?.result?.slice(0, 400) } : {};
  checks.push({ id, scenario, status: failed.length ? 'FAIL' : 'PASS', failed, evidence: { ...base, ...evidence } });
}
const sessionOk = (s) => ({ 'session succeeded': s.code === 0 && s.result?.subtype === 'success', 'no permission denials': !s.result?.permission_denials?.length,
  'plugin server connected': s.init?.mcp_servers?.some((m) => m.name === 'plugin:editor-platform:editor-platform' && m.status === 'connected') });

try {
  // C2: create from a natural-language request through the skill.
  const c2 = await session('L2-C2', '/editor-platform:editor-platform 架空の新サービス紹介スライドを3枚作って。図表を含め、あとから編集できるようにして');
  const decks = await saved(), deck = decks[0];
  const create = [...named(c2, 'create_deck'), ...named(c2, 'create_artifact')].find(ok);
  const guide = named(c2, 'get_editor_guide').find((c) => c.input.kind === 'slide' && ok(c));
  const open = named(c2, 'open_editor').at(-1);
  check('L2-C2', 'C2', c2, { ...sessionOk(c2),
    'read the slide guide before creating': !!guide && !!create && c2.calls.indexOf(guide) < c2.calls.indexOf(create),
    'created with native content (not legacy slides)': !!create?.input.content && !create?.input.slides,
    'exactly one saved deck with three slides': decks.length === 1 && deck?.content.slides.length === 3,
    'includes a chart or table': !!deck && objects(deck).some((o) => o.type === 'chart' || o.type === 'table'),
    'includes non-text shapes': !!deck && objects(deck).some((o) => o.type === 'shape'),
    'requested the Editor': /launch_requested/.test(open?.result?.text ?? '') },
  { revision: deck?.revision, objectTypes: deck && [...new Set(objects(deck).map((o) => o.type))], handoff: open?.result?.text?.match(/launch_\w+/)?.[0] });

  // C4 (host side): a new conversation rereads the saved deck and proposes against it.
  const before = (await saved())[0];
  // C2 may leave its own pending proposal; a new proposal on the same base would
  // then be a reasonable thing for the model to defer, so C4 needs a clean start.
  if (!before || before.proposals.length) {
    checks.push({ id: 'L2-C4', scenario: 'C4', status: 'NOT RUN', failed: [],
      evidence: { reason: before ? `precondition: C2 left ${before.proposals.length} pending proposal(s)` : 'precondition: no saved deck' } });
  } else {
  const c4 = await session('L2-C4', '保存版を読み直して、タイトルページの修正案を出して');
  const after = (await saved())[0];
  const propose = [...named(c4, 'propose_slide_changes'), ...named(c4, 'propose_artifact_changes')].find(ok);
  const readFirst = Math.min(...['read_deck', 'read_artifact'].map((n) => index(c4, n)).filter((i) => i >= 0));
  check('L2-C4', 'C4', c4, { ...sessionOk(c4),
    'reread before proposing': !!propose && readFirst < c4.calls.indexOf(propose),
    'proposal uses the saved revision': propose?.input.baseRevision === before?.revision,
    'proposal pending, content not applied': !!after && after.revision === before.revision && after.proposals.length === 1
      && JSON.stringify(after.content) === JSON.stringify(before.content) },
  { baseRevision: propose?.input.baseRevision, savedRevision: before?.revision, pending: after?.proposals.length });
  }

  // C6 (host side): another new conversation discovers and reopens the deck.
  const c6 = await session('L2-C6', '前に作ったサービス紹介スライドを開いて');
  const listed = index(c6, 'list_artifacts'), opened = index(c6, 'open_editor');
  check('L2-C6', 'C6', c6, { ...sessionOk(c6),
    'discovered via list_artifacts': listed >= 0,
    'requested the Editor after discovery': opened > listed,
    'did not create a new artifact': !named(c6, 'create_deck').length && !named(c6, 'create_artifact').length,
    'still one deck': (await saved()).length === 1 },
  { handoff: c6.calls[opened]?.result?.text?.match(/launch_\w+/)?.[0] });

  const version = c2.init?.plugins?.find((p) => /editor-platform/.test(p.name ?? p.path ?? ''));
  const summary = { kind: 'actual-host-automation-L2', runAt: new Date().toISOString(),
    host: { claudeCode: c2.init?.claude_code_version, model: c2.init?.model, plugin: version ?? null },
    totalCostUsd: checks.reduce((sum, c) => sum + (c.evidence.costUsd ?? 0), 0),
    checks,
    limits: 'Tests the installed plugin through claude -p with an isolated EDITOR_DATA_DIR and a URL-capturing opener. Model choices are nondeterministic; a FAIL needs its transcript (<id>.jsonl) reviewed. Does not cover install/permission UI (C1), the real OS browser (OS1) or Editor UI behavior (L1).' };
  await writeFile(join(output, 'result.json'), JSON.stringify(summary, null, 2) + '\n');
  for (const c of checks) console.log(`${c.id} (${c.scenario}): ${c.status}${c.failed.length ? ' - ' + c.failed.join('; ') : ''}${c.evidence.reason ? ' - ' + c.evidence.reason : ''}`);
  console.log(`Cost: $${summary.totalCostUsd.toFixed(2)}  Summary: ${join(output, 'result.json')}`);
  process.exitCode = checks.every((c) => c.status === 'PASS') ? 0 : 1;
} finally {
  await rm(root, { recursive: true, force: true });
}
