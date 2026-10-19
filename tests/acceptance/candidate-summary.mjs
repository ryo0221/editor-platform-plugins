// Clears old per-check records before a run and summarizes them afterwards.
// The summary maps L1 checks to acceptance scenarios; it is not an actual-host PASS.
import { readdir, readFile, writeFile, rm, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import os from 'node:os';

const base = resolve('work/acceptance/automated');
const scenarios = { C2: ['L1-C2'], C3: ['L1-C3'], C4: ['L1-C4'], C5: ['L1-C5a', 'L1-C5b', 'L1-C5c'], C6: ['L1-C6'], C7: ['L1-C7'], R1: ['L1-R1'] };

export async function setup() {
  await rm(join(base, 'checks'), { recursive: true, force: true });
  await rm(join(base, 'evidence'), { recursive: true, force: true });
  await mkdir(join(base, 'checks'), { recursive: true });
  await mkdir(join(base, 'evidence'), { recursive: true });
}

export async function summarize() {
  const dir = join(base, 'checks');
  const checks = await Promise.all((await readdir(dir)).filter((f) => f.endsWith('.json')).sort()
    .map(async (f) => JSON.parse(await readFile(join(dir, f), 'utf8'))));
  const byId = Object.fromEntries(checks.map((c) => [c.id, c]));
  const verdict = (ids) => {
    const found = ids.map((id) => byId[id]);
    if (found.some((c) => !c)) return 'NOT RUN';
    if (found.some((c) => c.status !== 'passed')) return 'FAIL';
    // A passed check that skipped part of its scenario does not certify it.
    if (found.some((c) => c.evidence?.notRun)) return 'NOT RUN';
    return 'PASS';
  };
  const summary = {
    kind: 'packaged-candidate-automation-L1',
    runAt: new Date().toISOString(),
    package: checks.find((c) => c.package?.version)?.package ?? null,
    environment: { os: `${os.type()} ${os.release()}`, arch: os.arch(), browser: checks.find((c) => c.browser)?.browser ?? null, runner: 'Playwright Chromium (headless) + MCP stdio client against the archive\'s bundled Node/server; OS opener replaced by a URL-capturing shim' },
    scenarios: Object.fromEntries(Object.entries(scenarios).map(([id, ids]) => [id, { result: verdict(ids), checks: ids }])),
    checks: checks.map(({ id, title, status, error, evidence, browserErrors, serverErrors }) => ({ id, title, status, error, evidence, browserErrors, serverErrors })),
    limits: 'Does not cover plugin install/permissions (C1), the real OS browser handoff and visual check (OS1), or Claude Code choosing tools from a prompt (L2). Archive must match its .sha256 sidecar; files are re-verified against build-info.',
  };
  await writeFile(join(base, 'result.json'), JSON.stringify(summary, null, 2) + '\n');
  return summary;
}

export default async function teardown() {
  const summary = await summarize();
  for (const [id, { result }] of Object.entries(summary.scenarios)) console.log(`${id}: ${result}`);
  console.log(`Summary: ${join(base, 'result.json')}`);
}
